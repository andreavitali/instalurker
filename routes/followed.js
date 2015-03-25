var config = require('../config/config');
var db = require('../config/db.js');

//-----------------------------------------
// API
//-----------------------------------------

exports.followedList = function(req, res, next) {
    db.User.findById(req.user.id).exec(function(err, user){
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

exports.isUserFollowed = function(currentUserId, instagramId) {
    var ObjectId = require('mongoose').Types.ObjectId;
    return db.User.count({'_id':new ObjectId(currentUserId), 'followed.id' : instagramId});
};



