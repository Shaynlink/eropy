'use strict';

class Panic {
    query;
    constructor(err) {
        this.query = err ? Array.isArray(err) ? err : [err] : [];
    };

    add(err) {
        Array.isArray(err) ? this.query.concat(err) : this.query.push(err);
        return this;
    };

    addbyRequest(message, req, errors) {
        if (!req) throw Error('If you not use "req", you must use add() method instead of addbyRequest()');
        this.query.push({
            message,
            vars: {
                params: req.params,
                query: req.query,
                body: req.body,
            },
            error: errors instanceof Error ? errors.message : errors,
        });
        return this;
    };

    toJSON(code = 400) {
        return {
            errors: this.query,
            status: code,
            data: null,
        };
    };
};

module.exports = Panic;