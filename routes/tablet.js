const express = require("express");
const router = express.Router();
const auth = require("../middleware/bookAuth");
const User = require("../models/User");
const TABLET_PRICE = 4999;
router.get("/status", auth, async (req,res)=>{
  const user=await User.findById(req.user.id).select("tabletPurchase wallet").lean();
  res.set("Cache-Control","no-store");
  res.json({success:true,tabletPurchase:user?.tabletPurchase||{status:"none",price:TABLET_PRICE},wallet:Number(user?.wallet||0),price:TABLET_PRICE});
});
router.post("/request", auth, async (req,res)=>{
  const paymentReference=String(req.body?.paymentReference||"").trim();
  const paymentScreenshot=String(req.body?.paymentScreenshot||"").trim();
  const paymentScreenshotName=String(req.body?.paymentScreenshotName||"").trim().slice(0,120);
  const shippingAddress=String(req.body?.shippingAddress||"").trim().slice(0,1000);
  if(shippingAddress.length<10) return res.status(400).json({success:false,message:"Please enter your complete delivery address."});
  if(paymentReference.length<3) return res.status(400).json({success:false,message:"Please enter a valid UTR / payment reference."});
  if(!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(paymentScreenshot)) return res.status(400).json({success:false,message:"Please upload the payment screenshot."});
  if(paymentScreenshot.length>2200000) return res.status(400).json({success:false,message:"Screenshot is too large. Please choose a smaller image."});
  const user=await User.findById(req.user.id); if(!user) return res.status(404).json({success:false,message:"Student not found"});
  if(user.tabletPurchase?.status==="approved") return res.json({success:true,message:"Tablet order is already approved.",status:"approved"});
  if(user.tabletPurchase?.status==="pending") return res.status(409).json({success:false,message:"Your tablet order is already pending admin verification."});
  user.tabletPurchase={status:"pending",price:TABLET_PRICE,paymentReference,paymentMethod:"UPI",paymentScreenshot,paymentScreenshotName,shippingAddress,requestedAt:new Date(),approvedAt:null,finalDeliveryDate:null,adminNote:""};
  await user.save(); res.json({success:true,message:"Tablet order submitted. Admin will verify payment and contact you for dispatch.",status:"pending"});
});
router.post("/wallet-purchase", auth, async (req,res)=>{
  try{
    const shippingAddress=String(req.body?.shippingAddress||"").trim().slice(0,1000);
    if(shippingAddress.length<10) return res.status(400).json({success:false,message:"Please enter your complete delivery address."});
    const user=await User.findById(req.user.id); if(!user) return res.status(404).json({success:false,message:"Student not found"});
    if(user.tabletPurchase?.status==="approved") return res.json({success:true,message:"Tablet order is already approved.",wallet:Number(user.wallet||0)});
    if(user.tabletPurchase?.status==="pending") return res.status(409).json({success:false,message:"Your tablet order is already pending."});
    const balance=Number(user.wallet||0); if(balance<TABLET_PRICE) return res.status(400).json({success:false,message:`Insufficient wallet balance. You need ₹${TABLET_PRICE.toLocaleString("en-IN")}, but your balance is ₹${balance.toFixed(2)}.`});
    user.wallet=Math.round((balance-TABLET_PRICE)*100)/100;
    user.walletTransactions=user.walletTransactions||[];
    user.walletTransactions.push({time:new Date(),type:"DEBIT",amount:TABLET_PRICE,reason:"Physical Android Tablet purchase — ₹4,999",adminId:"SYSTEM"});
    user.tabletPurchase={status:"pending",price:TABLET_PRICE,paymentMethod:"WALLET",paymentReference:"WALLET-"+Date.now(),paymentScreenshot:"",paymentScreenshotName:"",shippingAddress,requestedAt:new Date(),approvedAt:null,finalDeliveryDate:null,adminNote:"Wallet payment received. Verify order and arrange dispatch."};
    await user.save(); res.json({success:true,message:"₹4,999 deducted from wallet. Your tablet order is awaiting admin confirmation and dispatch.",wallet:user.wallet,status:"pending"});
  }catch(err){console.error("Tablet wallet purchase error:",err);res.status(500).json({success:false,message:"Unable to place tablet order."});}
});
module.exports=router;
