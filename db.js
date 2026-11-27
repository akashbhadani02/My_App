const mongoose = require("mongoose");

// Reuse the MongoDB connection in Vercel/serverless environments.
const cached = global.__mongooseCache || (global.__mongooseCache = {
    conn: null,
    promise: null
});

async function connectDB() {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
        throw new Error("MONGODB_URI or MONGO_URI is not configured in Environment Variables");
    }

    // A cached connection is usable only while mongoose is actually connected.
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    if (mongoose.connection.readyState === 0) {
        cached.conn = null;
        cached.promise = null;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            minPoolSize: 0,
            bufferCommands: false
        });
    }

    try {
        cached.conn = await cached.promise;
        console.log("✅ MongoDB Connected");
        return cached.conn;
    } catch (err) {
        cached.conn = null;
        cached.promise = null;
        console.error("❌ MongoDB Connection Error:", err.message);
        throw err;
    }
}

module.exports = connectDB;
