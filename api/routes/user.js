const express=require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const User = require('../model/User');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET      
});
router.post('/signup',(req,res)=>{
    User.find({email: req.body.email}).then(user => {
        if (user.length >= 1) { 
            return res.status(409).json({
                message: "Email already exists"
            });
        }
    });
    cloudinary.uploader.upload(req.files.image.tempFilePath,(err,result) =>{
        // console.log(result);
        bcrypt.hash(req.body.password, 10, (err, hash) => {
            if (err) {
                console.error("Error hashing password:", err);
                return res.status(500).json({
                    error: "Internal server error"
                });
            }
            const newUser= new User({
            _id: new mongoose.Types.ObjectId(),
            FullName: req.body.FullName,
            email: req.body.email,
            phone: req.body.phone,
            password: hash,
            imageUrl: result.secure_url,
            imageId: result.public_id
        }).save().then(result => {
            res.status(201).json({
                newUser: result
            });
        }).catch(err => {
            console.error("Error saving user:", err);
            res.status(500).json({
                error: err.message
            });
        });
        });
        
    });
})

//login
router.post('/login', (req, res) => {
    User.find({ email:req.body.email})
        .then(users => {
            if (users.length == 0) {
                return res.status(500).json({
                    message: "User not found..."
                });
            }
            bcrypt.compare(req.body.password, users[0].password, (err, result) => {
                if(!result){
                    console.error("Error comparing passwords:", err);
                    return res.status(500).json({
                        error: "pass invalid..."
                    });
                }
                const token = jwt.sign({
                    email: users[0].email,
                    FullName: users[0].FullName,
                    phone: users[0].phone,
                    uId: users[0]._id
                },
                'sbs online classes 123',
                {
                    expiresIn: "365d"
                }
                );
                res.status(200).json({
                    _id:users[0]._id,
                    FullName:users[0].FullName,
                    email:users[0].email,
                    phone:users[0].phone,
                    imageUrl:users[0].imageUrl,
                    imageId:users[0].imageId,
                    token:token
            });
        })
    });
});

module.exports=router;