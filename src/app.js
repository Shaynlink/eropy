'use strict';

const express = require('express');
const formData = require("express-form-data");
const helmet = require('helmet');
const cors = require('cors');
const app = express();

// Routes
const wallpapers = require('./routes/wallpapers');
const accounts = require('./routes/acounts');
const users = require('./routes/users');

app.use(helmet(), cors(), express.json(), express.urlencoded({ extended: true }), formData.parse(), formData.format(), formData.stream());

app.get('/', (req, res) => res.status(200).json({message: 'Hello.'}));

app.use('/wallpapers', wallpapers);
app.use('/accounts', accounts);
app.use('/users', users);

module.exports = app;