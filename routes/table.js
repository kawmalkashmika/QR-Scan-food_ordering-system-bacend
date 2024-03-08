const dbConnection = require("../config/dbConnection");
const logger = require('../util/logger');
const express = require('express');
const {error} = require("winston");
const commonResponse = require('../commonResponse/commonResponse');
const Request = require("request");
const router = express.Router();
const status = {
    ACTIVE: 1,
    INACTIVE: 0,
};
const tableStatus = {
    RESERVED: "reserved",
    AVAILABLE: "available",
}

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
 * /table/get-table-status:
 *   get:
 *     summary: Retrieve table status from the database
 *     description: Retrieves the status of a table from the database based on the provided table ID.
 *     parameters:
 *       - in: query
 *         name: tableId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the table to retrieve status for.
 *     responses:
 *       '200':
 *         description: A successful response with the table status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tableId:
 *                   type: string
 *                   description: The ID of the table.
 *                 status:
 *                   type: string
 *                   description: The status of the table.
 *       '400':
 *         description: Bad request. Missing or invalid parameters.
 *       '500':
 *         description: Internal server error. Unable to retrieve data from the database.
 */
router.get('/get-table-status', (req, res) => {
    let tableId = req.query.tableId;
    dbConnection.getConnectionFromPool((err, connection) => {
        if (err) {
            logger.error('Error acquire connection from the pool', err);
            commonResponse.sendErrorResponse(res, 'Error acquire connection from the pool', 500);
        } else {
            connection.query('SELECT * FROM core_mobile_reservation WHERE RESERVED_TABLE_ID=? AND IS_ACTIVE=?', [tableId, status.ACTIVE], (error, results, fields) => {
                if (err) {
                    logger.error('Unable retrieve data from database', err);
                    commonResponse.sendErrorResponse(res, 'Unable retrieve data from database', 500);
                } else {
                    console.log(results);
                    if (results.length >= 1) {
                        commonResponse.sendSuccessResponse(res, {
                            'tableId': tableId,
                            'status': tableStatus.RESERVED
                        }, req.requestId);
                    } else {
                        commonResponse.sendSuccessResponse(res, {
                            'tableId': tableId,
                            'status': tableStatus.AVAILABLE
                        }, req.requestId);
                    }
                }
            })
        }
    }, req.requestId)
})


/**
 * @swagger
 * /table/reserve-table:
 *   post:
 *     summary: Reserve a table
 *     description: Reserve a table for a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tableId:
 *                 type: integer
 *                 description: The ID of the table to reserve
 *               userId:
 *                 type: integer
 *                 description: The ID of the user making the reservation
 *     responses:
 *       '200':
 *         description: Successful reservation
 *       '400':
 *         description: Bad request
 *       '409':
 *         description: Table already reserved for the user
 *       '503':
 *         description: Table already reserved
 */
router.post('/reserve-table', (req, res) => {
    let tableId = req.body.tableId;
    let userId = req.body.userId;

    dbConnection.getConnectionFromPool((err, connection) => {
        if (err) {
            logger.error('Error acquire connection from the pool', err);
            commonResponse.sendErrorResponse(res, 'Error acquire connection from the pool', 500);
            return;
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                logger.error('Error starting transaction', err);
                commonResponse.sendErrorResponse(res, 'Error starting transaction', 500);
                return;
            }

            connection.query('SELECT * FROM core_mobile_reservation WHERE RESERVED_TABLE_ID=? AND IS_ACTIVE=?', [tableId, status.ACTIVE], (error, results, fields) => {
                if (error) {
                    rollbackAndRelease(connection, res, 'Unable retrieve data from database', error);
                    return;
                }

                if (results.length >= 1) {
                    if (results[0].RESERVED_USER_ID == userId) {
                        rollbackAndRelease(connection, res, "Table already Reserved for you", null, 409);
                        return;
                    } else {
                        rollbackAndRelease(connection, res, "Table already Reserved.", null, 503);
                        return;
                    }
                } else {
                    let reservationPIN = generateReservationPIN();
                    connection.query('INSERT INTO core_mobile_reservation (`RESERVED_USER_ID`,`RESERVED_TABLE_ID`,`RESERVATION_PIN`,`IS_ACTIVE`) VALUES(?,?,?,?)', [userId, tableId, reservationPIN, status.ACTIVE], (error, results, fields) => {
                        if (error) {
                            rollbackAndRelease(connection, res, 'Unable to insert data to core_mobile_reservation table ', error);
                            return;
                        }

                        let reservationId = results.insertId;
                        connection.query("INSERT INTO core_mobile_reservation_user (`RESERVATION_ID`, `USER_ID`) VALUES (?,?)", [reservationId, userId], (error, results, fields) => {
                            if (error) {
                                rollbackAndRelease(connection, res, 'Unable to insert data to core_mobile_reservation_user table ', error);
                                return;
                            }

                            connection.commit((err) => {
                                if (err) {
                                    rollbackAndRelease(connection, res, 'Error committing transaction: ', err);
                                    return;
                                }

                                logger.info('Transaction successfully committed.');
                                commonResponse.sendSuccessResponse(res, {
                                    "reservationId": reservationId,
                                }, req.requestId);
                                connection.release();
                            });
                        });
                    });
                }
            });
        });
    }, req.requestId);
});


/**
 * @swagger
 * /table/join-table:
 *   post:
 *     summary: Join a table reservation
 *     description: Creates a new reservation for a user to join a table
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tableId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reservationPin:
 *                   type: string
 *                 reservationId:
 *                   type: integer
 *       '400':
 *         description: Bad request. Invalid input parameters
 *       '409':
 *         description: Conflict. Table already reserved
 *       '500':
 *         description: Internal server error
 */
router.post('/join-table', (req, res) => {
    let {tableId, userId} = req.body;

    let guestMobileNumber;
    let ownerMobileNumber;
    let reservationId;
    let PIN;

    dbConnection.getConnectionFromPool((err, connection) => {
        if (err) {
            logger.error('Error acquire connection from the pool', err);
            commonResponse.sendErrorResponse(res, 'Error acquire connection from the pool',req.requestId, 500);
            return;
        }

        // Define promises for both queries
        const queryOwnerMobile = new Promise((resolve, reject) => {
            connection.query('SELECT u.MOBILE_NUMBER,r.RESERVATION_ID,r.RESERVATION_PIN FROM core_mobile_reservation as r join core_mobile_user as u on u.USER_ID=r.RESERVED_USER_ID WHERE r.RESERVED_TABLE_ID=? AND r.IS_ACTIVE=?;', [tableId,status.ACTIVE], (error, results, fields) => {
                if (error) {
                    reject(error);
                } else {
                    if (results.length >= 1){
                        ownerMobileNumber = results[0].MOBILE_NUMBER;
                        reservationId=results[0].RESERVATION_ID;
                        PIN=results[0].RESERVATION_PIN;

                        resolve();
                    } else {
                        reject(new Error('Owner mobile number not found'));
                    }
                }
            });
        });

        const queryGuestMobile = new Promise((resolve, reject) => {
            connection.query('SELECT MOBILE_NUMBER FROM core_mobile_user WHERE USER_ID=? ', [userId], (error, results, fields) => {
                if (error) {
                    reject(error);
                } else {
                    if (results.length >= 1) {
                        guestMobileNumber = results[0].MOBILE_NUMBER;
                        resolve();
                    } else {
                        reject(new Error('Guest mobile number not found'));
                    }
                }
            });
        });

        // Execute both promises
        Promise.all([queryOwnerMobile, queryGuestMobile])
            .then(() => {
                // Both queries completed successfully, send SMS to both numbers
               sendReservationPIN(PIN,ownerMobileNumber,guestMobileNumber);
                commonResponse.sendSuccessResponse(res, {
                    "rservationId":reservationId,
                    "tableId":tableId
                }, req.requestId);
            })
            .catch((error) => {
                // Handle error
                logger.error('Error retrieving mobile numbers from database', error);
                commonResponse.sendErrorResponse(res, 'Error retrieving mobile numbers from database',req.requestId, 500);
            })
            .finally(() => {
                connection.release();
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
                    commonResponse.sendErrorResponse(res, "Unable to retrieve data", req.requestId,500);
                } else {
                    if (results.length >= 1) {
                        const reservationId = results[0].RESERVATION_ID;
                        connection.query('INSERT INTO core_mobile_reservation_user (`RESERVATION_ID`, `USER_ID`) VALUES (?,?)', [reservationId, userId], (error, results, fields) => {
                            if (error) {
                                logger.error('Unable to insert data',error);
                                commonResponse.sendErrorResponse(res, 'unable to insert data', req.requestId,500);
                            } else {
                                commonResponse.sendSuccessResponse(res, {"reservationId": reservationId}, req.requestId);
                            }
                        })
                    } else {
                        logger.error('Unable join Table');
                        commonResponse.sendErrorResponse(res, "Invalid pin", req.requestId,400);
                    }
                }
            })
        }

    }, req.requestId)
})


/**
 * @swagger
 * /table/close-table:
 *   post:
 *     summary: Close a table reservation
 *     description: Close a table reservation by updating its status to inactive in the database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tableId:
 *                 type: string
 *                 description: The ID of the table to close.
 *               reservationId:
 *                 type: string
 *                 description: The ID of the reservation to close.
 *     responses:
 *       200:
 *         description: Successful response upon closing the table reservation.
 *       400:
 *         description: Bad request if the required parameters are missing or invalid.
 *       500:
 *         description: Internal server error if there is a problem with the server.
 */

router.post('/close-table', (req, res) => {
    let tableId = req.body.tableId;
    let reservationId = req.body.reservationId;

    console.log(tableId);
    console.log(reservationId);

    dbConnection.getConnectionFromPool((err, connection) => {
        if (err) {
            logger.error('Error retrieving data from database', err);
            commonResponse.sendErrorResponse(res, 'Error retrieving data from database', 500);
        } else {
            connection.query('UPDATE core_mobile_reservation SET IS_ACTIVE=? WHERE RESERVATION_ID=? AND RESERVED_TABLE_ID=?', [status.INACTIVE, reservationId, tableId], (err, results, fields) => {
                if (err) {
                    logger.error('Unable to close table', err);
                    commonResponse.sendErrorResponse(res, 'Unable to close table', req.requestId, 500);
                } else {
                    console.log(results.affectedRows);
                    if (results.affectedRows > 0) {
                        logger.info("Table reservation close successfully")
                        commonResponse.sendSuccessResponse(res, 'Table close successfully', req.requestId);
                    } else {
                        logger.error('Unable to close table', err);
                        commonResponse.sendErrorResponse(res, 'Unable to close table', req.requestId, 500);
                    }
                }
            });
        }
    }, req.requestId);
});

function generateReservationPIN() {
    logger.info("Generating Reservation PIN");
    const otp = Math.floor(1000 + Math.random() * 9000);
    return otp;
}

function sendReservationPIN(PIN, ownerMobileNumber, guestMobileNumber) {
    const message =
        `Dear Customer,
Your table reservation PIN is: ${PIN}. ${guestMobileNumber} Requested to join with your table.If you welcome,please share this PIN with the guest.
Note: This PIN is valid until you close the bill.
Thank you,
[Zincat Technologies]`;
    const url = `https://richcommunication.dialog.lk/api/sms/inline/send?q=15669742473072&destination=94${ownerMobileNumber.substring(1)}&message=${message}&from=Nalanda`

    Request.get(url, (error, response, body) => {
            if (response) {
                logger.info("Send OTP to Mobile");
                return true;
            }
            if (error) {
                logger.info("Unable to sent OTP to mobile", error);
                return false;
            }
        }
    );

}

function rollbackAndRelease(connection, res, message, error, statusCode = 409) {
    connection.rollback(() => {
        connection.release();
        logger.error(message, error);
        commonResponse.sendErrorResponse(res, message, statusCode);
    });
}

module.exports = router;