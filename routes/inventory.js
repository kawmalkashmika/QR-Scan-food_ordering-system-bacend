const dbConnection = require("../config/dbConnection");
const logger=require('../util/logger');
const express = require('express');
const router = express.Router();


router.get('/get-all-item-details', (req, res) => {
    const connection = dbConnection.createConnection();
    connection.query('SELECT * FROM view_all_stock_item_details_location_batch_price_chanel', (error, results, fields) => {
        if (error) {
            logger.error('Error retrieving data from database',error);
            res.status(500).send('Error retrieving data from database');
        }
        // Process results and send response
        res.status(200);
        res.json(results);
    });

    dbConnection.closeConnection(connection);
});

module.exports=router;