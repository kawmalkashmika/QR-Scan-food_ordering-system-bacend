const dbConnection = require("../config/dbConnection");
const logger = require('../util/logger');
const express = require('express');
const router = express.Router();
const commonResponse = require('../commonResponse/commonResponse');
const {response} = require("express");
const {error} = require("winston");
const orderStatus = {
    PLACED: 1,
    PROGRESS: 2,
    CANCEL:3
}

const getItemPriceQuery="SELECT SELLING_PRICE FROM core_inv_item WHERE Id_Item=?";
const placeOrderQuery="INSERT INTO core_mobile_reservation_order (`RESERVATION_ID`, `USER_ID`, `ITEM_ID`, `ORDER_STATUS`,`QUANTITY`) VALUES (?,?,?,?,?)";

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


/**
 * @swagger
 * /order/place-order:
 *   post:
 *     summary: Place an order
 *     description: Endpoint to place an order for a single item.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reservationId:
 *                 type: string
 *                 description: The ID of the reservation.
 *               userId:
 *                 type: string
 *                 description: The ID of the user placing the order.
 *               itemId:
 *                 type: string
 *                 description: The ID of the item being ordered.
 *               quantity:
 *                 type: integer
 *                 description: The quantity of the item being ordered.
 *     responses:
 *       200:
 *         description: Successfully placed the order
 *       500:
 *         description: Unable to place the order
 */
router.post('/place-order',(req,res)=>{
    let reservationId=req.body.reservationId;
    let userId=req.body.userId;
    let itemId=req.body.itemId;
    let quantity=req.body.quantity;


    dbConnection.getConnectionFromPool((error,connection)=>{
        if(error){
            logger.error("Unable to connect to database");
            commonResponse.sendErrorResponse(res,"Unable to connect database",req.requestId,500)
        }else{
            placeSingleOrder(connection,reservationId,userId,itemId,quantity).then(results=>{
                console.log(results.insertId);
                commonResponse.sendSuccessResponse(res,{"orderId":results.insertId,
                                                              "orderStatus":orderStatus.PLACED},req.requestId);
            }).catch(error=>{
                commonResponse.sendErrorResponse(res,"Unable ti place order",req.requestId,500)
            })

        }
    },req.requestId)





})

function placeSingleOrder(connection,reservationId,userId,itemId,quantity){
    return new Promise((resolve,reject)=>{
            connection.query(placeOrderQuery,[reservationId,userId,itemId,orderStatus.PLACED,quantity],(error,results,fields)=>{
                if(error){
                    logger.info(4)
                    console.log("Unable to insert order details");
                    reject(error);
                }else{
                   resolve(results);
                }
            });

    });
}


function calculateBill(itemPrice,quantity){
    return itemPrice*quantity;
}

module.exports = router;