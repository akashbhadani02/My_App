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
    const c=String(req.body.code||'').trim().toUpperCase().replace(/\s+/g,'');
    if(!c) return res.status(400).json({success:false,message:'Coupon code required.'});

    // The same active coupon is available to every student, but each account
    // can redeem a particular code only once. The coupon stays active until
    // it is never auto-deleted: only the admin's manual DELETE action removes it.
    const coupon=await Coupon.findOne({code:c,active:true}).lean();
    if(!coupon) return res.status(400).json({success:false,message:'Invalid or expired coupon code.'});
    // A single-user coupon can only be redeemed by the student selected by admin.
    if(coupon.scope==='single' && String(coupon.targetUser||'')!==String(u._id))
      return res.status(403).json({success:false,message:'This coupon is reserved for another student.'});
    const reward=Number(coupon.reward||0);
    if(!Number.isFinite(reward)||reward<=0)
      return res.status(400).json({success:false,message:'Invalid coupon reward.'});

    // Atomic account update prevents the same student redeeming a code twice.
    const updated=await User.findOneAndUpdate(
      {_id:u._id,couponsUsed:{$ne:c}},
      {$inc:{wallet:reward,totalEarn:reward},$addToSet:{couponsUsed:c}},
      {new:true}
    );
    if(!updated) return res.status(400).json({success:false,message:'You have already used this coupon code.'});

    if(coupon.scope==='single') {
      // A single-user coupon is one-time only: remove it after successful redemption.
      await Coupon.deleteOne({_id:coupon._id,scope:'single'});
    } else {
      // ALL USERS coupons must remain active after every redemption. Never delete them here;
      // only the admin's explicit manual DELETE action may remove an all-users coupon.
      // Record each student for the admin's long-press redemption history.
      await Coupon.updateOne(
        {_id:coupon._id,active:true,'redeemedBy.user':{$ne:u._id}},
        {$push:{redeemedBy:{user:u._id,redeemedAt:new Date()}}}
      );
    }
    res.json({success:true,reward,wallet:updated.wallet,message:`Coupon ${c} applied successfully. ₹${reward} added.`});
  }catch(e){res.status(500).json({success:false,message:e.message})}
});

router.get('/tickets',auth,async(req,res)=>{const u=await me(req.user.id);res.json({success:true,tickets:u.supportTickets||[]})});
router.post('/tickets',auth,async(req,res)=>{try{const u=await me(req.user.id);const {subject,message,category}=req.body;if(!subject||!message)return res.status(400).json({success:false,message:'Subject and message required.'});u.supportTickets.push({subject,message,category});await u.save();res.json({success:true,message:'Support ticket created.'})}catch(e){res.status(500).json({success:false,message:e.message})}});

// Admin Add-ons management
router.get('/admin/overview',adminAuth,async(req,res)=>{
  try{
    const users=await User.find({isDeleted:false}).select('name email mobile wallet totalEarn referralCode referredBy referralCount referralReward streak longestStreak badges level experience dailyChallengeProgress dailyChallengeClaimed dailyChallengeDate supportTickets couponsUsed');
    const tickets=users.flatMap(u=>(u.supportTickets||[]).map(t=>({userId:u._id,userName:u.name,email:u.email,mobile:u.mobile,ticket:t})));
    // Show every active coupon, including all-users redemption history.
    const couponRows=await Coupon.find({active:true})
      .populate('targetUser','name mobile email')
      .populate('redeemedBy.user','name email mobile')
      .sort({updatedAt:-1,createdAt:-1}).lean();
    // Merge stored redemption records with legacy User.couponsUsed data so
    // older redemptions are also visible in the admin long-press history.
    const coupons=couponRows.map(c=>{
      const byId=new Map();
      (c.redeemedBy||[]).forEach(r=>{if(r.user?._id)byId.set(String(r.user._id),r)});
      users.forEach(u=>{if((u.couponsUsed||[]).includes(c.code)&&!byId.has(String(u._id)))byId.set(String(u._id),{user:{_id:u._id,name:u.name,email:u.email,mobile:u.mobile},redeemedAt:null})});
      return {...c,redeemedBy:[...byId.values()]};
    });
    res.json({success:true,analytics:{students:users.length,totalEarn:users.reduce((a,u)=>a+(u.totalEarn||0),0),referrals:users.reduce((a,u)=>a+(u.referralCount||0),0),openTickets:tickets.filter(x=>x.ticket.status!=='Resolved').length,activeCoupons:coupons.length},students:users,tickets,coupons});
  }catch(e){res.status(500).json({success:false,message:e.message})}
});
router.post('/admin/coupons',adminAuth,async(req,res)=>{
  try{
    let code=String(req.body.code||'').trim().toUpperCase().replace(/\s+/g,'');
    const reward=Number(req.body.reward);
    const scope=String(req.body.scope||'all').toLowerCase();
    const targetUserId=String(req.body.targetUserId||'').trim();
    if(!Number.isFinite(reward)||reward<=0) return res.status(400).json({success:false,message:'Enter a valid positive reward amount.'});
    if(!['all','single'].includes(scope)) return res.status(400).json({success:false,message:'Choose All Users or Single User.'});
    if(scope==='single'&&!targetUserId) return res.status(400).json({success:false,message:'Select the student for this single-user coupon.'});
    if(code && !/^[A-Z0-9_-]{3,30}$/.test(code)) return res.status(400).json({success:false,message:'Coupon code must be 3-30 letters/numbers.'});
    let targetUser=null;
    if(scope==='single') {
      targetUser=await User.findOne({_id:targetUserId,isDeleted:false}).select('_id name');
      if(!targetUser) return res.status(404).json({success:false,message:'Selected student was not found.'});
    }
    // If admin leaves the code blank, generate a unique code for any valid amount.
    if(!code){
      for(let i=0;i<10;i++){
        const candidate=require('crypto').randomBytes(5).toString('hex').toUpperCase();
        if(!await Coupon.exists({code:candidate})){code=candidate;break;}
      }
      if(!code) return res.status(500).json({success:false,message:'Could not generate a unique coupon code. Please retry.'});
    }
    // Multiple coupons may remain active at the same time.
    const c=await Coupon.findOneAndUpdate({code},{$set:{reward,scope,targetUser:scope==='single'?targetUser._id:null,active:true}},{upsert:true,new:true,setDefaultsOnInsert:true}).populate('targetUser','name mobile email');
    const audience=scope==='single'?`only for ${targetUser.name}`:'for all students';
    res.json({success:true,coupon:c,code:c.code,message:`Coupon activated ${audience}: ${c.code}. Other active coupons remain available.`});
  }catch(e){res.status(500).json({success:false,message:e.code===11000?'Coupon already exists.':e.message})}
});
router.delete('/admin/coupons/:id',adminAuth,async(req,res)=>{
  // This is the only path that deletes an ALL USERS coupon: explicit admin action.
  try{const c=await Coupon.findByIdAndDelete(req.params.id);if(!c)return res.status(404).json({success:false,message:'Coupon not found'});res.json({success:true,message:'Coupon deleted manually by admin.'})}
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
