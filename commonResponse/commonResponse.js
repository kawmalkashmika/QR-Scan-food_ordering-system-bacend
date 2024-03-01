function sendSuccessResponse(res, data) {
    // Define your success response data
    const responseData = {
        success: true,
        message: 'Request successful',
        data: data
    };

    // Send the response as JSON
    res.json(responseData);
}

// Function to send a common error response
function sendErrorResponse(res, errorMessage, statusCode = 500) {
    // Define your error response data
    const responseData = {
        success: false,
        message: errorMessage
    };

    // Send the response with the specified status code
    res.status(statusCode).json(responseData);
}

// Export the functions to make them accessible from other files
module.exports = {
    sendSuccessResponse,
    sendErrorResponse
};