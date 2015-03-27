var config = require('../config/config');
var instagram = require('instagram-node-lib');
var followed = require('./followed');
var async = require('async');

// Configuration
instagram.set('client_id', config.INSTAGRAM_CLIENT_ID);
instagram.set('client_secret', config.INSTAGRAM_CLIENT_SECRET);

// Popular media
exports.popular = function (req, res, next) {
    instagram.media.popular({
        complete: function (data, pagination) {
            var chunk = {'data': data, 'pagination': pagination};
            res.send(chunk);
        },
        error: function (errorMessage, errorObject, caller) {
            return next(new Error(errorMessage + ' from ' + caller));
        }
    });
};

// Search users
exports.search = function (req, res, next) {
    var userId = req.user ? req.user.id : undefined;
    instagram.users.search({
        q: req.params.q,
        complete: function (data) {
            if(userId) {
                // add followed state
                async.each(data, function (user, callback) {
                    followed.isUserFollowed(userId, user.id).exec(function (err, count) {
                        if (err) callback(err);
                        user.followed = (count === 1);
                        callback();
                    })
                }, function (err) {
                    if (err) return next(err);
                    res.send(data);
                });
            }
            else
                res.send(data);
        },
        error: function (errorMessage, errorObject, caller) {
            return next(new Error(errorMessage + ' from ' + caller));
        }
    })
};

// User feed
exports.user = function (req, res, next) {
    var instagramId = req.id;
    var userId = req.user ? req.user.id : undefined;
    var result = {};

    async.parallel([
        // get user info
        function(callback) {
            instagram.users.info({
                user_id: instagramId,
                complete: function (data) {
                    result.userInfo = data;
                    // check if followed
                    followed.isUserFollowed(userId, instagramId).exec(function(err,count){
                        if(err) callback(err);
                        result.userInfo.followed = (count === 1);
                        callback();
                    })
                },
                error: function (errorMessage, errorObject, caller) {
                    if(errorMessage === 'APINotAllowedError')
                        callback();
                    else
                        callback(new Error(errorMessage + ' from ' + caller));
                }
            })
        },
        // get users recent media
        function(callback) {
            instagram.users.recent({
                user_id: instagramId,
                complete: function (data, pagination) {
                    result.data = data;
                    result.pagination = pagination;
                    callback();
                },
                error: function (errorMessage, errorObject, caller) {
                    if(errorMessage === 'APINotAllowedError')
                        callback();
                    else
                        callback(new Error(errorMessage + ' from ' + caller));
                }
            })
        }
    ],function(err){
        if(err) return next(err);
        res.send(result);
    });
};

// User feed (more media)
exports.userMore = function (req, res, next) {
    instagram.users.recent({
        user_id: req.params.id,
        max_id: req.params.next_max_id,
        complete: function (data, pagination) {
            res.send({'data':data, 'pagination':pagination});
        },
        error: function (errorMessage, errorObject, caller) {
            return next(new Error(errorMessage + ' from ' + caller));
        }
    })
};

// Middleware to convert instagram username in id
exports.idFromUsernameMiddleware = function (req, res, next) {
    instagram.users.search({
        q: req.params.username,
        count: 1,
        complete: function (data) {
            if(data.length > 0)
                req.id = data[0].id;
            next();
        },
        error: function (errorMessage, errorObject, caller) {
            next();
        }
    });
};

// Get media by ID (NOT USED)
exports.getMedia = function (req, res, next) {
    instagram.media.info({
        media_id: req.params.id,
        complete: function (data) {
            res.send(data);
        },
        error: function (errorMessage, errorObject, caller) {
            return next(new Error(errorMessage + ' from ' + caller));
        }
    })
};

