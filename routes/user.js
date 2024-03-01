const dbConnection = require("../config/dbConnection");
const logger = require('../util/logger');
const express = require('express');
const commonResponse = require('../commonResponse/commonResponse');
const {json} = require("express");
const router = express.Router();
const OTPStatus = {
    SENT: 'SENT',
    VERIFY: 'VERIFY',
    EXPIRED: 'EXPIRED',
    FAILED: 'FAILED',
    RESEND:'RESEND'
};


/**
 * @swagger
 * /user/register-user:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user with the provided mobile number and sends OTP for verification.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobileNumber:
 *                 type: string
 *                 description: The mobile number of the user.
 *     responses:
 *       200:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: integer
 *                   description: The ID of the newly created user.
 *       500:
 *         description: Internal server error
 */
router.post('/register-user', (req, res) => {
    const mobileNumber = req.body.mobileNumber;
    logger.info("User Registration Request " + mobileNumber);
    let otp = generateOTP();
    sendOTPtoMobile(otp);

    const connection = dbConnection.createConnection();
    connection.query('INSERT INTO core_mobile_user(MOBILE_NUMBER, OTP, OTP_STATUS) VALUES (?,?,?)', [mobileNumber, otp, OTPStatus.SENT], (error, results, fields) => {
        if (error) {
            logger.error('Error occurred while register user', error);
            commonResponse.sendErrorResponse(res, error.code, 500)
        } else {
            logger.info("User created successfully under " + mobileNumber);
            commonResponse.sendSuccessResponse(res, {
                "userId": results.insertId
            });

        }
        dbConnection.closeConnection(connection);

    });


});

/**
 * @swagger
 * /user/verify-otp:
 *   post:
 *     summary: Verify OTP for user
 *     description: Verifies the OTP provided by the user for authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user.
 *               otp:
 *                 type: string
 *                 description: The OTP provided by the user for verification.
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid OTP
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/verify-otp', (req, res) => {
    const {userId, otp} = req.body;
    const connection = dbConnection.createConnection();

    connection.query('SELECT * FROM core_mobile_user WHERE USER_ID = ?', [userId], (error, results, fields) => {

        if (error) {
            logger.error('Error occurred while retrieve user', error);
            return commonResponse.sendErrorResponse(res, 'Error retrieving data from database', 500);
        }
        if (results.length === 0) {
            return commonResponse.sendErrorResponse(res, 'User not found', 404);
        }

        const dbOTP = results[0].OTP; //
        if (otp === dbOTP) {
            connection.query('UPDATE core_mobile_user SET OTP_STATUS = ? WHERE USER_ID = ?', [OTPStatus.VERIFY, userId], (error, results, fields) => {
                if (error) {
                    logger.error('Unable to update OTP Status', error);
                    return commonResponse.sendErrorResponse(res, 'Unable to update OTP Status', 500);
                }
                dbConnection.closeConnection(connection);
            });
            return commonResponse.sendSuccessResponse(res, 'OTP verified successfully');
        } else {
            dbConnection.closeConnection(connection);
            return commonResponse.sendErrorResponse(res, 'Invalid OTP', 400);
        }
    });


});

/**
 * @swagger
 * /user/resend-otp:
 *   post:
 *     summary: Resend OTP to a user
 *     description: Resends OTP to the specified user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user to resend OTP.
 *     responses:
 *       200:
 *         description: Successful operation
 *       500:
 *         description: Internal server error
 */
router.post('/resend-otp', (req, res) => {
    // Your existing route handler logic
});
router.post('/resend-otp',(req, res)=>{
    const {userId}=req.body;
    const connection = dbConnection.createConnection();

    const newOTP=generateOTP();
    sendOTPtoMobile(newOTP);
    connection.query('UPDATE core_mobile_user SET OTP=?,OTP_STATUS=? WHERE USER_ID=?', [newOTP,OTPStatus.RESEND,userId], (error, results, fields) => {
        if (error) {
            logger.error('Error occurred updating OTP from database', error);
            commonResponse.sendErrorResponse(res, error.code, 500);
        } else {
            logger.info("Resend OTP to user");
            commonResponse.sendSuccessResponse(res);

        }
        dbConnection.closeConnection(connection);

    });
})



function generateOTP() {
    logger.info("Generating OTP");
    const otp = Math.floor(1000 + Math.random() * 9000);
    return otp;
}

function sendOTPtoMobile(otp) {
    /*todo-need to develop SMS gateway integration*/
    logger.info("Send OTP to Mobile");
}


module.exports = router;