'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const app = express();

// Paths
const wallpaper = require('./routes/wallpaper');

app.use(helmet(), cors());

app.get('/', (req, res) => res.status(200).json({message: 'Hello.'}));

app.use('/wallpapers', wallpaper);

module.exports = app;