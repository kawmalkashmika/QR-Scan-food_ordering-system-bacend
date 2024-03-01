const dbConnection = require("../config/dbConnection");
const logger=require('../util/logger');
const express = require('express');
const {error} = require("winston");
const commonResponse = require('../commonResponse/commonResponse');
const router = express.Router();
const status = {
    ACTIVE: 1,
    INACTIVE: 0,
};

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
    connection.query('SELECT ID_LOCATION_TABLE,ID_LOCATION_SECTION,TABLE_NAME,IS_ACTIVE FROM core_pos_location_table WHERE IS_ACTIVE=?',[status.ACTIVE], (error, results, fields) => {
        if (error) {
            logger.error('Error retrieving data from database',error);
            res.status(500).send('Error retrieving data from database');
        }
        res.status(200);
        res.json(results);
    });

    dbConnection.closeConnection(connection);
});

/**
 * @swagger
 * /table/get-reservation-pin:
 *   post:
 *     summary: Get reservation PIN
 *     description: Retrieves or generates a reservation PIN for a user and a table.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tableId:
 *                 type: string
 *                 description: The ID of the table for which reservation PIN is requested.
 *               userId:
 *                 type: string
 *                 description: The ID of the user for whom reservation PIN is requested.
 *     responses:
 *       200:
 *         description: Reservation PIN generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reservationPin:
 *                   type: string
 *                   description: The generated reservation PIN.
 *                 reservationId:
 *                   type: integer
 *                   description: The ID of the reservation.
 *       409:
 *         description: Table already reserved
 *       500:
 *         description: Internal server error
 */
router.post('/get-reservation-pin',(req, res)=>{
    let {tableId,userId}=req.body;

    const connection = dbConnection.createConnection();
    //check current tables has already active reservation
    connection.query('SELECT * FROM core_mobile_reservation WHERE RESERVED_TABLE_ID=? AND IS_ACTIVE=?',[tableId,status.ACTIVE],(error,results,fields)=>{
        if(error){
            logger.error('Error retrieving data from database',error);
            res.status(500).send('Error retrieving data from database');
        }else{
            console.log(results);
            if(results.length!=0){
                logger.error('Unable to reserve for user ',userId);
                res.status(409).send('Table already reserved');
            }else {
                let reservationPIN=generateReservationPIN();
                connection.query('INSERT INTO core_mobile_reservation (`RESERVED_USER_ID`,`RESERVED_TABLE_ID`,`RESERVATION_PIN`,`IS_ACTIVE`) VALUES(?,?,?,?)',[userId,tableId,reservationPIN,status.ACTIVE],(error,results,fields)=>{
                    if(error){
                        logger.error('Unable Reserve Table',error);
                        res.status(500).send('Unable to reserve table');
                    }else{
                        commonResponse.sendSuccessResponse(res,{
                            "reservationPin":reservationPIN,
                            "reservationId":results.insertId,


                        });
                    }
                    dbConnection.closeConnection(connection);
                });


            }
        }
    });
});


function generateReservationPIN() {
    logger.info("Generating Reservation PIN");
    const otp = Math.floor(1000 + Math.random() * 9000);
    return otp;
}

module.exports=router;