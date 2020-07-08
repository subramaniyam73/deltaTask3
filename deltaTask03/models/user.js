const mongoose = require('mongoose');
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate=require("mongoose-findorcreate");
const Event=require("../models/event.js");
const eventSchema=Event.schema;

const userSchema = new mongoose.Schema ({
  username: String,
  password: String,
  googleId: String,
  refreshToken: String,
  accessToken: String,
  events:[eventSchema],
  otherEvents:[eventSchema],
  invitedEvents:[eventSchema],
  notification:{
    status:Number,
    accepted:[{
      username:String,
      eventId:String
    }],
    requests:[{
      username:String,
      eventId:String
    }]
  }
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User=module.exports=new mongoose.model("user",userSchema);
