var db = require('../config/db.js');
var followed = require('./followed');
var instagram = require('instagram-node-lib');
var async = require('async');
var moment = require('moment');

var sliceSize = 40;
var maxCacheSize = 300;

exports.feed = function (req, res, next) {
    // Check if is a 'load more' request
    if(req.params.max_timestamp > 0) {
        // get 20 more recent media from cached
        db.User.findById(req.user.id, {cachedFeed: {$slice:sliceSize}}, function(err, data){
            if(err) return next(err);
            if(data.cachedFeed.length > 0) {
                res.json(data.cachedFeed);
                // remove them from cache
                var lastTime = data.cachedFeed[data.cachedFeed.length - 1].created_time;
                db.User.findByIdAndUpdate(req.user.id, {$pull: {cachedFeed: {created_time: {$gte: lastTime}}}}, function (err) {
                    //if (!err) console.log("Removed %d items from cache", sliceSize);
                });
            }
            else {
                getAllUsersRecent(req, res, next);
            }
        });
    }
    else {
        getAllUsersRecent(req, res, next);
    }
};

var getAllUsersRecent = function(req, res, next) {
    // Common data and functions
    var allUsersRecent = [];
    var parallelUsersRequests = 20;
    var userRecentRequest = function (item, callback) {
        instagram.users.recent({
            user_id: item.id,
            max_timestamp: req.params.max_timestamp || 0,
            count: 10,
            access_token: req.user.accessToken,
            complete: function (data, pagination) {
                allUsersRecent = allUsersRecent.concat(data);
                callback();
            },
            error: function (errorMessage, errorObject, caller) {
                if(errorMessage === 'APINotAllowedError')
                    callback();
                else
                    callback(new Error(errorMessage + ' from ' + caller));
            }
        });
    };

    // Naive solution:
    // 1: get N (more) recent media from each user
    followed.getFollowedList(req.user.id).exec(function (err, user) {
        if (err) return next(err);
        //mediaCountForEachUser = Math.min(4, Math.floor(maxCacheSize/user.followed));
        async.eachLimit(user.followed, parallelUsersRequests, userRecentRequest, function (err) {
            if (err) return next(err);
            // 2: order by createdTime
            async.sortBy(allUsersRecent, function (item, callback) {
                callback(null, -1 * item.created_time);
            }, function (err, sortedAllUsersRecent) {
                if (err) return next(err);
                // 3: return first 20
                res.json(sortedAllUsersRecent.slice(0, sliceSize));
                // 4: cache the others
                db.User.findByIdAndUpdate(req.user.id, {$set: {cachedFeed:sortedAllUsersRecent.slice(sliceSize, maxCacheSize-sliceSize)}}, function (err) {
                    if (err) return next(err);
                    //console.log("Cached %d items", sortedAllUsersRecent.length - sliceSize);
                });
            });
        })
    });
};

/*********************************************************************/

exports.periodicMediaCaching = function(cb) {
    db.User.find().lean().exec(function(err, users){
        if(err) cb(err);
        for(var i=0;i<users.length;i++) {
            var minTimestamp = users[i].cachedFeed.length > 0 ? users[i].cachedFeed[0].created_time+1 : null;
            cacheUsersRecentMedia(users[i], null, minTimestamp, cb);
        }
    });
};

exports.feed2 = function(req, res, next) {
    db.User.findById(req.user.id, function(err, user) {
        if(err) return next(err);

        // Check if is a 'load more' request
        if(req.params.max_timestamp > 0) {
            async.filterSeries(user.cachedFeed, function(item, callback){
                callback(item.created_time < req.params.max_timestamp);
            }, function(results){
                if(results.length == 0) {
                    // get data with max_timestamp = req.params.max_timestamp max_count = newSliceSize
                    // and append to cache?
                }
                else
                    res.json(results.slice(0,sliceSize));
            });
        }
        else if(req.params.min_timestamp > 0) {
            // get all items most recent then min_timestamp
            async.filterSeries(user.cachedFeed, function(item, callback){
                callback(item.created_time > req.params.min_timestamp);
            }, function(results){
                res.json(results);
            });
        }
        else {
            res.json(user.cachedFeed.slice(0,sliceSize));
        }
    });
};

exports.checkNewMedia = function(req, res, next) {
    db.User.findById(req.user.id, function(err, user) {
        if(err) return next(err);

        var mostRecentCachedMediaTime = user.cachedFeed[0].created_time+1;
        var newSyncTime = moment().unix();
        cacheUsersRecentMedia(user, null, mostRecentCachedMediaTime, function(err, newData) {
            res.json(newData);
        });
    });
};

var cacheUsersRecentMedia = function(user, max_timestamp, min_timestamp, cb) {

    var _24HoursAgo = moment().subtract(1, 'days').unix();
    var allUsersRecent = [];
    // Function to get max 20 media for a user in a time range
    var userRecentRequest = function (item, callback) {
        instagram.users.recent({
            user_id: item.id,
            max_timestamp: max_timestamp,
            min_timestamp: min_timestamp ? min_timestamp : _24HoursAgo,
            access_token: user.accessToken,
            complete: function (data) {
                allUsersRecent = allUsersRecent.concat(data);
                callback();
            },
            error: function (errorMessage, errorObject, caller) {
                if(errorMessage === 'APINotAllowedError')
                    callback();
                else
                    callback(new Error(errorMessage + ' from ' + caller));
            }
        });
    };

    followed.getFollowedList(user._id).exec(function (err, foundUser) {
        if (err) return cb(err);

        async.eachLimit(foundUser.followed, 20, userRecentRequest, function (err) {
            if (err) return cb(err);

            if(allUsersRecent.length == 0)
                cb(err, false);
            else {
                // order by created_time
                async.sortBy(allUsersRecent, function (item, callback) {
                    callback(null, -1 * item.created_time);
                }, function (err, sortedAllUsersRecent) {
                    // cache new items
                    db.User.findByIdAndUpdate(user._id, {
                        $push: {
                            cachedFeed: {
                                $each: sortedAllUsersRecent,
                                $position: 0
                            }
                        }
                    }, function (err, doc) {
                        if (err) return cb(err);
                        console.log("Cached %d items", sortedAllUsersRecent.length);
                        cb(err, true);
                        // remove oldest items in the cache
                        db.User.findByIdAndUpdate(user._id, {$pull: {cachedFeed: {created_time: {$lt: _24HoursAgo.toString()}}}}).exec();
                    });
                });
            }
        })
    });
};
