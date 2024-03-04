const dbConnection = require("../config/dbConnection");
const logger = require('../util/logger');
const express = require('express');
const commonResponse = require('../commonResponse/commonResponse');
const {json} = require("express");
const router = express.Router();
const Request = require('request');
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
    sendOTPtoMobile(otp,mobileNumber);

   dbConnection.getConnectionFromPool((err,connection)=>{
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
           connection.release();

       });

   },req.requestId)

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

    dbConnection.getConnectionFromPool((err,connection)=>{
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
                    connection.release();
                });
                return commonResponse.sendSuccessResponse(res, 'OTP verified successfully');
            } else {
               connection.release();
                return commonResponse.sendErrorResponse(res, 'Invalid OTP', 400);
            }
        });
    },req.requestId)

});

/**
 * @swagger
 * /user/resend-otp:
 *   post:
 *     summary: Resend OTP
 *     description: Resends OTP to the user associated with the provided user ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user to whom OTP needs to be resent.
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       500:
 *         description: Internal server error
 */
router.post('/resend-otp',(req, res)=>{
    const {userId}=req.body;


    dbConnection.getConnectionFromPool((err,connection)=>{
        connection.query('SELECT USER_ID,MOBILE_NUMBER FROM core_mobile_user WHERE USER_ID=?',[userId],(error,results,field)=>{
            if(results.length===0){
                logger.error('User not found');
                commonResponse.sendErrorResponse(res,'User not found',404);
            }else{
                const newOTP=generateOTP();
                sendOTPtoMobile(newOTP,results[0].MOBILE_NUMBER);
                connection.query('UPDATE core_mobile_user SET OTP=?,OTP_STATUS=? WHERE USER_ID=?', [newOTP,OTPStatus.RESEND,userId], (error, results, fields) => {
                    if (error) {
                        logger.error('Error occurred updating OTP from database', error);
                        commonResponse.sendErrorResponse(res, error.code, 500);
                    } else {
                        logger.info("Resend OTP to user");
                        commonResponse.sendSuccessResponse(res);

                    }
                    connection.release();

                });
            }
        });
        });
});



function generateOTP() {
    logger.info("Generating OTP");
    const otp = Math.floor(1000 + Math.random() * 9000);
    return otp;
}

function sendOTPtoMobile(otp,mobileNumber) {
    console.log(mobileNumber.substring(1));
    const message =
        `Dear Customer,
Your One-Time Password (OTP) for verification is: ${otp}. Please use this OTP to complete your verification process.
Note: This OTP is valid only for 5 minutes.
Thank you,
[Zincat Technologies]`;
    const url = `https://richcommunication.dialog.lk/api/sms/inline/send?q=15669742473072&destination=94${mobileNumber.substring(1)}&message=${message}&from=Nalanda`

    Request.get(url, (error, response, body) => {
            if (response) {
                logger.info("Send OTP to Mobile");
            }
            if (error) {
                logger.info("Unable to sent OTP to mobile",error);
            }
        }
    );

}


module.exports = router;