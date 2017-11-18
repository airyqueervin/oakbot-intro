var mongoose = require('mongoose')


var Schema = mongoose.Schema
var ObjectId = Schema.ObjectId

var Ticket = new Schema( {
  ticket_id: ObjectId,
  ticket_number: Number,
  ticket_status: String,
  ticket_description: String
})

var Ticket = mongoose.model('Ticket', Ticket);
module.exports = Ticket

module.exports.createTicket = (ticketObj) => {

  console.log('ticket object created', ticketObj)
  var ticketCreated = new Ticket(ticketObj);
  ticketCreated.save(function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log('meow');
    }
  });
}
