var db = require('../config/db.js');
var followed = require('./followed');
var instagram = require('instagram-node-lib');
var async = require('async');

var sliceSize = 20;

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
            complete: function (data, pagination) {
                allUsersRecent = allUsersRecent.concat(data);
                callback();
            },
            error: function (errorMessage, errorObject, caller) {
                callback(new Error(errorMessage + ' from ' + caller));
            }
        });
    };

    // Naive solution:
    // 1: get 20 more recent media from each user
    followed.getFollowedList(req.user.id).exec(function (err, user) {
        if (err) return next(err);
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
                db.User.findByIdAndUpdate(req.user.id, {$set: {'cachedFeed':sortedAllUsersRecent.slice(sliceSize, sliceSize+100)}}, function (err) {
                    if (err) return next(err);
                    //console.log("Cached %d items", sortedAllUsersRecent.length - sliceSize);
                });
            });
        })
    });
};
