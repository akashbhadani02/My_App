require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./db");

const authRoutes = require("./routes/auth");
const walletRoutes = require("./routes/wallet");
const profileRoutes = require("./routes/profile");
const adminRoutes=require("./routes/admin");
const questionRoutes = require("./routes/questions");
const notificationRoutes = require("./routes/notifications");
const activityRoutes = require("./routes/activities");
const bonusRoutes = require("./routes/bonus");
const addonRoutes = require("./routes/addons");
const bookRoutes = require("./routes/book");
const subscriptionRoutes = require("./routes/subscription");

const app = express();
app.disable("x-powered-by");

app.use(cors());
app.use(express.json({ limit: "4mb" }));

// Lightweight deployment/health check. It intentionally does not require
// MongoDB so Vercel can confirm the function is alive even during a DB outage.
app.get("/api/health", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ success: true, status: "ok", service: "english-app" });
});

// Always wait for MongoDB before any API route runs.
// This prevents Mongoose "users.findOne() buffering timed out" errors.
app.use("/api", async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error("❌ MongoDB unavailable:", err.message);
        return res.status(503).json({
            success: false,
            message: "Database connection failed. Please try again."
        });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin",adminRoutes);
// app.use("/api/questions", questionRoutes.router);
app.use("/api/questions", questionRoutes.router || questionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/bonus", bonusRoutes);
app.use("/api/addons", addonRoutes);
app.use("/api/book", bookRoutes);


// Dynamic PWA manifest: uses the logo selected by the admin when available.
app.get('/manifest.webmanifest', async (req, res) => {
    try {
        const Admin = require('./models/Admin');
        const admin = await Admin.findOne({}).lean();
        const icon = admin?.appLogo || '/icon-512.png';
        res.set('Content-Type', 'application/manifest+json');
        res.set('Cache-Control', 'no-store');
        res.json({
            name:'Aducate.app', short_name:'Aducate.app', description:'Aducate.app - English learning app', id:'/',
            start_url:'/login.html', scope:'/', display:'standalone', display_override:['standalone','fullscreen'], prefer_related_applications:false, background_color:'#ffffff', theme_color:'#506ef0',
            icons:[
                { src: icon, sizes:'192x192', type:'image/png', purpose:'any' },
                { src: icon, sizes:'512x512', type:'image/png', purpose:'any maskable' }
            ]
        });
    } catch(e) { res.sendFile(path.join(__dirname,'public','manifest.webmanifest')); }
});
app.use((req,res,next)=>{
    if (req.path.endsWith(".html") || req.path === "/" || req.path === "/sw.js" || req.path === "/manifest.webmanifest") {
        res.set("Cache-Control","no-store, no-cache, must-revalidate, max-age=0");
        res.set("Pragma","no-cache");
        res.set("Expires","0");
    }
    next();
});
app.use(express.static(path.join(__dirname, "public"), { etag:false, lastModified:false, maxAge:0 }));

app.get("/", (req,res)=>{
    res.sendFile(path.join(__dirname,"public","login.html"));
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(`🚀 Server Running on Port ${PORT}`);
    });
}