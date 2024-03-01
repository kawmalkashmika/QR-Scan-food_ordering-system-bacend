const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'H2POS QR Scanner API Documentation',
            version: '1.0.0',
            description: 'Documentation for H2POS QR Scanner',
        },
        contact: {
            name: 'Kawmal Kashmika',
            email: 'kawmal.zincat@gmail.com',
            url: 'https://zincat.net/',
        },
        license: {
            name: 'MIT License',
            url: 'https://opensource.org/licenses/MIT',
        },
    },
    apis: ['./routes/*.js'], // Path to the API routes
};

const specs = swaggerJsdoc(options);

module.exports = specs;