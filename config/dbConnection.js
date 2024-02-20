const mysql = require('mysql');
const config = require('./dbConfig');
const {loggers} = require("winston");
const logger = require("../util/logger");

// Function to create a database connection
function createConnection() {

  const connection = mysql.createConnection({
    host: config.DEV.host,
    user: config.DEV.user,
    password: config.DEV.password,
    database: config.DEV.database
  });


  connection.connect((err) => {
    if (err) {
      logger.error('Error connecting to database:', err);
      return;
    }
  });

  return connection;


}

// Function to close a database connection
function closeConnection(connection) {
  connection.end((err) => {
    if (err) {
      logger.error('Unable to close database connection',err)
    }
  });
}

module.exports = {
  createConnection,
  closeConnection
};


