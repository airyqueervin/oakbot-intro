
'use strict';

var blockTime  = require('./scheduler');
var dataSet =   {
        "_id": "5a10bd897a0cfa81624947be",
        "ticket_number": 124,
        "ticket_status": "in progress",
        "ticket_description": "This is the coolest ticket ever, this ticket will change the world",
        "__v": 0
    }
const
  bodyParser = require('body-parser'),
  config = require('./config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),
  request = require('request'),
  sendEmail = require('./emailSender');

  var Mongo = require('mongodb')
  var mongoose = require('mongoose')
  var axios = require('axios');
  var app = express();
  var Ticket = require('./ticketModel')

  mongoose.connect('mongodb://hackattack:hackattack1@ds113606.mlab.com:13606/hackattack', { useMongoClient: true });
  mongoose.Promise = global.Promise;



  app.set('port', config.port);
  app.set('view engine', 'ejs');
  app.use(bodyParser.json({ verify: verifyRequestSignature }));
  app.use(express.static('public'));
  app.use( bodyParser.urlencoded( {
    extended: false
  } ) )




// ---------------------------------
// API ROUTES-----
// // ---------------------------------

app.get('/email', (req, res, next) => {
  res.render('index')
})

// Send Email
app.post('/sendEmailTest', (req, res, next) => {
  console.log('email sent', req.body.ticket_number)
  sendEmail({
    email: 'ankiewicz84@gmail.com',
    ticketNum: req.body.ticket_number,
    ticketStatus: req.body.ticket_status,
    ticket_description: req.body.ticket_description
  })
  res.send('email sent')
})

// Create TICKET
app.post('/createTicket', (req, res, next) => {
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
app.get('/getTicket/:ticketNum', (req, res, next) => {
  Ticket.find({ticket_number: req.params.ticketNum}).exec(function(err, ticket) {
    res.json(ticket)
  });
})


// App Dashboard > Dashboard > click the Show button in the App Secret field
const APP_SECRET = config.appSecret;

// App Dashboard > Webhooks > Edit Subscription > copy whatever random value you decide to use in the Verify Token field
const VALIDATION_TOKEN = config.validationToken;

// App Dashboard > Messenger > Settings > Token Generation > select your page > copy the token that appears
const PAGE_ACCESS_TOKEN = config.pageAccessToken;

// In an early version of this bot, the images were served from the local public/ folder.
// Using an ngrok.io domain to serve images is no longer supported by the Messenger Platform.
// Github Pages provides a simple image hosting solution (and it's free)
const IMG_BASE_PATH = 'https://rodnolan.github.io/posterific-static-images/';

// make sure that everything has been properly configured
if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Verify that the request came from Facebook. You should expect a hash of 
 * the App Secret from your App Dashboard to be present in the x-hub-signature 
 * header field.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // In DEV, log an error. In PROD, throw an error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    console.log("received  %s", signatureHash);
    console.log("exepected %s", expectedHash);
    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}


/*
 * Verify that your validation token matches the one that is sent 
 * from the App Dashboard during the webhook verification check.
 * Only then should you respond to the request with the 
 * challenge that was sent. 
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("[app.get] Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Validation token mismatch.");
    res.sendStatus(403);          
  }  
});


/*
 * All callbacks from Messenger are POST-ed. All events from all subscription 
 * types are sent to the same webhook. 
 * 
 * Subscribe your app to your page to receive callbacks for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 */
app.post('/webhook', function (req, res) {
  console.log("message received!");
  var data = req.body;
  console.log(JSON.stringify(data));
  
  if (data.object == 'page') {
    // send back a 200 within 20 seconds to avoid timeouts
    res.sendStatus(200);
    // entries from multiple pages may be batched in one request
    data.entry.forEach(function(pageEntry) {
      
        // iterate over each messaging event for this page
        pageEntry.messaging.forEach(function(messagingEvent) {
          let propertyNames = Object.keys(messagingEvent);
          console.log("[app.post] Webhook event props: ", propertyNames.join());
  
          if (messagingEvent.message) {
            processMessageFromPage(messagingEvent);
          } else if (messagingEvent.postback) {
            // user replied by tapping a postback button
            processPostbackMessage(messagingEvent);
          } else {
            console.log("[app.post] not prepared to handle this message type.");
          }
  
        });
      });
  

  }
});

/*
 * called when a postback button is tapped 
 * ie. buttons in structured messages and the Get Started button 
 *
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
function processPostbackMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // the developer-defined field you set when you create postback buttons
  var payload = event.postback.payload;

  console.log("[processPostbackMessage] from user (%d) " +
    "on page (%d) " +
    "with payload ('%s') " + 
    "at (%d)", 
    senderID, recipientID, payload, timeOfPostback);

  respondToHelpRequest(senderID, payload);
}

/*
 * Called when a message is sent to your page. 
 * 
 */
function processMessageFromPage(event) {
  var senderID = event.sender.id;
  var pageID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("[processMessageFromPage] user (%d) page (%d) timestamp (%d) and message (%s)", 
    senderID, pageID, timeOfMessage, JSON.stringify(message));

  if (message.quick_reply) {
    console.log("[processMessageFromPage] quick_reply.payload (%s)", 
      message.quick_reply.payload);
    handleQuickReplyResponse(event);
    return;
  }

  // the 'message' object format can vary depending on the kind of message that was received.
  // See: https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
  var messageText = message.text;
  if (messageText) {
    console.log("[processMessageFromPage]: %s", messageText); 
    var lowerCaseMsg = messageText.toLowerCase();
    switch (lowerCaseMsg) {
      case 'help':
        // handle 'help' as a special case
        sendHelpOptionsAsQuickReplies(senderID);
        break;
      case 'ticket':
        sendTicketOptionsAsQuickReplies(senderID);
        break;
      case 'test':
        sendTestOptions(senderID);
        break;
      case '':
        sentTaskComplete(senderID);
        break;
      case 'check block':
        checkBlock(senderID);
        break;
      case 'block time':
        getBlockTime(senderID, messageText);
        break;
      default:
        // otherwise, just echo it back to the sender
        sendTextMessage(senderID, messageText);
    }
  }
}


/*
 * Send a message with the four Quick Reply buttons 
 * 
 */
function sendHelpOptionsAsQuickReplies(recipientId) {
  console.log("[sendHelpOptionsAsQuickReplies] Sending help options menu"); 
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "Select a feature to learn more.",
      quick_replies: [
        { 
          "content_type":"text",
          "title":"Rotation",
          "payload":"QR_ROTATION_1" 
        },
        { 
          "content_type":"text",
          "title":"Photo",
          "payload":"QR_PHOTO_1" 
        },
        { 
          "content_type":"text",
          "title":"Caption",
          "payload":"QR_CAPTION_1" 
        },
        { 
          "content_type":"text",
          "title":"Background",
          "payload":"QR_BACKGROUND_1" 
        }
      ]
    }
  };
  callSendAPI(messageData);
}

function sendTicketOptionsAsQuickReplies(recipientId) {
  console.log("[sendTicketOptionsAsQuickReplies] Sending ticket options menu"); 
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "What do you want to do with your ticket?",
      quick_replies: [
        { 
          "content_type":"text",
          "title":"Update",
          "payload":"TX_UPDATE_1" 
        },
        { 
          "content_type":"text",
          "title":"Check Tickets",
          "payload":"TX_CHECK_1" 
        }
      ]
    }
  };
  callSendAPI(messageData);
}

function sendTestOptions(recipientId) {
  console.log("[sendTest] Sending test options"); 
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "This is a test. Testing 1, 2, 4...."
    }
  };
  callSendAPI(messageData);
}

function sentTaskComplete(recipientId) {
  console.log("[sendTask] Sent Task Complete test options"); 
  // make some sort of api call toe the email
  // notify the PM that the task is complete and move ticket to other portion 
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "Task is complete, GREAT!"
    }
  };
  callSendAPI(messageData);
}

function getBlockTime(recipientId, messsageText) {
  console.log("[getBlockTime] Time blocked off"); 
  // call a function to clock a user out on their calendar. 
  // const time = blockTime('me', '15:11-15:12', '8', 'hey');
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      // text: blockTime('me', '15:11-15:12', '8', 'hey')
      text: "2 hours have been blocked off."
    }
  };
  callSendAPI(messageData);
}

function checkBlock(recipientId, messsageText) {
  console.log("[checkBlock] checkBlock of time"); 
  // call a function to clock a user out on their calendar. 
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "This is the time! 1900 hours"
    }
  };
  callSendAPI(messageData);
}

/*
 * user tapped a Quick Reply button; respond with the appropriate content
 * 
 */
function handleQuickReplyResponse(event) {
  var senderID = event.sender.id;
  var pageID = event.recipient.id;
  var message = event.message;
  var payload = message.quick_reply.payload;
  
  console.log("[handleQuickReplyResponse] Handling quick reply response (%s) from sender (%d) to page (%d) with message (%s)", 
    payload, senderID, pageID, JSON.stringify(message));

  respondToHelpRequest(senderID, payload);

}

/*
 * simplify switching between the two help response implementations 
 */
function respondToHelpRequest(senderID, payload) {
  // set useGenericTemplates to false to send image attachments instead of generic templates
  var useGenericTemplates = true; 
  var messageData = {};
  
  if (useGenericTemplates) {
    // respond to the sender's help request by presenting a carousel-style 
    // set of screenshots of the application in action 
    // each response includes all the content for the requested feature
    // messageData = getGenericTemplates(senderID, payload);
    messageData = getTasks(senderID, payload);
  } else {
    // respond to the help request by presenting one image at a time
    messageData = getImageAttachments(senderID, payload);
  }

  callSendAPI(messageData);  
}


/*
 * This response uses templateElements to present the user with a carousel
 * You send ALL of the content for the selected feature and they swipe 
 * left and right to see it
 *
 */
function getTasks(recipientId, requestForHelpOnFeature) {
  // request({
  //   uri: '/getTicket/:124',
  //   method: 'GET'
  // })
  axios.get('/getTicket/:124')
  .then(data => {
    console.log('THIS IS THE DATA: ', data)
  })
  console.log("[getGenericTemplates] handling help request for %s",
    requestForHelpOnFeature);
  var taskElements = [];
  var sectionButtons = [];
  var status = ['complete', 'in progress', 'not started'];
  function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
  }
  // each button must be of type postback but title
  // and payload are variable depending on which 
  // set of options you want to provide
  var addSectionButton = function(title, payload) {
    sectionButtons.push({
      type: 'postback',
      title: title,
      payload: payload
    });
  }

  // Since there are only four options in total, we will provide 
  // buttons for each of the remaining three with each section. 
  // This provides the user with maximum flexibility to navigate

  switch (requestForHelpOnFeature) {
    case 'TX_UPDATE_1':
      addSectionButton('Update', 'TX_UPDATE_1');
      addSectionButton('View', 'TX_CHECK_1');
      // addSectionButton('Background', 'QR_BACKGROUND_1');
      
      taskElements.push(
        {
          title: dataSet.ticket_number,
          subtitle: dataSet.ticket_status,
          // image_url: IMG_BASE_PATH + "01-rotate-landscape.png",
          buttons: sectionButtons 
        }, 
        {
          title: "Ticket 2",
          subtitle: status[Math.floor(getRandomArbitrary(0,3))],
          // image_url: IMG_BASE_PATH + "02-rotate-portrait.png",
          buttons: sectionButtons 
        }
      );
    break; 
    case 'TX_CHECK_1':
      addSectionButton('Update', 'TX_UPDATE_1');
      addSectionButton('View', 'TX_CHECK_1');
      // addSectionButton('Background', 'QR_BACKGROUND_1');

      taskElements.push(
        {
          title: dataSet.ticket_description,
          subtitle: status[Math.floor(Math.random(0, 2))],
          // image_url: IMG_BASE_PATH + "01-rotate-landscape.png",
          buttons: sectionButtons 
        }, 
        {
          title: "Ticket 2",
          subtitle: "Complete",
          // image_url: IMG_BASE_PATH + "02-rotate-portrait.png",
          buttons: sectionButtons 
        }      
      );
    break; 
  }

  if (taskElements.length < 2) {
    console.error("each template should have at least two elements");
  } 
  
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: taskElements
        }
      }
    }
  };

  return messageData;
}

function getGenericTemplates(recipientId, requestForHelpOnFeature) {
  console.log("[getGenericTemplates] handling help request for %s",
    requestForHelpOnFeature);
  var templateElements = [];
  var sectionButtons = [];
  // each button must be of type postback but title
  // and payload are variable depending on which 
  // set of options you want to provide
  var addSectionButton = function(title, payload) {
    sectionButtons.push({
      type: 'postback',
      title: title,
      payload: payload
    });
  }

  // Since there are only four options in total, we will provide 
  // buttons for each of the remaining three with each section. 
  // This provides the user with maximum flexibility to navigate

  switch (requestForHelpOnFeature) {
    case 'QR_ROTATION_1':
      addSectionButton('Photo', 'QR_PHOTO_1');
      addSectionButton('Caption', 'QR_CAPTION_1');
      addSectionButton('Background', 'QR_BACKGROUND_1');
      
      templateElements.push(
        {
          title: "Rotation",
          subtitle: "portrait mode",
          image_url: IMG_BASE_PATH + "01-rotate-landscape.png",
          buttons: sectionButtons 
        }, 
        {
          title: "Rotation",
          subtitle: "landscape mode",
          image_url: IMG_BASE_PATH + "02-rotate-portrait.png",
          buttons: sectionButtons 
        }
      );
    break; 
    case 'QR_PHOTO_1':
      addSectionButton('Rotation', 'QR_ROTATION_1');
      addSectionButton('Caption', 'QR_CAPTION_1');
      addSectionButton('Background', 'QR_BACKGROUND_1');

      templateElements.push(
        {
          title: "Photo Picker",
          subtitle: "click to start",
          image_url: IMG_BASE_PATH + "03-photo-hover.png",
          buttons: sectionButtons 
        }, 
        {
          title: "Photo Picker",
          subtitle: "Downloads folder",
          image_url: IMG_BASE_PATH + "04-photo-list.png",
          buttons: sectionButtons 
        },
        {
          title: "Photo Picker",
          subtitle: "photo selected",
          image_url: IMG_BASE_PATH + "05-photo-selected.png",
          buttons: sectionButtons 
        }        
      );
    break; 
    case 'QR_CAPTION_1':
      addSectionButton('Rotation', 'QR_ROTATION_1');
      addSectionButton('Photo', 'QR_PHOTO_1');
      addSectionButton('Background', 'QR_BACKGROUND_1');

      templateElements.push(
        {
          title: "Caption",
          subtitle: "click to start",
          image_url: IMG_BASE_PATH + "06-text-hover.png",
          buttons: sectionButtons 
        }, 
        {
          title: "Caption",
          subtitle: "enter text",
          image_url: IMG_BASE_PATH + "07-text-mid-entry.png",
          buttons: sectionButtons 
        },
        {
          title: "Caption",
          subtitle: "click OK",
          image_url: IMG_BASE_PATH + "08-text-entry-done.png",
          buttons: sectionButtons 
        },
        {
          title: "Caption",
          subtitle: "Caption done",
          image_url: IMG_BASE_PATH + "09-text-complete.png",
          buttons: sectionButtons 
        }
      );
    break; 
    case 'QR_BACKGROUND_1':
      addSectionButton('Rotation', 'QR_ROTATION_1');
      addSectionButton('Photo', 'QR_PHOTO_1');
      addSectionButton('Caption', 'QR_CAPTION_1');

      templateElements.push(
        {
          title: "Background Color Picker",
          subtitle: "click to start",
          image_url: IMG_BASE_PATH + "10-background-picker-hover.png",
          buttons: sectionButtons 
        },
        {
          title: "Background Color Picker",
          subtitle: "click current color",
          image_url: IMG_BASE_PATH + "11-background-picker-appears.png",
          buttons: sectionButtons 
        },
        {
          title: "Background Color Picker",
          subtitle: "select new color",
          image_url: IMG_BASE_PATH + "12-background-picker-selection.png",
          buttons: sectionButtons 
        }, 
        {
          title: "Background Color Picker",
          subtitle: "click ok",
          image_url: IMG_BASE_PATH + "13-background-picker-selection-made.png",
          buttons: sectionButtons 
        },
        {
          title: "Background Color Picker",
          subtitle: "color is applied",
          image_url: IMG_BASE_PATH + "14-background-changed.png",
          buttons: sectionButtons 
        }
      );
    break; 
  }

  if (templateElements.length < 2) {
    console.error("each template should have at least two elements");
  }
  
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: templateElements
        }
      }
    }
  };

  return messageData;
}

/*
 * This response uses image attachments to illustrate each step of each feature.
 * This is less flexible because you are limited in the number of options you can
 * provide for the user. This technique is best for cases where the content should
 * be consumed in a strict linear order.
 *
 */
function getImageAttachments(recipientId, helpRequestType) {
  var textToSend = '';
  var quickReplies = [
    {
      "content_type":"text",
      "title":"Restart",
      "payload":"QR_RESTART"
    }, // this option should always be present because it allows the user to start over
    {
      "content_type":"text",
      "title":"Continue",
      "payload":""
    } // the Continue option only makes sense if there is more content to show 
      // remove this option when you are at the end of a branch in the content tree
      // i.e.: when you are showing the last message for the selected feature
  ];
  
  // to send an image attachment in a message, just set the payload property of this attachment object
  // if the payload property is defined, this will be added to the message before it is sent
  var attachment = {
    "type": "image",
    "payload": ""
  };

  switch(helpRequestType) {
    case 'QR_RESTART' :
      sendHelpOptionsAsQuickReplies(recipientId);
      return;
    break;
    
    // the Rotation feature
    case 'QR_ROTATION_1' :
      textToSend = 'Click the Rotate button to toggle the poster\'s orientation between landscape and portrait mode.';
      quickReplies[1].payload = "QR_ROTATION_2";
    break; 
    case 'QR_ROTATION_2' :
      // 1 of 2 (portrait, landscape)
      attachment.payload = {
        url: IMG_BASE_PATH + "01-rotate-landscape.png"
      }
      quickReplies[1].payload = "QR_ROTATION_3";
    break; 
    case 'QR_ROTATION_3' :
      // 2 of 2 (portrait, landscape)
      attachment.payload = {
        url: IMG_BASE_PATH + "02-rotate-portrait.png"
      }
      quickReplies.pop();
      quickReplies[0].title = "Explore another feature";
    break; 
    // the Rotation feature


    // the Photo feature
    case 'QR_PHOTO_1' :
      textToSend = 'Click the Photo button to select an image to use on your poster. We recommend visiting https://unsplash.com/random from your device to seed your Downloads folder with some images before you get started.';
      quickReplies[1].payload = "QR_PHOTO_2";
    break; 
    case 'QR_PHOTO_2' :
      // 1 of 3 (placeholder image, Downloads folder, poster with image)
      attachment.payload = {
        url: IMG_BASE_PATH + "03-photo-hover.png"
      }
      quickReplies[1].payload = "QR_PHOTO_3";
    break; 
    case 'QR_PHOTO_3' :
      // 2 of 3 (placeholder image, Downloads folder, poster with image)
      attachment.payload = {
        url: IMG_BASE_PATH + "04-photo-list.png"
      }
      quickReplies[1].payload = "QR_PHOTO_4";
    break; 
    case 'QR_PHOTO_4' :
      // 3 of 3 (placeholder image, Downloads folder, poster with image)
      attachment.payload = {
        url: IMG_BASE_PATH + "05-photo-selected.png"
      }
      quickReplies.pop();
      quickReplies[0].title = "Explore another feature";
    break; 
    // the Photo feature


    // the Caption feature
    case 'QR_CAPTION_1' :
      textToSend = 'Click the Text button to set the caption that appears at the bottom of the poster.';
      quickReplies[1].payload = "QR_CAPTION_2";
    break; 
    case 'QR_CAPTION_2' :
      // 1 of 4 (hover, entering caption, mid-edit, poster with new caption)
      attachment.payload = {
        url: IMG_BASE_PATH + "06-text-hover.png"
      }
      quickReplies[1].payload = "QR_CAPTION_3";
    break; 
    case 'QR_CAPTION_3' :
      // 2 of 4: (hover, entering caption, mid-edit, poster with new caption
      attachment.payload = {
        url: IMG_BASE_PATH + "07-text-mid-entry.png"
      }
      quickReplies[1].payload = "QR_CAPTION_4";
    break; 
    case 'QR_CAPTION_4' :
      // 3 of 4 (hover, entering caption, mid-edit, poster with new caption)
      attachment.payload = {
        url: IMG_BASE_PATH + "08-text-entry-done.png"
      }
      quickReplies[1].payload = "QR_CAPTION_5";
    break; 
    case 'QR_CAPTION_5' :
      // 4 of 4 (hover, entering caption, mid-edit, poster with new caption)
      attachment.payload = {
        url: IMG_BASE_PATH + "09-text-complete.png"
      }
      quickReplies.pop();
      quickReplies[0].title = "Explore another feature";
    break; 
    // the Caption feature



    // the Color Picker feature
    case 'QR_BACKGROUND_1' :
      textToSend = 'Click the Background button to select a background color for your poster.';
      quickReplies[1].payload = "QR_BACKGROUND_2";
    break; 
    case 'QR_BACKGROUND_2' :
      // 1 of 5 (hover, entering caption, mid-edit, poster with new caption)
      attachment.payload = {
        url: IMG_BASE_PATH + "10-background-picker-hover.png"
      }
      quickReplies[1].payload = "QR_BACKGROUND_3";
    break; 
    case 'QR_BACKGROUND_3' :
      // 2 of 5 (hover, entering caption, mid-edit, poster with new caption)
      attachment.payload = {
        url: IMG_BASE_PATH + "11-background-picker-appears.png"
      }
      quickReplies[1].payload = "QR_BACKGROUND_4";
    break; 
    case 'QR_BACKGROUND_4' :
      // 3 of 5 (hover, entering caption, mid-edit, poster with new caption)
      attachment.payload = {
        url: IMG_BASE_PATH + "12-background-picker-selection.png"
      }
      quickReplies[1].payload = "QR_BACKGROUND_5";
    break; 
    case 'QR_BACKGROUND_5' :
      // 4 of 5 (hover, entering caption, mid-edit, poster with new caption)
      attachment.payload = {
        url: IMG_BASE_PATH + "13-background-picker-selection-made.png"
      }
      quickReplies[1].payload = "QR_BACKGROUND_6";
    break; 
    case 'QR_BACKGROUND_6' :
      // 5 of 5 (hover, entering caption, mid-edit, poster with new caption)
      attachment.payload = {
        url: IMG_BASE_PATH + "14-background-changed.png"
      }
      quickReplies.pop();
      quickReplies[0].title = "Explore another feature";
    break; 
    // the Color Picker feature

    default : 
      sendHelpOptionsAsQuickReplies(recipientId);
      return;

    break;
  }

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: textToSend,
      quick_replies: quickReplies
    },
  };
  if (attachment.payload !== "") {
    messageData.message.attachment = attachment;
    // text can not be specified when you're sending an attachment
    delete messageData.message.text;
  }

  return messageData;
}


/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText // utf-8, 640-character max
    }
  };
  console.log("[sendTextMessage] %s", JSON.stringify(messageData));
  callSendAPI(messageData);
}

/*
 * Call the Send API. If the call succeeds, the 
 * message id is returned in the response.
 *
 */
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("[callSendAPI] message id %s sent to recipient %s", 
          messageId, recipientId);
      } else {
        console.log("[callSendAPI] called Send API for recipient %s", 
          recipientId);
      }
    } else {
      console.error("[callSendAPI] Send API call failed", response.statusCode, response.statusMessage, body.error);
    }
  });  
}


/*
 * Start your server
 */
app.listen(app.get('port'), function() {
  console.log('[app.listen] Node app is running on port', app.get('port'));
});

module.exports = app;