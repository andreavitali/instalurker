var config = require('../config/config');
var jwt = require('jwt-simple');
var db = require('../config/db.js');
var moment = require('moment');
var request = require('request');

function createToken(user) {
    var payload = {
        exp: moment().add(12, 'months').unix(),
        iat: moment().unix(),
        id: user._id
    };
    return jwt.encode(payload, config.TOKEN_SECRET);
}

//-----------------------------------------
// Authentication middleware
//-----------------------------------------

exports.isAuthenticated = function (req, res, next) {
    if (!(req.headers && req.headers.authorization)) {
        return res.status(401).send({message: 'Please make sure your request has an Authorization header'});
    }

    var token = req.headers.authorization.split(' ')[1];
    try {
        var payload = jwt.decode(token, config.TOKEN_SECRET);
        if (moment().unix() > payload.exp) {
            return res.status(401).send({message: 'Token has expired'});
        }
        db.User.findById(payload.id, function(err, user) {
            if (!user) {
                return res.status(400).send({message: 'User no longer exists'});
            }
            req.user = user;
            next();
        });
    } catch (err) {
        return res.send(500, 'Error parsing token');
    }
};

exports.optionalAuthentication = function (req, res, next) {
    if (req.headers && req.headers.authorization) {
        return exports.isAuthenticated(req, res, next);
    }
    else
        next();
};

//-----------------------------------------
// Instagram OAuth 2.0 login
//-----------------------------------------

exports.instagramLogin = function (req, res) {
    var accessTokenUrl = 'https://api.instagram.com/oauth/access_token';

    var params = {
        client_id: req.body.clientId,
        redirect_uri: req.body.redirectUri,
        client_secret: config.INSTAGRAM_CLIENT_SECRET,
        code: req.body.code,
        grant_type: 'authorization_code'
    };

    // Exchange authorization code for access token
    request.post({url: accessTokenUrl, form: params, json: true}, function (error, response, body) {
        // Create a new user account or return an existing one
        db.User.findOne({ instagramId: body.user.id }, function(err, existingUser) {
            if (existingUser) {
                var token = createToken(existingUser);
                return res.send({ token: token, user: existingUser });
            }

            var user = new db.User({
                instagramId: body.user.id,
                username: body.user.username,
                full_name: body.user.full_name,
                picture: body.user.profile_picture,
                accessToken: body.access_token
            });

            user.save(function() {
                var token = createToken(user);
                res.send({ token: token, user: user });
            });
        });
    });
};