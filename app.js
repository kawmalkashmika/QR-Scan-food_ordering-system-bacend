const express = require('express');
const app = express();
const logger=require('./util/logger');
const port = 3000;
const inventoryRoutes = require('./routes/inventory');
const cors = require("cors");
const compression = require("compression");


app.use((req, res, next) => {
   var requestedUrl = req.protocol + "://" + req.get("Host") + req.url;
   let log = " recived request. "+"["+req.method+"] " + requestedUrl;
   if (req.query && req.query.user) {
      log = log + ", by user : " + req.query.user;
   }
   logger.info(log);
   next();
});

app.use(cors());
app.use(express.json());
app.use(compression());

app.use('/inventory',inventoryRoutes);


app.listen(port, () => {
   logger.info(`Server is running on port ${port}`);
});