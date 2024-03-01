const dbConnection = require("../config/dbConnection");
const logger=require('../util/logger');
const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /table/get-all-table-details:
 *   get:
 *     summary: Get all active table details
 *     description: Retrieves details of all active tables.
 *     responses:
 *       200:
 *         description: A list of active table details
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   ID_LOCATION_TABLE:
 *                     type: integer
 *                     description: The ID of the location table.
 *                   ID_LOCATION_SECTION:
 *                     type: integer
 *                     description: The ID of the location section.
 *                   TABLE_NAME:
 *                     type: string
 *                     description: The name of the table.
 *                   IS_ACTIVE:
 *                     type: integer
 *                     description: Indicates if the table is active (1) or not (0).
 *       500:
 *         description: Internal server error
 */
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

router.get('/get-reservation-pin',(req, res)=>{
    let {tableId,userId}=req.body;

    //check current tables has already active reservation



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