const express = require('express');
const app = express();
const logger=require('./util/logger');
const port = 3000;
const inventoryRoutes = require('./routes/inventory');
const tableRoutes=require('./routes/table');
const userRoutes=require('./routes/user')
const cors = require("cors");
const compression = require("compression");
const swaggerUi = require('swagger-ui-express');
const specs = require('./config/swaggerConfig');


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

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use('/inventory',inventoryRoutes);
app.use('/table',tableRoutes);
app.use('/user',userRoutes);


app.listen(port, () => {
   logger.info(`Server is running on port ${port}`);
});