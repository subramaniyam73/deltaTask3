//jshint esversion:6
const ejs=require("ejs");
const bodyParser=require("body-parser");
const express=require("express");
const mongoose=require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const app=express();

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(session({
  secret: "My little secret.This can be any string.Check documentation!",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{ useNewUrlParser: true,useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

const eventSchema=new mongoose.Schema({
  date:Date,
  dateString:String,
  deadline:Date,
  deadlineString:String,
  header:String,
  body:String,
  footer:String,
  members:[{
    username:String,
    extraNumber:Number,
    foodPreferences:String,
    comments:String
  }],
  membersList:[String],
  host:String,
  hostMail:String,
  colorValue:String,
  fontValue:String,
  private:String,
  authorized:[String],
  template:{
    name:String,
    name2:String,
    time:String,
    address:String,
    date2:Date,
    date2String:String,
    otherDetails:String
  },
  type:String
});
const Event=new mongoose.model("event",eventSchema);

const userSchema = new mongoose.Schema ({
  username: String,
  password: String,
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
const User=new mongoose.model("user",userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.listen(3000,function(req,res){
  console.log("server started !");
});

app.get("/",function(req,res){
  res.render("home");

});

app.get("/dashBoard", function(req, res){
  if (req.isAuthenticated()){
    User.findById(req.user.id,function(err,result){
      res.render("dashBoard",{eventsArray:req.user.events,otherEventsArray:req.user.otherEvents,invitedEventsArray:req.user.invitedEvents,notification:req.user.notification});
    });
    Event.find({},function(err,result){
      result.forEach(function(current){
        app.get("/"+current._id,function(req,res){
          if(req.isAuthenticated())
          {
            if(current.private=="false")
            {
              if(Date.now()<=current.deadline)
              {res.render("eventPage",{event:current,notification:req.user.notification});}
              else
              {
                let message="Deadline of the invitation has ended !";
                res.render("message",{message:message,notification:req.user.notification});
              }
            }
            else if(current.private=="true"&&current.authorized.includes(req.user.username))
            {
              if(Date.now()<=current.deadline)
              {res.render("eventPage",{event:current,notification:req.user.notification});}
              else
              {
                let message="Deadline of the invitation has ended !";
                res.render("message",{message:message,notification:req.user.notification});
              }
            }
            else
            {
              let message="Private Event! You are unauthorized.";
              res.render("message",{message:message,notification:req.user.notification});
            }

          }
          else
          {
            res.render("login2",{redirectValue:current._id});
          }
        });
      });
    });

  } else {
    res.redirect("/");
  }
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit",{colorValue:"",notification:req.user.notification,template:""});
    }
  else {
    res.redirect("/");
  }
});

app.get("/sendInvitation",function(req,res){
  if(req.isAuthenticated()){
    res.render("sendInvitation",{eventsArray:req.user.events});
  }else{
    res.redirect("/");
  }
});

app.get("/details",function(req,res){
  if(!req.isAuthenticated()){
    res.redirect("/");
  }
});

app.get("/details2",function(req,res){
  if(!req.isAuthenticated()){
    res.redirect("/");
  }
});

app.get("/notifications",function(req,res){
  if(req.isAuthenticated())
  {
    res.render("notifications",{notification:req.user.notification});
  }
  else
  {
    res.redirect("/");
  }
});

app.post("/sendInvitation",function(req,res){
  let searchUser=req.body.searchUser;
  let selectedEvent=req.body.selectedEvent;
  User.findOne({username:searchUser},function(err,foundUser){
    if(foundUser){
      Event.findById(selectedEvent,function(err,resultEvent){
        if(!resultEvent.authorized.includes(foundUser._id))
        {
          foundUser.invitedEvents.push(resultEvent);
          foundUser.save();
          resultEvent.authorized.push(foundUser._id);
          resultEvent.save();
          let message="Invite sent successfully!";
          res.render("message",{message:message,notification:req.user.notification});
        }
        else
        {
          res.redirect("/sendInvitation");
        }
      });

    }else{
      let message="User not found!";
      res.render("message",{message:message,notification:req.user.notification});
      //send a message.ejs for all messages
    }
  });
});

app.post("/register",function(req,res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      // res.redirect("/register");
      res.render("message",{message:"User already registered!",notification:{requests:[],accepted:[]}});
    }
    else {
      passport.authenticate("local")(req, res, function(){
      res.redirect("/dashBoard");
      });
    }
  });
});

app.post("/login",function(req,res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
      // res.render("message",{message:"Enter valid User credentials!",notification:{requests:[],accepted:[]}});

    }
    else {
      passport.authenticate("local")(req, res, function(){
      res.redirect("/dashBoard");
    });

    }
  });
});

app.post("/submit",function(req,res){
  User.findById(req.user.id,
    function(err,result)
    {
      let notFound=[];
        // let usersArray=[];
        // for(let j=0;j<req.body.numberOfUsers;j++){
        //   console.log(req.body.user[j]);
        //   usersArray.push(req.body.user[j]);
        // }
        // console.log(usersArray);
        console.log(req.body);
        let tempEvent=new Event({
          date:req.body.date,
          deadline:req.body.deadline,
          header:req.body.header,
          body:req.body.body,
          footer:req.body.footer,
          host:req.user._id,
          hostMail:req.user.username,
          colorValue:req.body.colorValue,
          fontValue:req.body.fontValue,
          private:req.body.private,
          authorized:req.body.user
        });
        tempEvent.members.push({
          username:req.user.username,
          comments:"",
          foodPreferences:"",
          extraNumber:0
        });
        tempEvent.membersList.push(req.user.id);
        tempEvent.authorized.push(req.user.username);
        let options = { year: 'numeric', month: 'long', day: 'numeric' };
        tempEvent.dateString=tempEvent.date.toLocaleDateString("en-US",options);
        tempEvent.deadlineString=tempEvent.deadline.toLocaleDateString("en-US",options);
        if(req.body.template=="1"){
          tempEvent.header="Wedding";
          tempEvent.template.name=req.body.name;
          tempEvent.template.name2=req.body.name2;
          tempEvent.template.address=req.body.address;
          tempEvent.template.time=req.body.time;
          tempEvent.template.otherDetails=req.body.otherDetails;
          tempEvent.type="1";
        }else if(req.body.template=="2"){
          tempEvent.header="Birthday";
          tempEvent.template.name=req.body.name;
          tempEvent.template.address=req.body.address;
          tempEvent.template.time=req.body.time;
          tempEvent.template.otherDetails=req.body.otherDetails;
          tempEvent.type="2";
        }else if(req.body.template=="3"){
          tempEvent.header="Funeral";
          tempEvent.template.date2=req.body.date2;
          tempEvent.template.date2String=tempEvent.template.date2.toLocaleDateString("en-US",{ year: 'numeric', month: 'long', day: 'numeric' });
          tempEvent.template.name=req.body.name;
          tempEvent.template.address=req.body.address;
          tempEvent.template.time=req.body.time;
          tempEvent.template.otherDetails=req.body.otherDetails;
          tempEvent.type="3";
        }else{
          tempEvent.type="0";
        }
        tempEvent.save();
        result.events.push(tempEvent);
        result.save();
        // sendInvitations(req.body.user,tempEvent);
        (req.body.user).forEach(function(currentName){
          User.findOne({username:currentName},function(err,foundUser){
            if(foundUser)
            {
              let tempValue={
                username:req.user.username,
                eventId:tempEvent._id
              };
              foundUser.notification.status=1;
              foundUser.notification.requests.push(tempValue);
              foundUser.invitedEvents.push(tempEvent);
              foundUser.save();
            }
            else
            {
              notFound.push(currentName);
              console.log(currentName+"-User not found");
            }

          });
        });
        if(notFound.length!=0)
        {
          let message="Users not found:<br>";
          notFound.forEach((eachh)=>{message=message.concat(eachh+"<br>");});
          res.render("message",{message:message,notification:req.user.notification});
          notFound=[];
        }
        else
        {
          res.redirect("/dashBoard");
          // res.render("message",{message:"Invitation created successfully!",notification:req.user.notification});
        }


    }
  );
});

app.post("/login2",function(req,res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    }
    else {
      passport.authenticate("local")(req, res, function(){
      Event.findById(req.body.redirectValue,function(err,result){
        // res.render("eventPage",{event:result,notification:req.user.notification});
        res.redirect("/"+req.body.redirectValue);
      });

    });

    }
  });
});

app.post("/reply",function(req,res){
  if(req.body.replyValue=="Accept")
  {
    Event.findById(req.body.eventId,function(err,result){
      if(!result.membersList.includes(req.user.id)){
        result.members.push({
          username:req.user.username,
          foodPreferences:req.body.foodPreferences,
          extraNumber:req.body.extraNumber,
          comments:req.body.comments
        });
        result.membersList.push(req.user.id);
        result.save();
        User.findById(req.user.id,function(err,currentUser){
          // if(currentUser.otherEvents.includes(req.body.eventId))
          currentUser.otherEvents.push(result);
          User.updateOne({_id:req.user.id},
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
          // for(let j=0;j<currentUser.invitedEvents.length;j++){
          //   if(currentUser.invitedEvents[j]._id==result._id){
          //     currentUser.invitedEvents.splice(j,1);
          //
          //     break;
          //   }
          // }

        });
        let message="Invitation accepted successfully!";
        res.render("message",{message:message,notification:req.user.notification});
      }
      else
      {
        let message="You have already accepted the invitation!";
        res.render("message",{message:message,notification:req.user.notification});
      }
    });
  }
  else if(req.body.replyValue=="Reject")
  {
    Event.findById(req.body.eventId,function(err,resultEvent){
      if(req.user.id!==resultEvent.host)
      {
        Event.updateOne({_id:req.body.eventId},
          {$pull:{members:{username:req.user.username}},$pull:{membersList:req.user._id}},
          (err)=>{}

        );
        User.updateOne({_id:req.user.id},
          {$pull:{otherEvents:{_id:resultEvent._id}}},
          (err)=>{}
        );
        User.updateOne({_id:req.user.id},
          {$pull:{invitedEvents:{_id:resultEvent._id}}},
          (err)=>{}
        );
        // Event.updateOne({_id:req.body.eventId},
        //   {$pull:{authorized:req.user.username}},
        //   (err)=>{}
        //
        // );

        let message="Invitation has been rejected.";
        res.render("message",{message:message,notification:req.user.notification});
      }
      else
      {
        let message="You are the host.";
        res.render("message",{message:message,notification:req.user.notification});
      }
    });
  }
});

var fontArray=["'Roboto',sans-serif","'Kelly Slab', cursive","'Righteous', cursive","'Lobster Two', cursive","'Dancing Script', cursive","'Bungee', cursive","'Michroma', sans-serif","'Satisfy', cursive","'Shojumaru', cursive","'Sriracha', cursive"];

app.post("/applyStyle",function(req,res){
  if(req.isAuthenticated())
  {
    let tempFont=fontArray[Number(req.body.fontValue)];
    res.render("submit",{colorValue:req.body.colorValue,fontValue:tempFont,numberOfUsers:req.body.numberOfUsers,notification:req.user.notification,template:req.body.template});
  }
  else
  {
    res.redirect("/");
  }
});

app.post("/details",function(req,res){
  let username=req.body.userDetail;
  let eventDetail=req.body.eventDetail;
  Event.findOne({_id:eventDetail},function(err,resultEvent){
    resultEvent.members.forEach(function(current){
      if(current.username==username)
      {
        res.render("details",{event:current,notification:req.user.notification});
      }
    });
  });
});

app.post("/details2",function(req,res){
  let eventId=req.body.eventDetail;
  Event.findById(eventId,function(err,resultEvent){
    if(resultEvent)
    {
      res.render("details2",{membersArray:resultEvent.members,notification:req.user.notification});
    }
    else
    {
      let message="Event not found!";
      res.render("message",{message:message,notification:req.user.notification});
    }
  });
});

app.post("/clearAll",function(req,res){
  User.findById(req.user.id,function(err,foundUser){
    foundUser.notification.requests=[];
    foundUser.notification.accepted=[];
    foundUser.save();
  });
  res.redirect("/notifications");
});

Event.find({},function(err,result){
  result.forEach(function(current){
    app.get("/"+current._id,function(req,res){
      if(req.isAuthenticated())
      {
        if(current.private=="false")
        {
          if(Date.now()<=current.deadline)
          {res.render("eventPage",{event:current,notification:req.user.notification});}
          else
          {
            let message="Deadline of the invitation has ended !";
            res.render("message",{message:message,notification:req.user.notification});
          }
        }
        else if(current.private=="true"&&current.authorized.includes(req.user.username))
        {
          if(Date.now()<=current.deadline)
          {res.render("eventPage",{event:current,notification:req.user.notification});}
          else
          {
            let message="Deadline of the invitation has ended !";
            res.render("message",{message:message,notification:req.user.notification});
          }
        }
        else
        {
          let message="Private Event! You are unauthorized.";
          res.render("message",{message:message,notification:req.user.notification});
        }

      }
      else
      {
        res.render("login2",{redirectValue:current._id});
      }
    });
  });
});
