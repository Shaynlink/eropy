'use strict';
require('./../scripts/loader');
require('./database');

const http = require('http');
const app = require('./app');
const mongoose = require('mongoose');
const ws = require('ws');
const wsServer = new ws.Server({ noServer: true });
const cache = require('./cache');

mongoose.connect('mongodb://localhost:27017/eros', {
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useNewUrlParser: true
});

mongoose.connection.on('connected', () => console.log('Mongoose connected'));
mongoose.connection.on('disconnected', () => console.log('Mongoose disconnected'));

http.createServer(app)
    .listen(process.env.PORT || 3030, '0.0.0.0')
    .on('listening', () => console.log('Server listening on %s', process.env.PORT || 3000))
    .on('upgrade', (req, ws, head) => {
        wsServer.handleUpgrade(req, ws, head, (ws) => {
            wsServer.emit('connection', ws, req);
        });
    });

/**
 * OP
 * 0 OPEN : client <- server
 * 1 HEARTBEAT : client -> server
 * 2 ACKNOWLEDGE : client <- server
 * 3 AUTHENTIFICATION : client -> server
 * 4 EVENT : client <- server
 *         |-> ANALYTICS_UPDATE
 *         |-> USER_UPDATE
 *         |-> USER_AVATAR_UPDATE
 * 5 READY : client <- server
 * 
 * ERROR
 * 4000 Heartbeat timeout
 * 4001 Credential invalid
 * 4010 Not authentificate
 */
wsServer.on('connection', (ws, req) => {
    ws.send(JSON.stringify({
        op: 0,
        d: {
            heartbeat: 45000,
        },
    }));

    ws.token;

    let heartbeat = setTimeout(() => ws.close(4000), 60000);

    ws.on('close', () => {
        clearTimeout(heartbeat);
        if (cache.has(ws.token)) cache.delete(ws.token);
    });

    ws.on('message', async (message) => {
        const json = JSON.parse(message);

        console.log(json);

        switch (json.op) {
            case 1:
                clearTimeout(heartbeat);
                heartbeat = setTimeout(() => ws.close(4000), 60000);

                if (!ws.token) return ws.close(4001)

                ws.send(JSON.stringify({op: 2, d: null}));
            break;
            case 3:
                const credential = await mongoose.model('Credentials').findOne({token: json.d.token});

                if (!credential) ws.close(4010);

                ws.token = json.d.token;

                cache.set(ws.token, {
                    token: json.d.token,
                    ws,
                    req,
                    credential,
                });

                ws.send(JSON.stringify({op: 5, d: null}));
            break;
            default:
                console.log(json);
                break;
        };
    });
});