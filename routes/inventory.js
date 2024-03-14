const dbConnection = require("../config/dbConnection");
const logger = require('../util/logger');
const express = require('express');
const router = express.Router();
const commonResponse = require('../commonResponse/commonResponse');
const {error} = require("winston");
const {sendSuccessResponse} = require("../commonResponse/commonResponse");


/**
 * @swagger
 * /inventory/get-all-item-details:
 *   get:
 *     summary: Get all item details
 *     description: Retrieves details of all items including location, batch, price, and channel information.
 *     responses:
 *       200:
 *         description: A list of all item details
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   // Define properties based on the fields returned by the query
 *       500:
 *         description: Internal server error
 */
/*router.get('/get-all-item-details', (req, res) => {

    dbConnection.getConnectionFromPool((err, connection) => {
        if (err) {
            logger.error('Error getting database connection', err);
            commonResponse.sendErrorResponse(res, "Error getting database connection", req.requestId);
            return;
        }

        connection.query('SELECT Id_Item_Sub_Category,Item_Sub_Category_Name,Image_Path  FROM core_inv_item_sub_category WHERE Is_Active=1 ORDER BY \n' +
            'Item_Sub_Category_Name ASC; ', (error, results, fields) => {
            if (error) {
                connection.release();
                logger.error('Error retrieving data from database', error);
                commonResponse.sendErrorResponse(res, "Error retrieving data from database", req.requestId);
                return;
            }

            let itemArray = [];

            const processCategories = () => {
                if (results.length === 0) {
                    connection.release();
                    commonResponse.sendSuccessResponse(res, itemArray, req.requestId);
                    return;
                }

                const categoryObj = results.shift();

                connection.query('SELECT ii.Id_Item,ii.Id_Item_Registry,ii.Item_Genaral_Name,ii.SELLING_PRICE,ii.IS_LOYALTY_ELIGIBLE,ii.LOYALTY_POINTS,ii.Item_Image_Path,ir.Id_Item_Registry,ir.Id_Item_Sub_Category FROM core_inv_item as ii  join core_inv_item_registry as ir on ii.Id_Item=ir.Id_Item_Registry WHERE Id_Item_Sub_Category=? ORDER BY Item_Genaral_Name ASC', [categoryObj.Id_Item_Sub_Category], (error, results, fields) => {
                    if (error) {
                        connection.release();
                        logger.error('Error retrieving data from database', error);
                        commonResponse.sendErrorResponse(res, "Error retrieving data from database", req.requestId);
                        return;
                    }

                    if (results.length >= 1) {
                        let obj = {
                            "catrgoryId": categoryObj.Id_Item_Sub_Category,
                            "categoryName": categoryObj.Item_Sub_Category_Name,
                            "categoryImage": categoryObj.Image_Path,
                            "items": results
                        }
                        itemArray.push(obj);
                    }

                    processCategories();
                });
            };

            processCategories();
        });
    }, req.requestId);
});*/

router.get('/get-all-item-details',(req,res)=>{
    dbConnection.getConnectionFromPool((err, connection) => {
        if (err) {
            logger.error('Error getting database connection', err);
            commonResponse.sendErrorResponse(res, "Error getting database connection", req.requestId);
            return;
        }else{

            let categoryQuery="SELECT Id_Item_Sub_Category,Item_Sub_Category_Name,Image_Path FROM core_inv_item_sub_category WHERE Is_Active=1 ORDER BY Item_Sub_Category_Name ASC";
            let itemQuery="SELECT core_inv_item_registry.Id_Item_Registry,core_inv_item_registry.Id_Item_Sub_Category,core_inv_item.Id_Item,core_inv_item.Item_Genaral_Name,core_inv_item.SELLING_PRICE,core_inv_item.Item_Image_Path FROM core_inv_item_registry JOIN core_inv_item ON  core_inv_item.Id_Item_Registry=core_inv_item_registry.Id_Item_Registry WHERE core_inv_item_registry.Id_Item_Sub_Category=?";

            let getItemCategories=new Promise((resolve, reject)=>{
                connection.query(categoryQuery,[],(error,results,fields)=>{
                    if(error){
                        logger.error('Unable to get categories ',error);
                        reject(error);
                    }else{
                            let categoryArray=results;
                           resolve(categoryArray);
                    }
                });
            });

            function getItems(categoryId){
               return  new Promise((resolve, reject) => {
                    connection.query(itemQuery,[categoryId],(error,results,fields)=>{
                        if(error){
                            logger.error('Unable to get items ',error);
                            reject(error);
                        }else{
                            console.log(categoryId)
                            resolve(results);
                            console.log("end")
                        }
                    });
                });
            }

            let getData=new Promise((resolve, reject) => {
                let data=[]
                getItemCategories.then(categoryArray=>{
                    for (let i = 0; i <= categoryArray.length-1; i++) {
                        getItems(categoryArray[i].Id_Item_Sub_Category).then(itemList=>{
                            let obj={
                                "catrgoryId": categoryArray[i].Id_Item_Sub_Category,
                                "categoryName": categoryArray[i].Item_Sub_Category_Name,
                                "categoryImage": categoryArray[i].Image_Path,
                                "items": itemList
                            }

                            data.push(obj);

                            if(i==categoryArray.length-1){
                                resolve(data);
                            }

                        }).catch(error=>{
                            reject(error);
                        })
                    }
                }).catch(error=>{
                    reject(error);
                })
            })

            getData.then(data =>{
                sendSuccessResponse(res,data,req.requestId)
            }).then(error =>{
                console.log(error);
            })


        }
    },req.requestId)



});

module.exports = router;