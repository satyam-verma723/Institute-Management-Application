const mongoose=require('mongoose');
const courseSchema=new mongoose.Schema({
    _id:mongoose.Types.ObjectId,
    courseName:{type:String,required:true},
    price:{type:Number,required:true},
    description:{type:String,required:true},
    startingDate:{type:String,required:true},
    endDate:{type:String,required:true},
    ImageId:{type:String,required:true},
    imageUrl:{type:String,required:true},
    uid:{type:String,required:true},
}, {timestamps: true})

module.exports=mongoose.model('Course',courseSchema);
