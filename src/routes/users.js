'use strict';

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Panic = require('../Panic');
const { bucket } = require('./../storage');
const cache = require('./../cache');

function bo(text) {
    const regex = /[A-Z]/g;
    text = text.replaceAll(/ +/g, '_');
    let index = text.search(regex);
    if (index == -1) return text;
    else if (index == 0) text = text.replace(text[index], text[index].toLowerCase());
    else text = text.replace(text[index], `_${text[index].toLowerCase()}`);
    return bo(text);
};

router.use(async (req, res, next) => {
    let panic;
    if (!req.headers.authorization) {
        panic = new Panic();
        panic.addbyRequest('Missing credential', req);
        return res.status(403).json(panic.toJSON());
    };

    req.credential = await mongoose.model('Credentials').findOne({token: req.headers.authorization});

    if (!req.credential) {
        panic = new Panic();
        panic.addbyRequest('Invalid credential', req);
        return res.status(403).json(panic.toJSON());
    };

    next()
});

router.get('/', (req, res) => {
    return mongoose.model('Accounts').findById(req.credential.id, req.query.query || ['username', 'email',' avatars', 'description']).then((user) => {
        return res.status(200).json(user);
    });
});

router.patch('/', async (req, res) => {
    let panic;
    let data = {};

    if (req.body.email) data.email = req.body.email;
    if (req.body.username) data.username = req.body.username;
    if (req.body.description) data.description = req.body.description;

    const user = await mongoose.model('Accounts').findById(req.credential.id, ['_id']);
    
    if (!user) {
        panic = new Panic();
        panic.addbyRequest('User not found', req);
    };

    const update = await user.updateOne(data)
    .then(async () => {
        let ws;
        if (cache.has(req.credential.token)) {
            ws = cache.get(req.credential.token).ws;
            ws.send(JSON.stringify({op: 4, t: 'USER_UPDATE', d: data}));
        };
        await mongoose.model('AuditLogs').create({
            id: user._id,
            type: 'USER',
            data: data, 
        }).then(() => {
            ws?.send(JSON.stringify({op: 4, t: 'AUDIT_LOG', d: {
                id: user._id,
                type: 'USER',
                action: 'UPDATE',
                data: data,
            }}));
        });
    }).catch((err) => {
        if (!panic) panic = new Panic();
        panic.addbyRequest('Unknown error', req, err);
        res.status(400).json(panic.toJSON());
        return false;
    });

    if (update) return;

    return res.status(204).end();
});

router.post('/avatar', async (req, res) => {
    let panic;

    const user = await mongoose.model('Accounts').findById(req.credential.id, ['_id']);

    if (!user) {
        if (!panic) panic = new Panic();
        panic.addbyRequest('User not found', req);
    };

    let stream = req.files[Object.keys(req.files)[0]];
    
    if (!stream) {
        if (!panic) panic = new Panic();
        panic.addbyRequest('Files not found', req);
    };

    if (panic) return res.status(400).json(panic.toJSON());

    const name = stream.path.split(/\\+/g).pop()

    const file = await bucket.file(`avatars/${req.credential.id.toString()}/${name}`);

    const readder = file.createWriteStream();

    stream
        .on('data', (chunk) => readder.write(chunk))
        .on('end', () => readder.end());

    const update = await user.updateOne({
        avatar: name,
    }).then(async () => {
        let ws;
        if (cache.has(req.credential.token)) {
            ws = cache.get(req.credential.token).ws;
            ws.send(JSON.stringify({op: 4, t: 'USER_AVATAR_UPDATE', d: name}));
        };
        await mongoose.model('AuditLogs').create({
            id: user._id,
            type: 'USER_AVATAR',
            action: 'UPDATE',
            data: data,
        }).then(() => {
            ws?.send(JSON.stringify({op: 4, t: 'AUDIT_LOG', d: {
                id: user._id,
                type: 'USER_AVATAR',
                action: 'UPDATE',
                data: data,
            }}));
        });
    }).catch((err) => {
        if (!panic) panic = new Panic();
        panic.addbyRequest('Unknow error', req, err);
    
        if (panic) res.status(400).json(panic.toJSON());
        return false;
    });

    if (update) return;

    return res.status(204).end();
});

router.get('/analytics', (req, res) => mongoose.model('Analytics').findOne({id: req.credential.id}).then((analytics) => res.status(200).json(analytics)));

router.put('/analytics', async (req, res) => {
    const analytic = await mongoose.model('Analytics').findOne({id: req.credential.id});

    const data = {};
    const _data = {
        add: {},
        remove: {},
        update: {},
    };

    if (req.body.connection) {
        if (!data.$push) data.$push = {};
        data.$push.connection = _data.add.connection = req.body.connection;
    };
    if (req.body.loaded) {
        if (!data.$inc) data.$inc = {};
        data.$inc.loaded = _data.update.loaded = req.body.loaded;
    };
    if (req.body.downloaded) {
        if (!data.$push) data.$push = {};
        data.$push.downloaded = _data.add.downloaded = req.body.downloaded;
    };
    if (req.body.liked?.startsWith('DEL-')) {
        if (!data.$pull) data.$pull = {};
        data.$pull.liked = _data.remove.liked = req.body.liked.replace('DEL-', '');
    } else if (req.body.liked) {
        if (!data.$push) data.$push = {};
        if (!analytic.liked.includes(req.body.liked)) data.$push.liked = _data.add.liked = req.body.liked;
    };
    if (req.body.following?.startsWith('DEL-')) {
        if (!data.$pull) data.$pull = {};
        data.$pull.following = _data.remove.following = req.body.following.replace('DEL-', '');
    } else if (req.body.following) {
        if (!data.$push) data.$push = {};
        if (!analytic.following.includes(req.body.following)) data.$push.following = _data.add.following = req.body.following;
    };
    if (req.body.follower?.startsWith('DEL-')) {
        if (!data.$pull) data.$pull = {};
        data.$pull.follower = _data.remove.follower =  req.body.follower.replace('DEL-', '');
    } else if (req.body.follower) {
        if (!data.$push) data.$push = {};
        if (!analytic.follower.includes(req.body.follower)) data.$push.follower = _data.add.follower = req.body.follower;
    };
    if (req.body.wallpaperViews?.startsWith('DEL-')) {
        if (!data.$pull) data.$pull = {};
        data.$pull.wallpaperViews = _data.remove.wallpaperViews = req.body.wallpaperViews.replace('DEL-', '');
    } else if (req.body.wallpaperViews) {
        if (!data.$push) data.$push = {};
        if (!analytic.wallpaperViews.includes(req.body.wallpaperViews)) data.$push.wallpaperViews = _data.add.wallpaperViews = req.body.wallpaperViews;
    };

    await analytic.updateOne(data).then(async () => {
        let ws;
        if (cache.has(req.credential.token)) {
            ws = cache.get(req.credential.token).ws
            ws.send(JSON.stringify({op: 4, t: 'ANALYTICS_UPDATE', d: data}));
        };
        Object.entries(_data.add).forEach(async ([key, value]) => {
            let construct = {
                _id: mongoose.Types.ObjectId(),
                id: req.credential.id,
                type: bo(key).toUpperCase(),
                action: 'ADD',
                data: value,
            };
            await mongoose.model('AuditLogs').create(construct).then(() => {
                ws?.send(JSON.stringify({op: 4, t: 'AUDIT_LOG', d: construct}));
            });
        });
        Object.entries(_data.update).forEach(async ([key, value]) => {
            let construct = {
                _id: mongoose.Types.ObjectId(),
                id: req.credential.id,
                type: bo(key).toUpperCase(),
                action: 'UPDATE',
                data: value,
            };
            await mongoose.model('AuditLogs').create(construct).then(() => {
                ws?.send(JSON.stringify({op: 4, t: 'AUDIT_LOG', d: construct}));
            });
        });
        Object.entries(_data.remove).forEach(async ([key, value]) => {
            let construct = {
                _id: mongoose.Types.ObjectId(),
                id: req.credential.id,
                type: bo(key).toUpperCase(),
                action: 'REMOVE',
                data: value,
            };
            await mongoose.model('AuditLogs').create(construct).then(() => {
                ws?.send(JSON.stringify({op: 4, t: 'AUDIT_LOG', d: construct}));
            });
        });
        return res.status(204).end();
    }).catch((err) => {
        return res.status(404).json(new Panic().addbyRequest('Unknown error', req, err).toJSON());
    });
});

router.get('/:id', async (req, res) => {
    if (req.params.id.length != 12 && req.params.id.length != 24) {
        return res.status(400).json(new Panic().addbyRequest('Bad ID', req).toJSON());
    };

    const user = await mongoose.model('Accounts').findById(req.params.id, ['username', 'avatar']).catch((err) => {
        res.status(400).json(new Panic().addbyRequest('Unknown error', req, err));
        return null;
    });

    if (!user) return res.status(404).json(new Panic().addbyRequest('User not found', req).toJSON(404));

    return res.status(200).json(user);
});


router.get('/search/:username', async (req, res) => {
    if (req.params.username.length < 3) {
        return res.status(400).json(new Panic().addbyRequest('Bad username', req).toJSON());
    };

    const users = await mongoose.model('Accounts').find({username: new RegExp(`${req.params.username}*`, 'gi')}, ['username', 'avatar'], {limit: 50, skip: isNaN(parseInt(req.query.skip)) ? 0 : parseInt(req.query.skip)});

    return res.status(200).json(users);
});

module.exports = router;