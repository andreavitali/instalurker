var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');

//-----------------------------------------
// Configuration
//-----------------------------------------

// Express
var app = express();
app.set('port', process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 3000);
app.set('ip', process.env.OPENSHIFT_NODEJS_IP || process.env.IP || '127.0.0.1');
app.use(logger('dev', {skip: function (req, res) { return req.originalUrl.indexOf("/api/") === -1 }}));
app.use(favicon(__dirname + '/public/images/favicon.png'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
var auth = require('./routes/auth');
var followed = require('./routes/followed');
var instagram = require('./routes/instagram');

//-----------------------------------------
// API
//-----------------------------------------

// Authentication
app.post('/api/auth/instagram', auth.instagramLogin);

// Followed
app.get('/api/followed', auth.isAuthenticated, followed.followedList);
app.post('/api/followed', auth.isAuthenticated, followed.follow);
app.delete('/api/followed/:id', auth.isAuthenticated, followed.unFollow);

// Instagram related api
app.get('/api/popular', auth.optionalAuthentication, instagram.popular);
app.get('/api/feed', auth.isAuthenticated, instagram.feed);
app.get('/api/search/:q', auth.optionalAuthentication, instagram.search);
app.get('/api/user/:username', auth.optionalAuthentication, instagram.idFromUsernameMiddleware, instagram.user);
app.get('/api/user/:id/:next_max_id', instagram.userMore);
app.get('/api/media/:id', instagram.getMedia);

//-----------------------------------------
// Views and errors
//-----------------------------------------

app.get('*', function(req, res) {
    res.redirect('/#'+req.originalUrl);
    // 404 errors are handled client side by AngularJS
});

// server error handler
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(err.status || 500);
    res.send({
        message: err.message,
        error: (app.get('env') === 'development' ? err.stack : {})
    });
});

// start server
app.listen(app.get('port'), app.get('ip'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});