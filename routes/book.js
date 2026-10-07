const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const auth = require("../middleware/subscriptionAuth");
const User = require("../models/User");

const BOOK_PRICE = 499;
// SINGLE SOURCE OF TRUTH: the purchased book is bundled with the app.
// Keep this file OUTSIDE public/ so it cannot be opened without authentication.
const BOOK_FILE = path.join(__dirname, "..", "book-assets", "book.pdf");
const BOOK_TITLE = "Aducate English Book";
router.get("/status", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("bookPurchase").lean();
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.json({ success: true, bookPurchase: user?.bookPurchase || { status: "none", price: BOOK_PRICE } });
});

router.post("/request", auth, async (req, res) => {
  const paymentReference = String(req.body?.paymentReference || "").trim();
  const paymentScreenshot = String(req.body?.paymentScreenshot || "").trim();
  const paymentScreenshotName = String(req.body?.paymentScreenshotName || "").trim().slice(0, 120);
  if (paymentReference.length < 3) return res.status(400).json({ success:false, message:"Please enter a valid payment reference / UTR." });
  if (!paymentScreenshot || !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(paymentScreenshot)) {
    return res.status(400).json({ success:false, message:"Please upload your book payment screenshot." });
  }
  if (paymentScreenshot.length > 2200000) {
    return res.status(400).json({ success:false, message:"Book payment screenshot is too large. Please choose a smaller image." });
  }
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success:false, message:"Student not found" });
  if (user.bookPurchase?.status === "approved") return res.json({ success:true, message:"Book access is already approved.", status:"approved" });
  user.bookPurchase={status:"pending",price:BOOK_PRICE,paymentReference,paymentScreenshot,paymentScreenshotName,requestedAt:new Date(),approvedAt:null,adminNote:"",access:false};
  await user.save();
  res.json({success:true,message:"Book payment + screenshot sent to admin for verification.",status:"pending"});
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
    user.bookPurchase={status:"approved",price:BOOK_PRICE,paymentReference:"WALLET-"+Date.now(),paymentScreenshot:"",paymentScreenshotName:"",requestedAt:new Date(),approvedAt:new Date(),adminNote:"Purchased successfully using student wallet.",access:true};
    await user.save();
    res.json({success:true,message:"₹499 deducted from wallet successfully. Book access is now unlocked.",status:"approved",wallet:user.wallet});
  } catch(err){ console.error("Wallet book purchase error:",err); res.status(500).json({success:false,message:"Unable to complete wallet purchase."}); }
});

// Never accept a book URL, file ID, query parameter, or environment override from the client.
router.get("/content", auth, async (req,res)=>{
  try {
    const user=await User.findById(req.user.id).select("bookPurchase.status bookPurchase.access").lean();
    if(!user || user.bookPurchase?.status!=="approved" || user.bookPurchase?.access!==true) {
      return res.status(403).json({success:false,message:"Book access is currently disabled by admin."});
    }

    // The PDF is bundled privately with the app. It is never exposed through
    // /public, and every request (including PDF.js range requests) passes auth.
    const stat=await fs.promises.stat(BOOK_FILE).catch(()=>null);
    if(!stat || !stat.isFile()) {
      console.error("Purchased book file is missing:", BOOK_FILE);
      return res.status(500).json({success:false,message:"Book PDF is not available on the server."});
    }

    const total=stat.size;
    const range=req.headers.range;
    res.set({
      "Content-Type":"application/pdf",
      "Content-Disposition":"inline; filename=aducate-english-book.pdf",
      "Cache-Control":"private, no-store, no-cache, must-revalidate, max-age=0",
      "Pragma":"no-cache",
      "Expires":"0",
      "X-Content-Type-Options":"nosniff",
      "Referrer-Policy":"no-referrer",
      "Accept-Ranges":"bytes"
    });

    if(!range){
      res.status(200).set("Content-Length",String(total));
      return fs.createReadStream(BOOK_FILE).pipe(res);
    }

    const match=/bytes=(\d*)-(\d*)/.exec(range);
    if(!match) return res.status(416).set("Content-Range",`bytes */${total}`).end();

    let start=match[1] ? Number(match[1]) : Math.max(0,total-(Number(match[2])||0));
    let end=match[2] ? Number(match[2]) : total-1;
    if(!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start<0 || end<start || start>=total){
      return res.status(416).set("Content-Range",`bytes */${total}`).end();
    }
    end=Math.min(end,total-1);
    const length=end-start+1;
    res.status(206).set({
      "Content-Length":String(length),
      "Content-Range":`bytes ${start}-${end}/${total}`
    });
    return fs.createReadStream(BOOK_FILE,{start,end}).pipe(res);
  } catch(err){
    console.error("Book content error:",err);
    if(!res.headersSent) return res.status(500).json({success:false,message:"Unable to load the purchased book."});
    res.end();
  }
});
router.get("/info", auth, async (req,res)=>{
  const user=await User.findById(req.user.id).select("bookPurchase.status bookPurchase.access").lean();
  if(!user || user.bookPurchase?.status!=="approved" || user.bookPurchase?.access===false) return res.status(403).json({success:false,message:"Book access is not approved."});
  res.set("Cache-Control","no-store");
  res.json({success:true,title:BOOK_TITLE,source:"fixed-google-drive-book"});
});

module.exports=router;
