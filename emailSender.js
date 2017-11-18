'use strict';
const nodemailer = require('nodemailer');

function sendEmail (emailSendTo) {

      // Generate test SMTP service account from ethereal.email
      // Only needed if you don't have a real mail account for testing
      nodemailer.createTestAccount((err, account) => {

          // create reusable transporter object using the default SMTP transport
          let transporter = nodemailer.createTransport({
              service: "gmail",
              host: "smtp.gmail.com",
              secure: false, // true for 465, false for other ports
              auth: {
                  user: 'hackAttackHackathon@gmail.com', // generated ethereal user
                  pass: 'hackAttackHackathon123'  // generated ethereal password
              }
          });

          //   email: 'ankiewicz84@gmail.com',
            // ticketNum: 'TICKET-' + req.body.ticket_number,
            // ticketStatus: req.body.ticket_status,
            // ticket_description: req.body.ticket_description
          // setup email data with unicode symbols
          let mailOptions = {
              from: '"Hack-Attack👻" <hackattackhackathon@gmail.com>', // sender address
              to: emailSendTo.email, // list of receivers
              subject: 'Hello ✔', // Subject line
              text: 'Hello world?', // plain text body
              html: `<b> Ticket: ${emailSendTo.ticketNum}</b> has been completed<br/>
              ${emailSendTo.ticketNum} <br/>
              ${emailSendTo.ticketStatus} <br/>
              ${emailSendTo.ticket_description} <br/>
              ` // html body
          };

          // send mail with defined transport object
          transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                  return console.log(error);
              }
              return res.send('Email Sent')
              // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@blurdybloop.com>
              // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
          });
      });
}

module.exports = sendEmail
