const express= require('express');
const router = express.Router();
const Event=require('../models/event');
const User = require('../models/user');
const fs=require("fs");
const nodemailer = require("nodemailer");
const inLineCss = require('nodemailer-juice');
const mongoose=require("mongoose");
const {google} = require('googleapis');
const ejs=require("ejs");

var fontArray=["'Roboto',sans-serif","'Kelly Slab', cursive","'Righteous', cursive","'Lobster Two', cursive","'Dancing Script', cursive","'Bungee', cursive","'Michroma', sans-serif","'Satisfy', cursive","'Shojumaru', cursive","'Sriracha', cursive"];

const transporter = nodemailer.createTransport({
    service:"gmail",
    auth: {
      user: 'invitationsdeltatask3@gmail.com',
      pass: 'invitations512'
    }
});
transporter.use('compile', inLineCss());

const crypto = require("crypto");
const path = require("path");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const mongoURI = "mongodb://localhost:27017/imagesDB";
const conn = mongoose.createConnection(mongoURI, {
  useUnifiedTopology: true,
  useNewUrlParser: true

});
var gfs;
conn.once("open", () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "uploads"
  });
});
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads"
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({
  storage
});

const oAuth2Client = new google.auth.OAuth2(
  "754659758577-m77g48hnuc7o474he96bbu2ikifl2v6q.apps.googleusercontent.com",
  "jiXtebaE56AOtHmFG6xYM94P"
);
const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

router.get("/image/:filename", (req, res) => {
    const file = gfs
      .find({
        filename: req.params.filename
      })
      .toArray((err, files) => {
        if (!files || files.length === 0) {
          return res.status(404).json({
            err: "no files exist"
          });
        }
        gfs.openDownloadStreamByName(req.params.filename).pipe(res);
      });
});

router.get("/",function(req,res){
    if(req.isAuthenticated()){
      User.findById(req.user._id,(err,foundUser)=>{
        res.render("submit",{colorValue:"-1",notification:foundUser.notification,template:"",files:""});
      });
    }
    else {
      res.redirect("/");
    }
});

router.post("/invitationStyle",function(req,res){
  if(req.isAuthenticated())
  {
    let tempFont=fontArray[Number(req.body.fontValue)];
    if(!gfs) {
      console.log("some error occured, check connection to db");
      res.send("some error occured, check connection to db");
      process.exit(0);
    }
    gfs.find({filename:req.body.filename}).toArray((err, files) => {
      if (!files || files.length === 0) {
        return res.render("index", {
          files: false
        });
      } else {
        const f = files
          .map(file => {
            if (
              file.contentType === "image/png" ||
              file.contentType === "image/jpeg"
            ) {
              file.isImage = true;
            } else {
              file.isImage = false;
            }
            return file;
          })
          .sort((a, b) => {
            return (
              new Date(b["uploadDate"]).getTime() -
              new Date(a["uploadDate"]).getTime()
            );
          });

        return res.render("submit",{colorValue:req.body.colorValue,fontValue:tempFont,numberOfUsers:req.body.numberOfUsers,notification:{accepted:[],requests:[]},template:req.body.template,files:f});
      }
    });
  }
  else
  {
    res.redirect("/");
  }
});

router.post("/uploadImage",upload.single("file"),function(req,res){
  User.findById(req.user._id,(err,foundUser)=>{
    res.render("submit",{colorValue:"",notification:foundUser.notification,template:req.body.template,files:"",filename:req.file.filename});
  });
});

router.post("/createInvitation",function(req,res){
    User.findOne({username:req.user.username},
      function(err,result)
      {
        let notFound=[];

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
            authorized:req.body.user,
            objectFit:req.body.objectFit
          });
          tempEvent.members.push({
            username:req.user.username,
            comments:"",
            foodPreferences:"",
            extraNumber:0
          });
          tempEvent.membersList.push(req.user._id);
          tempEvent.authorized.push(req.user.username);
          let options = { year: 'numeric', month: 'long', day: 'numeric' };
          tempEvent.time=tempEvent.date.toLocaleTimeString();
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
          tempEvent.filename=req.body.filename;
          const event = {
            summary: tempEvent.header,
            description: tempEvent.body,
            start: {
              dateTime: tempEvent.date,
            },
            end: {
              dateTime: tempEvent.date,
            },
            source:{
              title:"Delta Task 3-Invitations App",
              url:`http://localhost:3000/events/${tempEvent._id}`
            }

          };
          oAuth2Client.setCredentials({
            refresh_token:result.refreshToken,
            access_token:result.accessToken
          });
          calendar.events.insert(
            { calendarId: 'primary', resource: event },
            err => {
              if (err) return console.error('Error Creating Calender Event:', err)

              return console.log('Calendar event successfully created.')
            }
          );
          let mailList="";
          for(let y=0;y<req.body.email.length;y++){
            mailList=mailList+`${req.body.email[y]},`;
          }

          console.log(mailList);
          ejs.renderFile(process.cwd() + "/views/eventPage2.ejs", {event:tempEvent}, function (err, data) {
            if (err) {
                console.log(err);
            } else {
                var mainOptions = {
                    from: 'invitationsdeltatask3@gmail.com',
                    to: mailList,
                    subject: req.body.header,
                    html: data,
                    attachments: [{
                      filename: 'image.png',
                      path: 'http://localhost:3000/submit/image/'+`${tempEvent.filename}`,
                      cid: 'theUploaded@Image'
                    }]
                };
                console.log("html data ======================>", mainOptions.html);
                transporter.sendMail(mainOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message sent: ' + info.response);
                    }
                });
            }

          });

          tempEvent.save();
          result.events.push(tempEvent);
          result.save();
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
              }

            });
          });
          if(notFound.length!=0)
          {
            let message="Users not found:<br>";
            notFound.forEach((eachh)=>{message=message.concat(eachh+"<br>");});

            res.render("message",{message:message,notification:result.notification});
            notFound=[];
          }
          else
          {
            res.redirect("/dashBoard");
          }


      }
    );
});

module.exports = router;
