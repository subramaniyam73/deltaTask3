const express= require('express');
const router = express.Router();
const Event=require('../models/event');
const User = require('../models/user');
const {google} = require('googleapis');

const oAuth2Client = new google.auth.OAuth2(
  "754659758577-m77g48hnuc7o474he96bbu2ikifl2v6q.apps.googleusercontent.com",
  "jiXtebaE56AOtHmFG6xYM94P"
);
const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

router.get("/",function(req,res){
    res.render("home");

});

router.get("/details",function(req,res){
    if(!req.isAuthenticated()){
      res.redirect("/");
    }
});

router.get("/details2",function(req,res){
    if(!req.isAuthenticated()){
      res.redirect("/");
    }
});

router.get("/notifications",function(req,res){
    if(req.isAuthenticated())
    {
      User.findById(req.user._id,function(err,resultUser){
        res.render("notifications",{notification:resultUser.notification});
      });
    }
    else
    {
      res.redirect("/");
    }
});

router.get("/events/:eventId/attendance",function(req,res){
  if(req.isAuthenticated())
  {
    Event.findById(req.params.eventId,
      (err,foundEvent)=>{
        User.findById(req.user._id,
          (err1,foundUser)=>{
            if(!err&&foundUser.username==foundEvent.hostMail){
              res.render("attendance",{event:foundEvent,notification:foundUser.notification});
            }
            else{
              res.render("message",{message:"Enter the correct URL !",notification:foundUser.notification});
            }
          }
        );
      }
    );
  }
  else {
    res.redirect("/");
  }
});

router.get("/events/:eventId",function(req,res){
  if(req.isAuthenticated())
  {
    Event.findById(req.params.eventId,
      (err,foundEvent)=>{
        User.findById(req.user._id,
          (err1,foundUser)=>{
            if(!err){
              if(foundEvent.private=="false")
              {
                if(Date.now()<=foundEvent.deadline)
                {res.render("eventPage",{event:foundEvent,notification:foundUser.notification});}
                else
                {
                  let message="Deadline of the invitation has ended !";
                  res.render("message",{message:foundEvent,notification:foundUser.notification});
                }
              }
              else if(foundEvent.private=="true"&&foundEvent.authorized.includes(req.user.username))
              {
                if(Date.now()<=foundEvent.deadline)
                {res.render("eventPage",{event:foundEvent,notification:foundUser.notification});}
                else
                {
                  let message="Deadline of the invitation has ended !";
                  res.render("message",{message:message,notification:foundUser.notification});
                }
              }
              else
              {
                let message="Private Event! You are unauthorized.";
                res.render("message",{message:message,notification:foundUser.notification});
              }
            }
            else {
              res.render("message",{message:"Enter the correct URL !",notification:foundUser.notification});
            }
          }
        );
      }
    );

  }
  else
  {
    res.redirect("/");
  }
});

router.post("/invitationReply",function(req,res){
    if(req.body.replyValue=="Accept")
    {
      Event.findById(req.body.eventId,function(err,result){
        if(!result.membersList.includes(req.user._id)){
          result.members.push({
            username:req.user.username,
            foodPreferences:req.body.foodPreferences,
            extraNumber:req.body.extraNumber,
            comments:req.body.comments
          });
          result.membersList.push(req.user._id);
          result.naList.push(req.user.username);
          result.save();
          User.findById(req.user._id,function(err,currentUser){
            currentUser.otherEvents.push(result);
            User.updateOne({_id:req.user._id},
              {$pull:{invitedEvents:{_id:result._id}}},
              (err)=>{}
            );
            currentUser.save();
            User.findById(result.host,function(err,hostUser){
              let tempValue={
                username:req.user.username,
                eventId:result._id
              };
              hostUser.notification.status=1;
              hostUser.notification.accepted.push(tempValue);
              hostUser.save();
            });

            const event = {
              summary: result.header,
              description: result.body,
              start: {
                dateTime: result.date,
              },
              end: {
                dateTime: result.date,
              },
              source:{
                title:"Delta Task 3-Invitations App",
                url:`http://localhost:3000/events/${result._id}`
              }
  
            };
            oAuth2Client.setCredentials({
              refresh_token:currentUser.refreshToken,
              access_token:currentUser.accessToken
            });
            calendar.events.insert(
              { calendarId: 'primary', resource: event },
              err => {
                if (err) return console.error('Error Creating Calender Event:', err)
  
                return console.log('Calendar event successfully created.')
              }
            );
          });
          let message="Invitation accepted successfully!";
          User.findById(req.user._id,
            (err,foundUser)=>{
              res.render("message",{message:message,notification:foundUser.notification});
            }
          );
        }
        else
        {
          let message="You have already accepted the invitation!";
          User.findById(req.user._id,
            (err,foundUser)=>{
              res.render("message",{message:message,notification:foundUser.notification});
            }
          );
        }
      });
    }
    else if(req.body.replyValue=="Reject")
    {
      Event.findById(req.body.eventId,function(err,resultEvent){
        if(req.user._id!==resultEvent.host)
        {
          Event.updateOne({_id:req.body.eventId},
            {$pull:{members:{username:req.user.username}},$pull:{membersList:req.user._id}},
            (err)=>{}

          );
          User.updateOne({_id:req.user._id},
            {$pull:{otherEvents:{_id:resultEvent._id}}},
            (err)=>{}
          );
          User.updateOne({_id:req.user._id},
            {$pull:{invitedEvents:{_id:resultEvent._id}}},
            (err)=>{}
          );

          let message="Invitation has been rejected.";
          User.findById(req.user._id,
            (err,foundUser)=>{
              res.render("message",{message:message,notification:foundUser.notification});
            }
          );        }
        else
        {
          let message="You are the host.";
          User.findById(req.user._id,
            (err,foundUser)=>{
              res.render("message",{message:message,notification:foundUser.notification});
            }
          );        }
      });
    }
  });

router.post("/newMemberDetails",function(req,res){
    let username=req.body.userDetail;
    let eventDetail=req.body.eventDetail;
    Event.findOne({_id:eventDetail},function(err,resultEvent){
      resultEvent.members.forEach(function(current){
        if(current.username==username)
        {
          User.findById(req.user._id,
            (err,foundUser)=>{
              res.render("details",{event:current,notification:foundUser.notification});
            }
          );
        }
      });
    });
});

router.post("/memberDetails",function(req,res){
    let eventId=req.body.eventDetail;
    Event.findById(eventId,function(err,resultEvent){
      if(resultEvent)
      {
        User.findById(req.user._id,
          (err,foundUser)=>{
            res.render("details2",{membersArray:resultEvent.members,notification:foundUser.notification});
          }
        );
      }
      else
      {
        let message="Event not found!";
        User.findById(req.user._id,
          (err,foundUser)=>{
            res.render("message",{message:message,notification:foundUser.notification});
          }
        );
      }
    });
});

router.post("/clearNotifications",function(req,res){
    User.findById(req.user._id,function(err,foundUser){
      foundUser.notification.requests=[];
      foundUser.notification.accepted=[];
      foundUser.save();
    });
    res.redirect("/notifications");
});

router.post("/updateAttendance",function(req,res){
  var selected=req.body.selected;
  Event.updateOne({_id:req.body.eventId},
    {$pull:{naList:{$in:selected}}},
    (err)=>{}
  );
  Event.updateOne({_id:req.body.eventId},
    {$push:{aList:{$each:selected}}},
    (err)=>{}
  );
  res.redirect("/events/"+req.body.eventId+"/attendance");
});

module.exports = router;
