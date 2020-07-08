const express= require('express');
const router = express.Router();
const Event=require('../models/event');
const User=require('../models/user');

router.get("/", function(req, res){
    if (req.isAuthenticated()){
      User.findOne({username:req.user.username},function(err,result){
        res.render("dashBoard",{eventsArray:result.events,otherEventsArray:result.otherEvents,invitedEventsArray:result.invitedEvents,notification:result.notification,googleId:result.googleId});
      });

    } else {
      res.redirect("/");
    }
});

module.exports = router;
