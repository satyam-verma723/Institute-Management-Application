const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/checkAuth');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const Student = require('../model/Student');
const Fee=require('../model/Fee')
const Course = require('../model/Course');
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

router.post('/add-student', checkAuth, (req, res) => {
    // Extract the token correctly - get the actual token string
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, 'sbs online classes 123');
    // console.log("verify token payload:", verify);
    cloudinary.uploader.upload(req.files.image.tempFilePath, (err, result) => {
        if (err) {
            console.error("Error uploading image:", err);
            return res.status(500).json({
                error: "Image upload failed"
            });
        }

        const newStudent = new Student({
            _id: new mongoose.Types.ObjectId(),
            fullName: req.body.fullName,
            phone: req.body.phone,
            email: req.body.email,
            address: req.body.address,
            courseId: req.body.courseId,
            ImageId: result.public_id,
            imageUrl: result.secure_url,
            uId: verify.uId
        });

        newStudent.save().then(result => {
            res.status(201).json({
                message: "Student added successfully",
                student: result
            });
        }).catch(err => {
            console.error("Error saving student:", err);
            res.status(500).json({
                error: err.message
            });
        });
    });
})

//get all students for a student
router.get('/all-students/:courseId', checkAuth, (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const verify = jwt.verify(token, 'sbs online classes 123');

        Student.find({ uId: verify.uId, courseId: req.params.courseId })
            .select('_id fullName phone address email studentId imageUrl imageId')
            .then(result => {
                console.log("Found students:", result.length);
                res.status(200).json({
                    students: result
                });
            }).catch(err => {
                console.error("Error finding students:", err);
                res.status(500).json({
                    error: err.message
                });
            });
    } catch (error) {
        console.error("Token verification error:", error);
        res.status(401).json({
            error: "Invalid token"
        });
    }
});

//get all students
router.get('/all-students', checkAuth, (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const verify = jwt.verify(token, 'sbs online classes 123');

        Student.find({ uId: verify.uId })
            .select('_id fullName phone address email studentId imageUrl imageId')
            .then(result => {
                console.log("Found students:", result.length);
                res.status(200).json({
                    students: result
                });
            }).catch(err => {
                console.error("Error finding students:", err);
                res.status(500).json({
                    error: err.message
                });
            });
    } catch (error) {
        console.error("Token verification error:", error);
        res.status(401).json({
            error: "Invalid token"
        });
    }
});

//get student by id
router.get('/student-detail/:id', checkAuth,(req, res)=>{
    try{
        const token = req.headers.authorization.split(" ")[1];
        const verify = jwt.verify(token, 'sbs online classes 123');
        Student.findById(req.params.id)
            .select('_id uId fullName phone address email courseId imageUrl imageId')
            .then(result => {
                if (!result) {
                    return res.status(404).json({
                        error: "Student not found"
                    });
                }
                
                Fee.find({uId:verify.uId,courseId:result.courseId,phone:result.phone})
                .then(feeData=>{
                    Course.findById(result.courseId)
                    .then(course => {
                        res.status(200).json({
                            studentDetail: result,
                            feeDetail: feeData,
                            courseDetail:course
                        });
                    })
                    .catch(err => {
                        console.error("Error fetching course details:", err);
                        res.status(500).json({
                            error: "Failed to fetch course details"
                        });
                    });
                })
                .catch(err => {
                    console.error("Error fetching fee details:", err);
                    res.status(500).json({
                        error: "Failed to fetch fee details"
                    });
                });
            })
            .catch(err => {
                console.error("Error fetching student details:", err);
                res.status(500).json({
                    error: "Failed to fetch student details"
                });
            });
    } catch (error) {
        console.error("Token verification error:", error);
        res.status(401).json({
            error: "Invalid token"
        });
    }
});

//delete student
router.delete('/delete-student/:id', checkAuth, (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const verify = jwt.verify(token, 'sbs online classes 123');
        if (!verify || !verify.uId) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }
        Student.findByIdAndDelete(req.params.id)
            .then(result => {
                if (!result) {
                    return res.status(404).json({
                        message: "Student not found"
                    });
                }
                // Delete image from cloudinary
                cloudinary.uploader.destroy(result.ImageId, (err, result) => {
                    if (err) {
                        console.error("Error deleting image from Cloudinary:", err);
                        return res.status(500).json({
                            error: "Image deletion failed"
                        });
                    }
                    res.status(200).json({
                        message: result
                    });
                });
            }).catch(err => {
                console.error("Error deleting student:", err);
                res.status(500).json({
                    error: err.message
                });
            });
    } catch (error) {
        console.error("Token verification error:", error);
        res.status(401).json({
            error: "Invalid token"
        });
    }
});

//update student
router.put('/update-student/:id', checkAuth, (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const verify = jwt.verify(token, 'sbs online classes 123');

        Student.findById(req.params.id)
            .then(student => {
                if (!student) {
                    return res.status(404).json({
                        error: "student not found"
                    });
                }
                if (verify.uId != student.uId) {
                    return res.status(403).json({
                        error: "You are not authorized to update this student"
                    });
                }
                if (req.files) {
                    cloudinary.uploader.destroy(student.ImageId, (err, result) => {
                        cloudinary.uploader.upload(req.files.image.tempFilePath, (err, result) => {
                            if (err) {
                                console.error("Error uploading image:", err);
                                return res.status(500).json({
                                    error: "Image upload failed"
                                });
                            }

                            const updatedstudent = {
                                fullName: req.body.fullName,
                                phone: req.body.phone,
                                email: req.body.email,
                                address: req.body.address,
                                courseId: req.body.courseId,
                                ImageId: result.public_id,
                                imageUrl: result.secure_url,
                                uId: verify.uId
                            }
                            Student.findByIdAndUpdate(req.params.id, updatedstudent, { new: true })
                                .then(result => {
                                    res.status(200).json({
                                        message: "student updated successfully",
                                        student: result
                                    });
                                }).catch(err => {
                                    console.error("Error updating student:", err);
                                    res.status(500).json({
                                        error: err.message
                                    });
                                });
                        });
                    });

                } else {
                    const updatedstudent = {
                        fullName: req.body.fullName,
                        phone: req.body.phone,
                        email: req.body.email,
                        address: req.body.address,
                        courseId: req.body.courseId,
                        uId: verify.uId,
                        imageUrl: student.imageUrl,
                        imageId: student.ImageId
                    };
                    Student.findByIdAndUpdate(req.params.id, updatedstudent, { new: true })
                        .then(result => {
                            res.status(200).json({
                                message: "student updated successfully",
                                student: result
                            });
                        }).catch(err => {
                            console.error("Error updating student:", err);
                            res.status(500).json({
                                error: err.message
                            });
                        });
                }
            })

    } catch (error) {
        console.error("Token verification error:", error);
        return res.status(401).json({
            error: "Invalid token"
        });
    }
});

//get latest 5 students
router.get('/latest-students', (req, res) => {
     const token = req.headers.authorization.split(" ")[1];
     const verify = jwt.verify(token, 'sbs online classes 123');

    Student.find({uId:verify.uId}).sort({$natural: -1 }).limit(5).then(result => {
        res.status(200).json({
            students: result
        });
    }).catch(err => {
        console.error("Error fetching latest students:", err);
        res.status(500).json({
            error: err.message
        });
    });
});

module.exports = router;