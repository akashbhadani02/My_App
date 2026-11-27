const mongoose = require("mongoose");

// Global cache is reused across warm Vercel invocations. Keep pool modest because
// serverless may create multiple concurrent function instances.
const cached = global.__mongooseCache || (global.__mongooseCache = {
    conn: null,
    promise: null
});

async function connectDB() {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGODB_URI or MONGO_URI is not configured in Environment Variables");

    if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;

    // Clear a failed/stale cache so the next invocation can retry cleanly.
    if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
        cached.conn = null;
        cached.promise = null;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 20000,
            connectTimeoutMS: 20000,
            socketTimeoutMS: 45000,
            maxPoolSize: 5,
            minPoolSize: 0,
            maxIdleTimeMS: 30000,
            waitQueueTimeoutMS: 10000,
            bufferCommands: false
        });
    }

    try {
        cached.conn = await cached.promise;
        console.log("MongoDB connected");
        return cached.conn;
    } catch (err) {
        cached.conn = null;
        cached.promise = null;
        console.error("MongoDB connection error:", err.message);
        throw err;
    }
}

module.exports = connectDB;
