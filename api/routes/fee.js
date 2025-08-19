const express=require('express');
const checkAuth=require('../middleware/checkAuth');
const router = express.Router();
const mongoose=require('mongoose');
const jwt=require('jsonwebtoken');
const Fee=require('../model/Fee');

router.post('/add-fee',checkAuth,(req,res)=>{
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, 'sbs online classes 123');

    const newFee = new Fee({
        _id: new mongoose.Types.ObjectId(),
        fullName: req.body.fullName,
        phone: req.body.phone,
        courseId: req.body.courseId,
        uId: verify.uId,
        amount: req.body.amount,
        remark: req.body.remark
    });

    newFee.save().then(result => {
        res.status(201).json({
            message: "Fee added successfully",
            fee:result
        });
    }).catch(err => {
        console.error("Error saving fee:", err);
        res.status(500).json({
            error:err.message
        });
    });
})

//get all fees for any user
router.get('/payment-history',checkAuth,(req,res)=>{
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, 'sbs online classes 123');

    Fee.find({ uId: verify.uId })
        .select('_id fullName phone courseId amount remark createdAt updatedAt')
        .then(result => {
            console.log("Found fees:", result.length);
            res.status(200).json({
                fees: result
            });
        }).catch(err => {
            console.error("Error finding fees:", err);
            res.status(500).json({
                error: err.message
            });
        });
});

//get all fees for any student in a course
router.get('/payment-history/:courseId', checkAuth, (req, res) => {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, 'sbs online classes 123');

    Fee.find({ uId: verify.uId, courseId: req.params.courseId , phone: req.body.phone})
        .select('_id fullName phone courseId amount remark createdAt updatedAt')
        .then(result => {
            console.log("Found fees for course:", result.length);
            res.status(200).json({
                fees: result
            });
        }).catch(err => {
            console.error("Error finding fees for course:", err);
            res.status(500).json({
                error: err.message
            });
        });
}); 


module.exports=router;