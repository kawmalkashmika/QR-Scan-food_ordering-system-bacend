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
             host: 'localhost',
            port: 3306,
            user: 'root',
            password: 'Kawmal@123',
            database: 'h2_pos_harpos_bayleaf_rest',
            waitForConnections: true,
            connectionLimit: 100,
            queueLimit: 0,
        
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
