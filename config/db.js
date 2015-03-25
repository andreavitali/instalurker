var mongoose = require('mongoose');
var config = require('./config');

// Connection
mongoose.connect(config.MONGODB_URI, {}, function(err, res){
   if(err) {
       console.log("Connection to MongoDB refused");
       console.error(err);
   }
   else {
       console.log("Connection to MongoDB successful");
   }
});

// User Schema
var followedUserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    full_name: String,
    picture: String,
    fromDate: { type: Date, default: Date.now }
}, {_id:false});

var userSchema = new mongoose.Schema({
    instagramId:  String,
    username: String,
    full_name: String,
    picture: String,
    accessToken: String,
    followed: [followedUserSchema]
});

exports.User = mongoose.model('User', userSchema);