const express= require('express');
const router = express.Router();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const {google} = require('googleapis');
const User = require('../models/user');


passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});
var logged;
passport.use(new GoogleStrategy({
    clientID: "754659758577-m77g48hnuc7o474he96bbu2ikifl2v6q.apps.googleusercontent.com",
    clientSecret: "jiXtebaE56AOtHmFG6xYM94P",
    callbackURL: "http://localhost:3000/auth/google/invitations"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findById(logged, function (err, user) {
      user.accessToken=accessToken;
      if(!user.googleId){
        user.googleId=profile.id;
        user.refreshToken=refreshToken;
        user.accessToken=accessToken;
        user.save();
      }
      else{
        console.log("google account already linked !");
      }

      return cb(err, user);
    });
  }
));


router.get("/register",function(req,res){
    res.render("register");
});

router.get("/google/invitations",
  passport.authenticate("google", { failureRedirect: '/auth/login' }),
  function(req, res) {
    res.redirect('/dashBoard');
  }
);

router.get("/login",function(req,res){
  res.render("login");
});

router.get('/google',
  passport.authenticate("google", { scope: ['https://www.googleapis.com/auth/userinfo.profile','https://www.googleapis.com/auth/userinfo.email','https://www.googleapis.com/auth/calendar.events','https://www.googleapis.com/auth/calendar'] }),
  function(req,res){
    // console.log(req.user);
  }
);

router.get("/google/invitations",
  passport.authenticate("google", { failureRedirect: '/auth/login' }),
  function(req, res) {
    res.redirect('/dashBoard');
  }
);

router.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

router.post("/submitRegisterCredentials",function(req,res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
      if (err) {
        console.log(err);
        res.render("message",{message:"User already registered!",notification:{requests:[],accepted:[]}});
      }
      else {
        passport.authenticate("local")(req, res, function(){
        res.redirect("/dashBoard");
        });
      }
    });
});

router.post("/submitLoginCredentials",function(req,res){
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
          logged=req.user._id;
          res.redirect("/dashBoard");
      });

      }
    });
});

router.post("/submitLoginCredentials2",function(req,res){
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
          res.redirect("/dashBoard/"+req.body.redirectValue);
        });

      });

      }
    });
});

module.exports = router;
