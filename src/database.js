'use strict';

const {model, Schema} = require('mongoose');

model('Accounts', new Schema({
    username: {
        type: String,
    },
    email: {
        type: String,
        index: true,
        validate: {
            validator: (v) => /\w{1,50}@\w{1,50}.\w{1,10}/gim.test(v),
            message: props => `${props.value} is not a valid email !`,
        },
        required: [true, 'Email required'],
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Password required'],
    },
    avatar: {
        type: String,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
}));

let credentials = new Schema({
    id: {
        type: Schema.Types.ObjectId,
        required: true,
        unique: true,
        index: true,
    },
    token: {
        type: String,
        required: true,
        unique: true,
    },
    timestamp: {
        type: String,
        required: true,
        default: Date.now() + 1e3*(60**2)*24,
    },
});

credentials.method('gen', async function(id) {
    this.token = `${
        Buffer.from(id || this.id).toString('base64')
    }.${Buffer.from(String(process.pid))}.${Buffer.from(String(Date.now()))}`;

    this.timestamp = Date.now() + 1e3*(60**2)*24;

    await this.save();

    return this;
});

model('Credentials', credentials);

model('Analytics', new Schema({
    id: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
        unique: true,
    },
    pageViews: {
        type: Object,
        default: {},
    },
    createdAt: {
        type: String,
        default: Date.now(),
    },
    connection: {
        type: Array,
        default: [],
    },
    downloaded: {
        type: Array,
        default: [],
    },
    liked: {
        type: Array,
        default: [],
    },
    following: {
        type: Array,
        default: [],
    },
    follower: {
        type: Array,
        default: [],
    },
    wallpaperViews: {
        type: Array,
        default: [],
    },
    loaded: {
        type: Schema.Types.Number,
        default: 0,
    },
}));