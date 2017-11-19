/*
Input: time block start and end, the time stamp of the message, message
OutPut: "scheduled" message, 
Schedule Block 12:00-13:00, UTC -1
Cancel Block 12-2PM
*/

const schedule = require('node-schedule');
const sendTextMessage = require('app').sendTextMessage;
const { createTimeBlock, TimeBlockModel }= require('timeBlockModel')

const parseTime = (timeBlock) => {
  timeBlock = timeBlock.toUpperCase();
  const start = timeBlock.split("-")[0];
  const stop = timeBlock.split("-")[1];
  const startHour = Number(start.split(':')[0]);
  const startMinutes = Number(start.split(':')[1]);
  const stopHour = Number(stop.split(':')[0]);
  const stopMinutes = Number(stop.split(':')[1]);
  return { startHour, startMinutes, stopHour, stopMinutes};
}

const timeZoneDifference = (recipientTimezone, schedulerTimezone) => {
  if (recipientTimezone === schedulerTimezone) {
    return 0;
  }
  const timezones = [-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  let foundRecipient = false;
  let foundScheduler = false;
  let count = 0;
  for (let i = 0; i < timezones.length; i++) {
    if ((timezones[i] === recipientTimezone) && !foundRecipient && !foundScheduler) {
      foundRecipient = true;
    }
    if (timezones[i] === schedulerTimezone && !foundRecipient && !foundScheduler) {
      foundScheduler = true;
    }
    if ((timezones[i] === recipientTimezone) && foundScheduler) {
      return count;
    }
    if ((timezones[i] === schedulerTimezone) && foundRecipient) {
      return -count;
    }
    if (foundScheduler || foundRecipient) {
      count++;
    }
  }
};
// expects timeBlock to be a string, ex: '00:00-14:00', expects uTCTime to a be a string ex '-8'
const blockTime = function(recipientId, timeBlock, uTCTime, message) {
  let schedulerDate = new Date();
  const schedulerTimezone = schedulerDate.getTimezoneOffset() / 60;
  const recipientTimezone = Number(uTCTime);
  const timezoneOffset = timeZoneDifference(schedulerTimezone, recipientTimezone);
  const { startHour, startMinutes, stopHour, stopMinutes} = parseTime(timeBlock);
  const time = new Date()
  const year = time.getFullYear()
  const month = time.getMonth();
  const day = time.getDate();
  const startDate = new Date(year, month, day, timezoneOffset + startHour, startMinutes)
  const stopDate = new Date(year, month, day, timezoneOffset + stopHour, stopMinutes);
  // Creates timeBlock for saving into mongoDB 
  const newTimeBlock = {
    timeblock_started: false,
    timeblock_completed: false,
    timeblock: timeBlock,
    timeblock_ucttime: uTCTime,
    timeblock_recipientID: recipientId  
  };
  // createTimeBlock should return the newly created documents Object ID
  const timeBlockId = createTimeBlock(newTimeBlock);
  // scheduleState sends a "time block start message" and updates the document. 
  const scheduleStart = schedule.scheduleJob(startDate, function(){
    sendTextMessage(recipientId, 'Your timeBlock has started!');
    TimeBlockModel.find('timeblock_id': timeBlockId, function( err , timeBlockDocument) {
      if (err) {
        console.log('Error', err);
      }
      timeBlockDocument.timeblock_started = true;
      TimeBlockModel.save(timeBlockDocument, function(err) {
        if (err) {
          console.log('Error', err);
        }
      })
    })
  });

  const scheduleStop = schedule.scheduleJob(stopDate, function(){
    sendTextMessage(recipientId, 'Your timeBlock has finished!');
    TimeBlockModel.find('timeblock_id': timeBlockId, function( err , timeBlockDocument) {
      if (err) {
        console.log('Error', err);
      }
      timeBlockDocument.timeblock_completed = true;
      TimeBlockModel.save(timeBlockDocument, function(err) {
        if (err) {
          console.log('Error', err);
        }
      })
    })
  });
};
