'use strict';

  var bodyParser = require('body-parser')
  var config = require('./config')
  var crypto = require('crypto')
  var express = require('express')
  var https = require('https')
  var request = require('request')
  var Mongo = require('mongodb')
  var mongoose = require('mongoose')

  var app = express();

  // Chat Bot routes
  var chatbotRouter = './chatbotRouter/'

  // API Routes
  var emailClient = './emailClient'
  var ticketManager = './ticketManager'
  var renderRoutes = './renderRoutes'

  mongoose.connect('mongodb://hackattack:hackattack1@ds113606.mlab.com:13606/hackattack', { useMongoClient: true })
  mongoose.Promise = global.Promise;

  app.set('port', config.port)
  app.set('view engine', 'ejs')

  app.use( express.static('public') )
  app.use( bodyParser.urlencoded({ extended: false }))

  // ---------------------------------
  // API ROUTES-----
  // // ---------------------------------

  // Chatbot API
  // This route should host all of the chat bot logic
  app.use('/', chatbotRouter)

// API Routes for shipping emails
// currently we only have one email to ship
  app.use('/', emailClient)
  app.use('/', ticketManager)

// Routes that need to be rendered
  app.use('/', renderRoutes)

  /*
   * Start your server
   */
  app.listen(app.get('port'), function() {
    console.log('[app.listen] Node app is running on port', app.get('port'));
  });

  module.exports = app;
