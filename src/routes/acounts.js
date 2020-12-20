'use strict';

const express = require('express');
const router = express.Router();
const Panic = require('./../Panic');
const mongoose = require('mongoose');
const crypto = require('crypto');

router.post('/', (req, res) => {
    let panic;
    if (!req.body.username) {
        panic = new Panic();
        panic.addbyRequest('Missing username', req);
    };
    if (!req.body.email) {
        if (!panic) panic = new Panic();
        panic.addbyRequest('Missing email', req);
    };
    if (!req.body.password) {
        if (!panic) panic = new Panic();
        panic.addbyRequest('Missing password', req);
    } else {
        const hash = crypto.createHash('sha256');
        hash.update(req.body.password);
        req.body.password = hash.digest('hex');
    };

    if (panic) return res.status(400).json(panic.toJSON());

    mongoose.model('Accounts').create({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
    })
    .then((data) => {
        mongoose.model('Credentials').create({
            id: data._id,
            token: `${
                Buffer.from(data._id.toString()).toString('base64')
            }.${Buffer.from(String(process.pid)).toString('base64')}.${Buffer.from(String(Date.now())).toString('base64')}`,
        });
        mongoose.model('Analytics').create({
            id: data.id,
        });
        res.status(200).json({
            _id: data._id,
            username: data.username,
            email: data.email,
            avatar: data.avatar,
            description: data.description,
        });
    })
    .catch((err) => {
        if (!panic) panic = new Panic();
        panic.addbyRequest('Create schema error', req, err);
        return res.status(400).json(panic);
    });
});

router.post('/login', (req, res) => {
    let panic;
    if (!req.body.email) {
        panic = new Panic();
        panic.addbyRequest('Missing email', req);
        return res.status(400).json(panic.toJSON());
    } else {
        if (!req.body.password) {
            if (!panic) panic = new Panic();
            panic.addbyRequest('Missing password', req);
        };
        mongoose.model('Accounts').findOne({email: req.body.email}, ['password', '_id']).then((user) => {
            if (!user) {
                if (!panic) panic = new Panic();
                panic.addbyRequest('User not found', req);
                return res.status(404).json(panic.toJSON());
            };
            const hash = crypto.createHash('sha256');
            hash.update(req.body.password);
            req.body.password = hash.digest('hex');
            if (user.password != req.body.password) {
                if (!panic) panic = new Panic();
                panic.addbyRequest('Incorrect password', req);
                return res.status(400).json(panic.toJSON());
            } else {
                mongoose.model('Credentials').findOne({id: user._id}).then((credential) => {
                    if (credential.timestamp < Date.now()) {
                        credential.gen().then((cred) => {
                            return res.status(200).json(cred);
                        });
                    } else return res.status(200).json(credential);
                });
            };
        });
    };
});

router.get('/:key', (req, res) => {
    let panic;
    mongoose.model('Credentials').findOne({token: req.params.key}).then((cred) => {
        if (!cred) {
            panic = new Panic();
            panic.addbyRequest('Credential not found', req);
            return res.status(404).json(panic.toJSON());
        } else {
            if (cred.timestamp < Date.now()) cred.gen()
        };
        mongoose.model('Accounts').findById(cred.id, ['username', 'email', 'avatar', 'description']).then((user) => {
            if (!user) {
                if (!panic) panic = new Panic();
                panic.addbyRequest('User not found', req);
                return res.status(404).json(panic.toJSON());
            } else return res.status(200).json(user);
        });
    });
});

module.exports = router;