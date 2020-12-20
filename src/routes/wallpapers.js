'use strict';

const express = require('express');
const router = express.Router();
const {bucket} = require('../storage');

router.get('/:id', async (req, res) => {
    const maxResults = !isNaN(parseInt(req.query.maxresults)) ?
        parseInt(req.query.maxresults) : 100;

    const files = await bucket.getFiles({
        autoPaginate: true,
        directory: `wallpapers/${req.params.id}`,
        maxResults,
        pageToken: req.query.pagetoken,
    });

    return res.status(200).json(files[2]);
});

router.get('/:id/:name', async (req, res) => {
    const files = await bucket.file(`wallpapers/${req.params.id}/${req.params.name}`);
    const exist = await files.exists();

    if (!exist[0]) {
        return res.status(404).json({
            error: true,
            message: 'File not found',
        });
    };
    return res.status(200).json(files.metadata);
});

module.exports = router;