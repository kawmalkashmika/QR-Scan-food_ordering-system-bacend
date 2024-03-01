const dbConnection = require("../config/dbConnection");
const logger=require('../util/logger');
const express = require('express');
const router = express.Router();


router.get('/get-all-table-details', (req, res) => {
    const connection = dbConnection.createConnection();
    connection.query('SELECT ID_LOCATION_TABLE,ID_LOCATION_SECTION,TABLE_NAME,IS_ACTIVE FROM core_pos_location_table WHERE IS_ACTIVE=1 ;', (error, results, fields) => {
        if (error) {
            logger.error('Error retrieving data from database',error);
            res.status(500).send('Error retrieving data from database');
        }
        res.status(200);
        res.json(results);
    });

    dbConnection.closeConnection(connection);
});

module.exports=router;