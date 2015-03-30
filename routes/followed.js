var config = require('../config/config');
var db = require('../config/db.js');

//-----------------------------------------
// API
//-----------------------------------------

exports.followedList = function(req, res, next) {
    exports.getFollowedList(req.user.id).exec(function(err,user){
        if(err) return next(err);
        return res.json(user.followed);
    });
};

exports.follow = function(req, res, next) {
    var instagramUser = req.body;
    if(!instagramUser) return res.sendStatus(400);
    var newUserToFollow = {
        id: instagramUser.id,
        username: instagramUser.username,
        full_name: instagramUser.full_name,
        picture: instagramUser.profile_picture
    };
    db.User.update({_id : req.user.id}, {$addToSet : { 'followed' : newUserToFollow}}, function(err, r) {
        if(err) return next(err);
        return res.sendStatus(200);
    });
};

exports.unFollow = function(req, res, next) {
    var instagramId = req.params.id || '';
    if(instagramId === '') return res.sendStatus(400);
    db.User.findOneAndUpdate({_id : req.user.id}, {$pull: { 'followed' : {'id':instagramId}}}, function(err, r) {
        if(err) return next(err);
        return res.sendStatus(200);
    });
};

//-----------------------------------------
// Uility functtions
//-----------------------------------------

exports.isUserFollowedAndUpdate = function(userId, profileData) {
    var ObjectId = require('mongoose').Types.ObjectId;
    return db.User.findOneAndUpdate({'_id':new ObjectId(userId), 'followed.id' : profileData.id},
        {$set : { "followed.$.full_name":profileData.full_name, "followed.$.picture":profileData.profile_picture}});
}

exports.isUserFollowed = function(userId, instagramId) {
    var ObjectId = require('mongoose').Types.ObjectId;
    return db.User.count({'_id':new ObjectId(userId), 'followed.id' : instagramId});
};

exports.getFollowedList = function(userId) {
    return db.User.findById(userId, 'followed');
};



