const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ success:false, message:"No Token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "admin") return res.status(403).json({ success:false, message:"Access Denied" });

        const admin = await Admin.findById(decoded.id).select("_id name username tokenVersion").lean();
        if (!admin) return res.status(401).json({ success:false, message:"Admin account no longer exists" });
        if (Number(decoded.tokenVersion || 0) !== Number(admin.tokenVersion || 0)) {
            return res.status(401).json({ success:false, message:"Admin session expired. Please login again." });
        }

        req.admin = { id:String(admin._id), role:"admin", name:admin.name || admin.username, username:admin.username };
        next();
    } catch (err) {
        return res.status(401).json({ success:false, message:"Invalid Token" });
    }
};
