var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var dotenv = require('dotenv');
dotenv.config();


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var botRouter = require('./routes/bot');
var mongoose = require('mongoose');
var session = require('express-session');
var fileUpload = require('express-fileupload');
var { registerOauth } = require('express-oauth-any');


var mongoDB = process.env.MONGO_CONNECTION || 'mongodb://127.0.0.1/topcommitsdb4';
mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true}, err => console.log(err));

var app = express();

var options = {
  github : {
    key: process.env.GITHUB_KEY,
    secret: process.env.GITHUB_SECRET,
  }
}

app.use(session({ secret: "yoursecret"}))
registerOauth(app, options);


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/github-bot', botRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
