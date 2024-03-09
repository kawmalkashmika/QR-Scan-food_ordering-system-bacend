const dbConnection = require("../config/dbConnection");
const logger = require('../util/logger');
const express = require('express');
const router = express.Router();
const commonResponse = require('../commonResponse/commonResponse');
const {response} = require("express");

const getItemPriceQuery="SELECT SELLING_PRICE FROM core_inv_item WHERE Id_Item=?";
const saveOrderQuery="INSERT INTO "

router.post('/calculate_bill', (req, res) => {
    let reservationId=req.body.reservationId;
    let userId=req.body.userId;
    let itemList=req.body.itemList;
    dbConnection.getConnectionFromPool((err, connection) => {
        if (err) {
            logger.error("Unable to connect to database");
            commonResponse.sendErrorResponse(res, "Unable to connect to database", req.requestId, 500);
            return;
        }else{
                calculateBill().then(id=>{
                    console.log(id)
                }).catch(error=>{
                    console.log(error);
                })
        }

        function calculateBill(){
            let bill=0;
            return new Promise((resolve,reject)=>{
                for (let i = 0; i < itemList.length; i++) {
                    getItemPrice(itemList[i].itemId).then((price)=>{
                       bill=bill+(price*itemList[i].quantity);
                       if(i==itemList.length-1){
                           console.log(i);
                          commonResponse.sendSuccessResponse(res,{"billValue":bill},req.requestId)
                       }
                    }).catch((error)=>{
                        commonResponse.sendErrorResponse(res,"Unable to calculate bill",req.requestId,500);
                    })
                }
            })

        }

        function getItemPrice(id){
            return new Promise((resolve, reject)=>{
                connection.query(getItemPriceQuery,[id],(error,results,fields)=>{
                    if(error){
                        reject(error)
                    }else{
                        resolve(results[0].SELLING_PRICE)
                    }
                })
            })
        }

    }, req.requestId);
});



function calculateBill(itemPrice,quantity){
    return itemPrice*quantity;
}

module.exports = router;