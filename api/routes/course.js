const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/checkAuth');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const Course = require('../model/Course');
const Student = require('../model/Student');
const Fee = require('../model/Fee');
// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

// Helper function to extract user ID from token
const getUserIdFromToken = (req) => {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, 'sbs online classes 123');
    return verify.uId;
};

// Add new course
router.post('/add-course', checkAuth, (req, res) => {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, 'sbs online classes 123');

    cloudinary.uploader.upload(req.files.image.tempFilePath, (err, result) => {
        if (err) {
            console.error("Error uploading image:", err);
            return res.status(500).json({
                error: "Image upload failed"
            });
        }

        Course.findOne({ courseName: req.body.courseName }).then(existingCourse => {
            if (existingCourse) {
                return res.status(400).json({
                    error: "Course with this name already exists"
                });
            }
            
            const newCourse = new Course({
                _id: new mongoose.Types.ObjectId(),
                courseName: req.body.courseName,
                price: req.body.price,
                description: req.body.description,
                startingDate: req.body.startingDate,
                endDate: req.body.endDate,
                ImageId: result.public_id,
                imageUrl: result.secure_url,
                uid: verify.uId
            });

            newCourse.save().then(result => {
                res.status(201).json({
                    message: "Course added successfully",
                    course: result
                });
            }).catch(err => {
                console.error("Error saving course:", err);
                res.status(500).json({
                    error: err.message
                });
            });
        });
    });
});

// Get all courses for a user
router.get('/all-courses', checkAuth, (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const verify = jwt.verify(token, 'sbs online classes 123');

        Course.find({ uid: verify.uId })
            .select('_id courseName price description startingDate endDate imageUrl ImageId')
            .then(result => {
                res.status(200).json({
                    courses: result
                });
            }).catch(err => {
                console.error("Error finding courses:", err);
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

// Get course by ID with all enrolled students
router.get('/course-detail/:id', checkAuth, (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const verify = jwt.verify(token, 'sbs online classes 123');

        Course.findById(req.params.id)
            .select('_id courseName price description startingDate endDate imageUrl ImageId uid')
            .then(course => {
                if (!course) {
                    return res.status(404).json({
                        error: "Course not found"
                    });
                }
                
                // Verify user owns this course
                if (course.uid !== verify.uId) {
                    return res.status(403).json({
                        error: "You are not authorized to view this course"
                    });
                }

                // Find all students enrolled in this course using proper ObjectId reference
                Student.find({ courseId: new mongoose.Types.ObjectId(req.params.id), uId: verify.uId })
                    .select('_id fullName phone email address imageUrl studentId')
                    .populate('courseId', 'courseName')
                    .then(students => {
                        res.status(200).json({
                            course: course,
                            students: students,
                            totalStudents: students.length
                        });
                    }).catch(err => {
                        console.error("Error finding students:", err);
                        res.status(500).json({
                            error: err.message
                        });
                    });
            }).catch(err => {
                console.error("Error finding course:", err);
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

// Delete course
router.delete('/delete-course/:id', checkAuth, (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const verify = jwt.verify(token, 'sbs online classes 123');
        
        if (!verify || !verify.uId) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }
        
        Course.findById(req.params.id)
            .then(course => {
                if (!course) {
                    return res.status(404).json({
                        error: "Course not found"
                    });
                }

                if (course.uid !== verify.uId) {
                    return res.status(403).json({
                        error: "You are not authorized to delete this course"
                    });
                }

                // Delete image from Cloudinary
                cloudinary.uploader.destroy(course.ImageId, (err, result) => {
                    if (err) {
                        console.error("Error deleting image from Cloudinary:", err);
                        return res.status(500).json({
                            error: "Image deletion failed"
                        });
                    }
                    
                    // First, delete all students who have selected this course
                    Student.deleteMany({ courseId: new mongoose.Types.ObjectId(req.params.id) })
                        .then((deleteResult) => {
                            console.log(`Deleted ${deleteResult.deletedCount} students enrolled in this course`);
                            
                            // Then delete the course
                            Course.findByIdAndDelete(req.params.id)
                                .then(() => {
                                    res.status(200).json({
                                        message: "Course and associated students deleted successfully",
                                        deletedStudentsCount: deleteResult.deletedCount
                                    });
                                }).catch(err => {
                                    console.error("Error deleting course:", err);
                                    res.status(500).json({
                                        error: err.message
                                    });
                                });
                        })
                        .catch(err => {
                            console.error("Error deleting students:", err);
                            res.status(500).json({
                                error: err.message
                            });
                        });
                });
            }).catch(err => {
                console.error("Error finding course:", err);
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

// Update course
router.put('/update-course/:id', checkAuth, (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const verify = jwt.verify(token, 'sbs online classes 123');

        Course.findById(req.params.id)
            .then(course => {
                if (!course) {
                    return res.status(404).json({
                        error: "Course not found"
                    });
                }
                
                if (verify.uId !== course.uid) {
                    return res.status(403).json({
                        error: "You are not authorized to update this course"
                    });
                }

                let updatedData = {
                    courseName: req.body.courseName || course.courseName,
                    price: req.body.price || course.price,
                    description: req.body.description || course.description,
                    startingDate: req.body.startingDate || course.startingDate,
                    endDate: req.body.endDate || course.endDate,
                    uid: verify.uId
                };

                if (req.files && req.files.image) {
                    // Delete old image from Cloudinary
                    cloudinary.uploader.destroy(course.ImageId, (err, result) => {
                        if (err) {
                            console.error("Error deleting old image:", err);
                            return res.status(500).json({
                                error: "Image deletion failed"
                            });
                        }

                        // Upload new image
                        cloudinary.uploader.upload(req.files.image.tempFilePath, (err, result) => {
                            if (err) {
                                console.error("Error uploading new image:", err);
                                return res.status(500).json({
                                    error: "Image upload failed"
                                });
                            }

                            updatedData.ImageId = result.public_id;
                            updatedData.imageUrl = result.secure_url;

                            Course.findByIdAndUpdate(req.params.id, updatedData, { new: true })
                                .then(result => {
                                    res.status(200).json({
                                        message: "Course updated successfully",
                                        course: result
                                    });
                                }).catch(err => {
                                    console.error("Error updating course:", err);
                                    res.status(500).json({
                                        error: err.message
                                    });
                                });
                        });
                    });
                } else {
                    // Keep existing image data
                    updatedData.ImageId = course.ImageId;
                    updatedData.imageUrl = course.imageUrl;

                    Course.findByIdAndUpdate(req.params.id, updatedData, { new: true })
                        .then(result => {
                            res.status(200).json({
                                message: "Course updated successfully",
                                course: result
                            });
                        }).catch(err => {
                            console.error("Error updating course:", err);
                            res.status(500).json({
                                error: err.message
                            });
                        });
                }
            }).catch(err => {
                console.error("Error finding course:", err);
                res.status(500).json({
                    error: err.message
                });
            });
    } catch (error) {
        console.error("Token verification error:", error);
        return res.status(401).json({
            error: "Invalid token"
        });
    }
});

// Get latest 5 courses
router.get('/latest-course', checkAuth, (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const verify = jwt.verify(token, 'sbs online classes 123');

        Course.find({ uid: verify.uId })
            .sort({ createdAt: -1 })
            .limit(5)
            .then(result => {
                res.status(200).json({
                    courses: result
                });
            }).catch(err => {
                console.error("Error fetching latest courses:", err);
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

// Get students enrolled in a specific course
router.get('/course-students/:courseId', checkAuth, (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const verify = jwt.verify(token, 'sbs online classes 123');
        
        Course.findById(req.params.courseId)
            .then(course => {
                if (!course) {
                    return res.status(404).json({
                        error: "Course not found"
                    });
                }

                if (course.uid !== verify.uId) {
                    return res.status(403).json({
                        error: "You are not authorized to view students for this course"
                    });
                }

                Student.find({ courseId: req.params.courseId })
                    .select('_id name email phone')
                    .then(students => {
                        res.status(200).json({
                            students
                        });
                    }).catch(err => {
                        console.error("Error fetching students:", err);
                        res.status(500).json({
                            error: err.message
                        });
                    });
            }).catch(err => {
                console.error("Error finding course:", err);
                res.status(500).json({
                    error: err.message
                });
            });9
    } catch (error) {
        console.error("Token verification error:", error);
        res.status(401).json({
            error: "Invalid token"
        });
    }
});

//  home api
router.get('/home', checkAuth, async(req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const verify = jwt.verify(token, 'sbs online classes 123');
        const newFee= await Fee.find({ uId: verify.uId }).sort({$natural:-1}).limit(5);
        const newStudents= await Student.find({ uId: verify.uId }).sort({$natural:-1}).limit(5);
        const totalCourse= await Course.countDocuments({ uid: verify.uId });
        const totalStudent= await Student.countDocuments({ uId: verify.uId });
        const totalAmount=await Fee.aggregate([
            {$match: {uId:verify.uId}},
            {$group: {_id: null, total: {$sum: "$amount"}}}
        ])
        res.status(200).json({
            fees:newFee,
            students:newStudents,
            totalCourse: totalCourse,
            totalStudent: totalStudent,
            totalAmount:totalAmount.length>0?totalAmount[0].total:0
        });
    } catch (error) {
        console.error("Token verification error:", error);
        res.status(401).json({
            error: "Invalid token"
        });
    }
});
module.exports = router;
