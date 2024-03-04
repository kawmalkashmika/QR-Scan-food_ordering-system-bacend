const dbConnection = require("../config/dbConnection");
const logger = require('../util/logger');
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
    dbConnection.getConnectionFromPool((err, connection) => {
        if (err) {
            logger.error(`Unable to acquire connection form pool ${req.requestId}`);
            commonResponse.sendErrorResponse(res, "Unable to connect database", req.requestId);
        } else {
            connection.query('SELECT ID_LOCATION_TABLE,ID_LOCATION_SECTION,TABLE_NAME,IS_ACTIVE FROM core_pos_location_table WHERE IS_ACTIVE=?', [status.ACTIVE], (error, results, fields) => {
                if (error) {
                    logger.error('Error retrieving data from database', error);
                    commonResponse.sendErrorResponse(res, "Error retrieving data from database", req.requestId);
                }
                connection.release();
                commonResponse.sendSuccessResponse(res, results, req.requestId);

            });
        }

    }, req.requestId);


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
router.post('/get-reservation-pin', (req, res) => {
    let { tableId, userId } = req.body;

    dbConnection.getConnectionFromPool((err, connection) => {
        if (err) {
            logger.error('Error retrieving connection from the pool', err);
            commonResponse.sendErrorResponse(res, 'Error retrieving connection from the pool', 500);
            return;
        }

        connection.beginTransaction((err) => {
            if (err) {
                logger.error('Error starting transaction', err);
                commonResponse.sendErrorResponse(res, 'Error starting transaction', 500);
                connection.release();
            }else{

                connection.query('SELECT * FROM core_mobile_reservation WHERE RESERVED_TABLE_ID=? AND IS_ACTIVE=? FOR UPDATE', [tableId, status.ACTIVE], (error, results, fields) => {
                    if (error) {
                        logger.error('Error retrieving data from database', error);
                        commonResponse.sendErrorResponse(res, 'Error retrieving data from database', 500);
                        connection.rollback(() => {
                            connection.release();
                        });
                        return;
                    }

                    if (results.length !== 0) {
                        logger.error('Table already reserved, Unable to reserve for user:', userId);
                        commonResponse.sendErrorResponse(res, 'Table already reserved', 409);
                        connection.rollback(() => {
                            connection.release();
                        });
                        return;
                    }

                    let reservationPIN = generateReservationPIN();
                    connection.query('INSERT INTO core_mobile_reservation (`RESERVED_USER_ID`,`RESERVED_TABLE_ID`,`RESERVATION_PIN`,`IS_ACTIVE`) VALUES(?,?,?,?)', [userId, tableId, reservationPIN, status.ACTIVE], (error, results, fields) => {
                        if (error) {
                            logger.error('Error reserving table', error);
                            commonResponse.sendErrorResponse(res, 'Error reserving table', 500);
                            connection.rollback(() => {
                                connection.release();
                            });
                            return;
                        }

                        let reservationId = results.insertId;
                        connection.query('INSERT INTO core_mobile_reservation_user (`RESERVATION_ID`, `USER_ID`) VALUES (?,?)', [reservationId, userId], (error, results, fields) => {
                            if (error) {
                                logger.error('Error inserting data', error);
                                commonResponse.sendErrorResponse(res, 'Error inserting data', 500);
                                connection.rollback(() => {
                                    connection.release();
                                });
                                return;
                            }

                            connection.commit((err) => {
                                if (err) {
                                    logger.error('Error committing transaction', err);
                                    commonResponse.sendErrorResponse(res, 'Error committing transaction', 500);
                                    connection.rollback(() => {
                                        connection.release();
                                    });
                                    return;
                                }

                                commonResponse.sendSuccessResponse(res, {
                                    "reservationPin": reservationPIN,
                                    "reservationId": reservationId,
                                });
                                connection.release();
                            });
                        });
                    });
                });
            }


        });
    },req.requestId);
});


/**
 * @swagger
 * /table/validate-reservation-pin:
 *   post:
 *     summary: Validate reservation PIN for a table
 *     description: Validate the reservation PIN for a specific table.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tableId:
 *                 type: string
 *               reservationPin:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful validation
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: Error retrieving data from the database
 */
router.post('/validate-reservation-pin', (req, res) => {
    let {tableId, reservationPin, userId} = req.body;

    dbConnection.getConnectionFromPool((err, connection) => {
        if (err) {
            logger.error('Error retrieving data from database', err);
            commonResponse.sendErrorResponse(res, 'Error retrieving data from database', 500);
        } else {
             connection.query('SELECT RESERVATION_ID FROM core_mobile_reservation WHERE RESERVED_TABLE_ID=? AND RESERVATION_PIN=? AND IS_ACTIVE=?', [tableId, reservationPin, status.ACTIVE], (error, results, fields) => {
                if (err) {
                    logger.error('Unable to retrieve data', error);
                    commonResponse.sendErrorResponse(res, "Unable to retrieve data", req.requestId);
                } else {
                    if (results.length >= 1) {
                        const reservationId = results[0].RESERVATION_ID;
                        connection.query('INSERT INTO core_mobile_reservation_user (`RESERVATION_ID`, `USER_ID`) VALUES (?,?)', [reservationId, userId], (error, results, fields) => {
                            if (error) {
                                logger.error('Unable to insert data', err);
                                commonResponse.sendErrorResponse(res, 'unable to insert data', 500);
                            } else {
                                commonResponse.sendSuccessResponse(res, {"reservationId": reservationId}, req.requestId);
                            }
                        })
                    } else {
                        logger.error('Unable join Table', error);
                        commonResponse.sendErrorResponse(res, "Unable to join table", req.requestId);
                    }
                }
            })
        }

    }, req.requestId)
})


function generateReservationPIN() {
    logger.info("Generating Reservation PIN");
    const otp = Math.floor(1000 + Math.random() * 9000);
    return otp;
}

module.exports = router;