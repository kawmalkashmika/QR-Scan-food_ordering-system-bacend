const mysql = require('mysql');
const {databaseCredentials} = require('./dbConfig');
const {loggers} = require("winston");
const logger = require("../util/logger");
let pool;

// Function to initialize the connection pool
function initializePool() {
  try{
    pool = mysql.createPool(databaseCredentials);
    logger.info('Initialized database connection');
  }catch (error){
    logger.info('Unable to Initialized database connection.'+error);
  }

}

// Function to get a connection from the pool
function getConnectionFromPool(callback,requestId) {
  pool.getConnection((err, connection) => {
    if (err) {
      logger.error(`Unable to Acquire connection to  request id : ${requestId} `);
      callback(err, null);
    }else{
      logger.info(`Acquired connection to request id : ${requestId} `);
      callback(null, connection);
    }
  });
}

module.exports = {
  initializePool,
  getConnectionFromPool
};


