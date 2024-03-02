const { ENV, environment } = require('./envConfig');
function getDatabaseCredentials(){
    if(environment==ENV.DEV || undefined){
        return{
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: 'Kawmal@123',
            database: 'h2_pos_harpos_bayleaf_rest'
        }
    } else if(environment==ENV.QA){
        return {
            host: '203.94.75.114',
            user: 'root',
            database: 'h2_pos_harpos_bayleaf_rest',
            port: "3306",
            waitForConnections: true,
            connectionLimit: 100,
            queueLimit: 0,
            password: 'mrCat@_456',
        }
    }else if(environment==ENV.PROD) {
        return {
                host: 'localhost',
                port: 3306,
                user: 'root',
                password: 'Kawmal@123',
                database: 'h2_pos_harpos_bayleaf_rest'
            }
        }
}

let databaseCredentials=getDatabaseCredentials();




module.exports = {databaseCredentials};