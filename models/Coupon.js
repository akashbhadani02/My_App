const mongoose=require('mongoose');
module.exports=mongoose.model('Coupon',new mongoose.Schema({code:{type:String,unique:true,index:true},reward:{type:Number,required:true},active:{type:Boolean,default:true}},{timestamps:true}));
