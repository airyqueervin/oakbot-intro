
// Data structure required to create tickets
// Requires entire object to be present
// {
//   ticket_number: req.body.ticket_number,
//   ticket_status: req.body.ticket_status,
//   ticket_description: req.body.ticket_description
// }

var express = require('express')
var router = express.Router()
var Ticket = require('../dataModels/ticketModel')

// Create TICKET
router.post('/createTicket', (req, res, next) => {
  var newTicketObj = {
    ticket_number: req.body.ticket_number,
    ticket_status: req.body.ticket_status,
    ticket_description: req.body.ticket_description
  }
  Ticket.createTicket(newTicketObj, () => {
    // calback function
    res.send('ticket should be created now')
  })
})

// // Create TICKET
router.get('/getTicket/:ticketNum', (req, res, next) => {
  console.log(req.params.ticketNum)
  Ticket.find({ticket_number: req.params.ticketNum}).exec(function(err, ticket) {
    res.json(ticket)
  });
})


module.exports = router
