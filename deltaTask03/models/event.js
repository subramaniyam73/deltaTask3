const mongoose = require('mongoose');

const eventSchema=new mongoose.Schema({
  date:Date,
  time:String,
  dateString:String,
  deadline:Date,
  deadlineString:String,
  header:String,
  body:String,
  footer:String,
  filename:String,
  objectFit:String,
  members:[{
    username:String,
    extraNumber:Number,
    foodPreferences:String,
    comments:String
  }],
  membersList:[String],
  naList:[String],
  aList:[String],
  host:String,
  hostMail:String,
  colorValue:String,
  fontValue:String,
  private:String,
  authorized:[String],
  template:{
    name:String,
    name2:String,
    address:String,
    date2:Date,
    date2String:String,
    otherDetails:String
  },
  type:String
});
const Event=module.exports=new mongoose.model("event",eventSchema);
