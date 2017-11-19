const mongoose = require('mongoose')


const Schema = mongoose.Schema
const ObjectId = Schema.ObjectId

const TimeBlockSchema = new Schema( {
  timeblock_id: ObjectId,
  timeblock_started: Boolean,
  timeblock_completed: Boolean,
  timeblock: String,
  timeblock_ucttime: String,
  timeblock_recipientID: String
})

const TimeBlockModel = mongoose.model('TimeBlockModel', TimeBlockSchema);
module.exports.TimeBlockModel = TimeBlockModel;

module.exports.createTimeBlock = (timeBlockObject) => {

  console.log('timeBlock object created', timeBlockObject)
  var timeBlockCreated = new TimeBlockModel(timeBlockObject);
  return timeBlockCreated.save(function (err, timeBlock) {
    if (err) {
      console.log(err);
    } else {
      return timeBlock.timeblock_id;
    }
  });
}

module.exports.findTimeBlocks = (recipientId) => {
  return TimeBlockModel.find({'timeblock_recipientID': recipientId, 'timeblock_started': false }, function(err, timeBlock) {
    if (err) {
      console.log(err);
    }
    return timeBlock
  })
}