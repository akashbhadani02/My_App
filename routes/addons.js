const express=require('express');
const crypto=require('crypto');
const router=express.Router();
const auth=require('../middleware/subscriptionAuth');
const User=require('../models/User');
const Admin=require('../models/Admin');
const adminAuth=require('../middleware/adminAuth');
const Coupon=require('../models/Coupon');
const today=()=>new Date().toISOString().slice(0,10);
function code(){return 'EARN-'+crypto.randomBytes(3).toString('hex').toUpperCase()}
function badge(user){const b=new Set(user.badges||[]); if(user.totalQuestionsAnswered>=1)b.add('First Quiz'); if(user.streak>=7)b.add('7 Day Streak'); if(user.totalEarn>=100)b.add('Top Earner'); user.badges=[...b]; user.level=Math.max(1,Math.floor((user.experience||0)/100)+1)}
async function me(id){const u=await User.findById(id);if(!u)throw Error('User not found'); if(!u.referralCode){u.referralCode=code();await u.save()} return u}
router.get('/dashboard',auth,async(req,res)=>{try{const u=await me(req.user.id);badge(u);await u.save(); const leaders=await User.find({isDeleted:false}).sort({wallet:-1, name:1}).limit(10).select('name wallet totalEarn quizScore level badges');res.json({success:true,profile:{referralCode:u.referralCode,referralCount:u.referralCount,streak:u.streak,longestStreak:u.longestStreak,level:u.level,experience:u.experience,badges:u.badges,dailyChallenge:{date:today(),target:10,progress:u.dailyChallengeProgress,claimed:u.dailyChallengeClaimed,reward:1},dailyActivities:{date:today(),progress:u.dailyActivityDate===today()?Number(u.dailyActivityProgress||0):0}},leaderboard:leaders})}catch(e){res.status(500).json({success:false,message:e.message})}});
router.post('/activity',auth,async(req,res)=>{try{const u=await me(req.user.id),d=today();if(u.lastActivityDate!==d){const y=new Date(Date.now()-86400000).toISOString().slice(0,10);u.streak=u.lastActivityDate===y?u.streak+1:1;u.longestStreak=Math.max(u.longestStreak,u.streak);u.lastActivityDate=d}u.experience+=Number(req.body.xp||10);if(u.dailyActivityDate!==d){u.dailyActivityDate=d;u.dailyActivityProgress=0}u.dailyActivityProgress=Number(u.dailyActivityProgress||0)+1;badge(u);await u.save();res.json({success:true,streak:u.streak,level:u.level,progress:u.dailyActivityProgress})}catch(e){res.status(500).json({success:false,message:e.message})}});
router.post('/challenge/claim',auth,async(req,res)=>{try{const u=await me(req.user.id);if(u.dailyChallengeDate!==today()||u.dailyChallengeProgress<10)return res.status(400).json({success:false,message:'Complete today’s challenge first.'});if(u.dailyChallengeClaimed)return res.status(400).json({success:false,message:'Already claimed today.'});u.wallet+=1;u.totalEarn+=1;u.dailyChallengeClaimed=true;await u.save();res.json({success:true,reward:1,wallet:u.wallet})}catch(e){res.status(500).json({success:false,message:e.message})}});
router.post('/referral/apply',auth,async(req,res)=>{try{const u=await me(req.user.id),c=String(req.body.code||'').trim().toUpperCase();if(u.referredBy)return res.status(400).json({success:false,message:'Referral already used.'});const owner=await User.findOne({referralCode:c});if(!owner||String(owner._id)===String(u._id))return res.status(400).json({success:false,message:'Invalid referral code.'});u.referredBy=c;u.wallet+=2;owner.referralCount+=1;owner.wallet+=2;owner.referralReward+=2;await u.save();await owner.save();res.json({success:true,message:'Referral applied. ₹2 bonus added.'})}catch(e){res.status(500).json({success:false,message:e.message})}});
router.post('/coupon',auth,async(req,res)=>{
  try{
    const u=await me(req.user.id);
    const c=String(req.body.code||'').trim().toUpperCase();
    if(!c) return res.status(400).json({success:false,message:'Coupon code required.'});
    // Coupons are single-use globally. Once successfully redeemed, they are
    // removed from the admin list so only still-available coupons remain.
    const coupon=await Coupon.findOneAndDelete({code:c,active:true});
    if(!coupon) return res.status(400).json({success:false,message:'Invalid or already used coupon.'});
    if((u.couponsUsed||[]).includes(c)) {
      // This should normally be impossible because the coupon is deleted on
      // first use, but restore it safely if an old user record contains it.
      await Coupon.create({code:c,reward:coupon.reward,active:true}).catch(()=>{});
      return res.status(400).json({success:false,message:'Coupon already used.'});
    }
    const reward=Number(coupon.reward||0);
    if(!Number.isFinite(reward)||reward<=0){
      await Coupon.create({code:c,reward:coupon.reward,active:true}).catch(()=>{});
      return res.status(400).json({success:false,message:'Invalid coupon reward.'});
    }
    try {
      u.couponsUsed=Array.isArray(u.couponsUsed)?u.couponsUsed:[];
      u.couponsUsed.push(c);
      u.wallet=Number(u.wallet||0)+reward;
      u.totalEarn=Number(u.totalEarn||0)+reward;
      await u.save();
    } catch(saveErr) {
      // Never consume a coupon if the student's wallet update fails.
      await Coupon.create({code:c,reward,active:true}).catch(()=>{});
      throw saveErr;
    }
    res.json({success:true,reward,wallet:u.wallet,message:`Coupon ${c} applied successfully. ₹${reward} added.`});
  }catch(e){res.status(500).json({success:false,message:e.message})}
});

router.get('/tickets',auth,async(req,res)=>{const u=await me(req.user.id);res.json({success:true,tickets:u.supportTickets||[]})});
router.post('/tickets',auth,async(req,res)=>{try{const u=await me(req.user.id);const {subject,message,category}=req.body;if(!subject||!message)return res.status(400).json({success:false,message:'Subject and message required.'});u.supportTickets.push({subject,message,category});await u.save();res.json({success:true,message:'Support ticket created.'})}catch(e){res.status(500).json({success:false,message:e.message})}});

// Admin Add-ons management
router.get('/admin/overview',adminAuth,async(req,res)=>{
  try{
    const users=await User.find({isDeleted:false}).select('name email mobile wallet totalEarn referralCode referredBy referralCount referralReward streak longestStreak badges level experience dailyChallengeProgress dailyChallengeClaimed dailyChallengeDate supportTickets couponsUsed');
    const tickets=users.flatMap(u=>(u.supportTickets||[]).map(t=>({userId:u._id,userName:u.name,email:u.email,mobile:u.mobile,ticket:t})));
    // Only active, still-unused coupons are visible to admin. Redeemed coupons
    // are deleted automatically by the student redemption endpoint.
    const coupons=await Coupon.find({active:true}).sort({createdAt:-1}).lean();
    res.json({success:true,analytics:{students:users.length,totalEarn:users.reduce((a,u)=>a+(u.totalEarn||0),0),referrals:users.reduce((a,u)=>a+(u.referralCount||0),0),openTickets:tickets.filter(x=>x.ticket.status!=='Resolved').length,activeCoupons:coupons.length},students:users,tickets,coupons});
  }catch(e){res.status(500).json({success:false,message:e.message})}
});
router.post('/admin/coupons',adminAuth,async(req,res)=>{
  try{
    const code=String(req.body.code||'').trim().toUpperCase().replace(/\s+/g,'');
    const reward=Number(req.body.reward);
    if(!/^[A-Z0-9_-]{3,30}$/.test(code)) return res.status(400).json({success:false,message:'Coupon code must be 3-30 letters/numbers.'});
    if(!Number.isFinite(reward)||reward<=0||reward>100000) return res.status(400).json({success:false,message:'Enter a valid reward amount.'});
    const c=await Coupon.findOneAndUpdate({code},{$set:{reward,active:true}},{upsert:true,new:true,setDefaultsOnInsert:true});
    res.json({success:true,coupon:c,message:'Coupon created and activated.'});
  }catch(e){res.status(500).json({success:false,message:e.code===11000?'Coupon already exists.':e.message})}
});
router.delete('/admin/coupons/:id',adminAuth,async(req,res)=>{
  try{const c=await Coupon.findByIdAndDelete(req.params.id);if(!c)return res.status(404).json({success:false,message:'Coupon not found'});res.json({success:true,message:'Coupon deleted.'})}
  catch(e){res.status(500).json({success:false,message:e.message})}
});
router.post('/admin/coupons/:id/toggle',adminAuth,async(req,res)=>{try{const c=await Coupon.findById(req.params.id);if(!c)return res.status(404).json({success:false,message:'Coupon not found'});c.active=!c.active;await c.save();res.json({success:true,coupon:c})}catch(e){res.status(500).json({success:false,message:e.message})}});
router.post('/admin/tickets/reply',adminAuth,async(req,res)=>{try{const {userId,ticketId,reply,status}=req.body;const u=await User.findById(userId);const t=u&&u.supportTickets.id(ticketId);if(!t)return res.status(404).json({success:false,message:'Ticket not found'});t.adminReply=String(reply||'');t.status=status||'Resolved';t.updatedAt=new Date();await u.save();res.json({success:true,message:'Reply saved'})}catch(e){res.status(500).json({success:false,message:e.message})}});
router.delete('/admin/tickets/:userId/:ticketId',adminAuth,async(req,res)=>{
  try{
    const u=await User.findById(req.params.userId);
    if(!u)return res.status(404).json({success:false,message:'Student not found'});
    const ticket=u.supportTickets.id(req.params.ticketId);
    if(!ticket)return res.status(404).json({success:false,message:'Ticket not found'});
    ticket.deleteOne();
    await u.save();
    res.json({success:true,message:'Support ticket deleted.'});
  }catch(e){res.status(500).json({success:false,message:e.message})}
});
router.post('/admin/challenge',adminAuth,async(req,res)=>{try{const {userId,action}=req.body;const u=await User.findById(userId);if(!u)return res.status(404).json({success:false,message:'Student not found'});if(action==='reset'){u.dailyChallengeProgress=0;u.dailyChallengeClaimed=false}else if(action==='complete'){u.dailyChallengeProgress=10}await u.save();res.json({success:true,message:'Challenge updated'})}catch(e){res.status(500).json({success:false,message:e.message})}});
module.exports=router;
