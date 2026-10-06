const express = require("express");
const router = express.Router();
const auth = require("../middleware/subscriptionAuth");
const User = require("../models/User");

const BOOK_PRICE = 499;
// SINGLE SOURCE OF TRUTH: this is the only book the app can open.
const BOOK_DRIVE_FILE_ID = "1Cfw39OlkXqbbXuEu4qPQRPBtzu69rZuA";
const BOOK_TITLE = "Aducate English Book";

router.get("/status", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("bookPurchase").lean();
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.json({ success: true, bookPurchase: user?.bookPurchase || { status: "none", price: BOOK_PRICE } });
});

router.post("/request", auth, async (req, res) => {
  const paymentReference = String(req.body?.paymentReference || "").trim();
  if (paymentReference.length < 3) return res.status(400).json({ success:false, message:"Please enter a valid payment reference / UTR." });
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success:false, message:"Student not found" });
  if (user.bookPurchase?.status === "approved") return res.json({ success:true, message:"Book access is already approved.", status:"approved" });
  user.bookPurchase={status:"pending",price:BOOK_PRICE,paymentReference,requestedAt:new Date(),approvedAt:null,adminNote:"",access:false};
  await user.save();
  res.json({success:true,message:"Payment request sent to admin for verification.",status:"pending"});
});

router.post("/wallet-purchase", auth, async (req,res)=>{
  try {
    const user=await User.findById(req.user.id);
    if(!user) return res.status(404).json({success:false,message:"Student not found"});
    if(user.bookPurchase?.status==="approved") return res.json({success:true,message:"Book is already purchased and approved.",status:"approved",wallet:Number(user.wallet||0)});
    const balance=Number(user.wallet||0);
    if(balance<BOOK_PRICE) return res.status(400).json({success:false,message:`Insufficient wallet balance. You need ₹${BOOK_PRICE}, but your balance is ₹${balance.toFixed(2)}.`});
    user.wallet=Math.round((balance-BOOK_PRICE)*100)/100;
    user.walletTransactions=user.walletTransactions||[];
    user.walletTransactions.push({time:new Date(),type:"DEBIT",amount:BOOK_PRICE,reason:"Book purchase — ₹499",adminId:"SYSTEM"});
    user.bookPurchase={status:"approved",price:BOOK_PRICE,paymentReference:"WALLET-"+Date.now(),requestedAt:new Date(),approvedAt:new Date(),adminNote:"Purchased successfully using student wallet.",access:true};
    await user.save();
    res.json({success:true,message:"₹499 deducted from wallet successfully. Book access is now unlocked.",status:"approved",wallet:user.wallet});
  } catch(err){ console.error("Wallet book purchase error:",err); res.status(500).json({success:false,message:"Unable to complete wallet purchase."}); }
});

// Never accept a book URL, file ID, query parameter, or environment override from the client.
router.get("/content", auth, async (req,res)=>{
  try {
    const user=await User.findById(req.user.id).select("bookPurchase.status bookPurchase.access").lean();
    if(!user || user.bookPurchase?.status!=="approved" || user.bookPurchase?.access===false) return res.status(403).json({success:false,message:"Book access is currently disabled by admin."});

    // Google Drive public-file media endpoint. No alternate/local book fallback exists.
    const driveUrl=`https://drive.usercontent.google.com/download?id=${encodeURIComponent(BOOK_DRIVE_FILE_ID)}&export=download&confirm=t`;
    const headers={Accept:"application/pdf"};
    if(req.headers.range) headers.Range=req.headers.range;
    const upstream=await fetch(driveUrl,{headers,redirect:"follow",signal:AbortSignal.timeout(55000)});
    const contentType=(upstream.headers.get("content-type")||"").toLowerCase();
    if(!upstream.ok || (!contentType.includes("application/pdf") && !contentType.includes("application/octet-stream"))){
      console.error("Book source is not a PDF:",upstream.status,contentType);
      return res.status(502).json({success:false,message:"The configured Google Drive file did not return a PDF. Check that the selected Drive file is the intended book and is shared as Anyone with the link → Viewer."});
    }
    res.status(upstream.status);
    res.set({"Content-Type":"application/pdf","Content-Disposition":"inline","Cache-Control":"private, no-store, no-cache, must-revalidate, max-age=0","Pragma":"no-cache","Expires":"0","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Accept-Ranges":upstream.headers.get("accept-ranges")||"bytes"});
    for(const name of ["content-length","content-range","accept-ranges"]){const value=upstream.headers.get(name);if(value)res.set(name,value);}
    if(!upstream.body) return res.end();
    const reader=upstream.body.getReader();
    try{while(true){const {value,done}=await reader.read();if(done)break;if(value)res.write(Buffer.from(value));}}finally{reader.releaseLock();}
    res.end();
  } catch(err){
    console.error("Book content error:",err);
    if(!res.headersSent) res.status(502).json({success:false,message:"Unable to load the purchased book from Google Drive."}); else res.end();
  }
});

router.get("/info", auth, async (req,res)=>{
  const user=await User.findById(req.user.id).select("bookPurchase.status bookPurchase.access").lean();
  if(!user || user.bookPurchase?.status!=="approved" || user.bookPurchase?.access===false) return res.status(403).json({success:false,message:"Book access is not approved."});
  res.set("Cache-Control","no-store");
  res.json({success:true,title:BOOK_TITLE,source:"fixed-google-drive-book"});
});

module.exports=router;
