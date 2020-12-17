'use strict';
require('./../scripts/loader');

const http = require('http');
const app = require('./app');

http.createServer(app)
    .listen(process.env.PORT || 3000, '0.0.0.0')
    .on('listening', () => console.log('Server listening on %s', process.env.PORT || 3000));