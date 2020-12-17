'use strict';

const {Storage} = require('@google-cloud/storage');
const storage = new Storage();

module.exports.storage = storage;

const bucket = storage.bucket('baketsu.kabegami.ohori.me');

module.exports.bucket = bucket;