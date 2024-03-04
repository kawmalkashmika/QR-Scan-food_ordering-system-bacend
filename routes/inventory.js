const dbConnection = require("../config/dbConnection");
const logger=require('../util/logger');
const express = require('express');
const router = express.Router();
const commonResponse = require('../commonResponse/commonResponse');


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
router.get('/get-all-item-details', (req, res) => {
    dbConnection.getConnectionFromPool((err,connection)=>{
        connection.query('SELECT * FROM view_all_stock_item_details_location_batch_price_chanel', (error, results, fields) => {
            if (error) {
                logger.error('Error retrieving data from database',error);
                commonResponse.sendErrorResponse(res,"Error retrieving data from database",req.requestId)
            }
            connection.release();
            commonResponse.sendSuccessResponse(res,results,req.requestId);
        });
    },req.requestId)



});

module.exports=router;