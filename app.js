const express = require('express');
const app = express();
const logger=require('./util/logger');
const cors = require("cors");
const compression = require("compression");
const swaggerUi = require('swagger-ui-express');
const specs = require('./config/swaggerConfig');
const {ENV,environment} = require("./config/envConfig");
const database = require('./config/dbConnection');
const uuid = require('uuid');
const fs = require('fs');
const path = require('path');

const port = 8080;
const host='localhost'

const inventoryRoutes = require('./routes/inventory');
const tableRoutes=require('./routes/table');
const userRoutes=require('./routes/user')
const orderRoutes=require('./routes/order')



app.use((req, res, next) => {
   //Add request id
   req.requestId = uuid.v4();

   //Logging details
   var requestedUrl = req.protocol + "://" + req.get("Host") + req.url;
   let log = " recived request. "+"["+req.method+"] " + requestedUrl;
   if (req.query && req.query.user) {
      log = log + ", by user : " + req.query.user+" REQUEST ID :"+req.requestId;
   }
   logger.info(log);
   next();
});





app.use(cors());
app.use(express.json());
app.use(compression());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use('/inventory',inventoryRoutes);
app.use('/table',tableRoutes);
app.use('/user',userRoutes);
app.use('/order',orderRoutes);



const logFilePath = path.join(__dirname, 'log.txt');

// Endpoint to get log file content
app.get('/log', (req, res) => {
   // Read the content of the log file
   fs.readFile(logFilePath, 'utf8', (err, data) => {
      if (err) {
         console.error('Error reading log file:', err);
         return res.status(500).send('Error reading log file');
      }
      res.sendFile(logFilePath);
   });
});
app.listen(port,() => {
   logger.info(`Server is running on port ${port}`);
   logger.info(`Application running on ${environment} environment`);
   database.initializePool();

});