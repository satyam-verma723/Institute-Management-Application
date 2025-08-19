const mongoose=require('mongoose');
const studentSchema=new mongoose.Schema({
    _id:mongoose.Types.ObjectId,
    fullName:{type:String,required:true},
    phone:{type:Number,required:true},
    email:{type:String,required:true},
    address:{type:String,required:true},
    courseId:{type:mongoose.Schema.Types.ObjectId, ref:'Course', required:true},
    ImageId:{type:String,required:true},
    imageUrl:{type:String,required:true},
    uId:{type:String,required:true},
},{timestamps:true});

module.exports=mongoose.model('Student',studentSchema);
