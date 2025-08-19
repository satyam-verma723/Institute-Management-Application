require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const cors = require('cors');

// Add JSON middleware for Express 5.x
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration for production
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college';
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB");
}).catch((err) => {
    console.error("MongoDB connection error:", err);
});

app.use(bodyParser.json());
app.use(cors());
app.use(fileUpload({
    useTempFiles: true,
    // tempFileDir: '/tmp/'
}));
// Import routes
const userRoute = require('./routes/user');
const courseRoute = require('./routes/course');
const feeRoute = require('./routes/fee');
const studentRoute = require('./routes/student');

// Use routes
app.use('/user', userRoute);
app.use('/course', courseRoute);
app.use('/student', studentRoute);
app.use('/fee', feeRoute);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        msg: "bad request"
    });
});

module.exports = app;
