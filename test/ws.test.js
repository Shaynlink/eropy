'use strict';

const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3030/');

//ws.on('error', console.error);
ws.on('close', (code, reason) => {
    console.log('Ws close % %s', code, reason);

    
});

ws.on('message', (message) => {
    const json = JSON.parse(message);

    console.log(json);

    switch (json.op) {
        case 0:
            setInterval(() => ws.send(JSON.stringify({op: 1})), json.d.heartbeat); 

            ws.send(JSON.stringify({
                op: 3,
                d: {
                    token: 'NWZkZThjNjdkMWJkMGIwNzVjZDhlNDM4.MTg4NA==.MTYwODQyMDQ1NTQxNA==',
                },
            }));
            break;

        default:
            break;
    };
});
