var express = require('express')
var router = express.Router()


  // Currently we don't have any routes to render but we might
  router.get('/email', (req, res, next) => {
    res.render('index')
  })


module.exports = router
