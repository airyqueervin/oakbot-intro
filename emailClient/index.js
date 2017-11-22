// Data structure required for shipping email
// {
//   ticket_number: 000,
//   ticket_status: '',
//   ticket_description: ''
// }

var express = require('express')
var router = express.Router()
var sendEmail = require('./emailSender');

// Send Email
router.post('/sendEmailTest', (req, res, next) => {
  console.log('email sent', req.body.ticket_number)
  sendEmail({
    email: 'ankiewicz84@gmail.com',
    ticketNum: req.body.ticket_number,
    ticketStatus: req.body.ticket_status,
    ticket_description: req.body.ticket_description
  })
  res.send('email sent')
})


module.exports = router
