'use strict';

const {join, resolve} = require('path');

global.GOOGLE_APPLICATION_CREDENTIALS =
    process.env.GOOGLE_APPLICATION_CREDENTIALS =
        resolve(join(process.cwd(), '/security/googlecloud/yokoso-282918-bb4c8ce80485.json'));

if (process.env.NODE_ENV == 'development') {
    const config = require('./../config');

    for (const [key, value] of Object.entries(config)) {
        process.env[key] = value;
    };
};