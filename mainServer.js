const { createServer } = require("http");
const express = require("express");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const fetch = require("node-fetch");
require("dotenv").config();

const { v2: cloudinary } = require("cloudinary");
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã…Â  ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â²Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â± Translation Service
 * ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã†â€™ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¨ÃƒËœÃ‚Â© Google ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±ÃƒËœÃ‚Â© (ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â€šÂ¬ LibreTranslate).
 */
async function translateToEnglish(text) {
    try {
        const result = await require("./service/translation.service.js").translateContent({
            contentId: `classify-${Date.now()}`,
            content: text,
            contentVersion: "1",
            targetLang: "en",
            userId: "internal-classifier",
            isLong: false,
        });
        return result.ok ? result.translatedText : text;
    } catch (err) {
        console.error("Classification translate failed:", err.message);
        return text; // fallback Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Âµ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â  ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±
    }
}

const sign = require("./datastore/signin_signupDao_firebase.js");// SECURITY (P2): Firebase ID token verification for Google sign-in.
const { verifyFirebaseIdToken } = require("./admin/firebaseIdToken.js");
const dao = require("./datastore/Dao.js");
const DaoForDbUser = require("./datastore/signin_signupDao_firebase.js");
const { saveContent_Article_Novels, saveContent_Posts, saveContent_Comment } = require("./service/saveContent.js");
const { getProfileContent } = require("./service/profileContentService.js");
const { translateContent, getProviderInfo } = require("./service/translation.service.js");
const { robotsTxt, sitemapXml } = require("./service/seo.service.js");
const { registerView, resolveViewerId, checkRate } = require("./service/viewCounter.service.js");
const {
    MEDIA_LIMITS,
    isConfigured,
    buildSignedUpload,
    validateMediaManifest,
    deleteCloudinaryAssetsIfUnused,
} = require("./service/cloudinary.service.js");
const {
    initAudioHub,
    searchOpenverse,
    searchItunes,
    AMBIENT_TRACKS,
    QURAN_RECITERS,
    quranSurahTrack,
} = require("./service/audioHub.service.js");
// Firebase Realtime Database ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  getFocusData Ãƒâ„¢Ã‹â€ /update(ref(db...)))
// (Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Âª ÃƒËœÃ‚ÂªÃƒâ„¢Ã‚ÂÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã…Â ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â£ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â²ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡ Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂµÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â­: ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã…Â ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§)
const {
    db,
    ref,
    set,
    get,
    update,
    remove,
    child,
    push,
    query,
    equalTo,
    orderByChild,
    runTransaction,
} = require("./datastore/firebase");

const categories = JSON.parse(fs.readFileSync("./categories.json", "utf8"));
const novel_categories = JSON.parse(fs.readFileSync("novel_categories.json", "utf8"));

// ======================================================
// APP + HTTP SERVER + SOCKET.IO
// ======================================================

const allowedOrigins = [
    "https://bayan-space.vercel.app",
    "https://bayan-production-0201.up.railway.app",
    "http://localhost:3000",
];

// Dev-only: allow the local React dev server(s). Production keeps the
// strict list above ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â no wildcard, and these are never sent in prod.
if (process.env.NODE_ENV !== "production") {
    allowedOrigins.push("http://localhost:3001", "http://localhost:3011");
}

const app = express();
const httpServer = createServer(app);

// CORS Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª Express ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â«Ãƒâ„¢Ã¢â‚¬Å¾ signup Ãƒâ„¢Ã‹â€  login
app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);

app.options("*", cors()); // handle preflight (older Express)
app.use(express.json());
// CORS ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â®ÃƒËœÃ‚Â§ÃƒËœÃ‚Âµ ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â€šÂ¬ Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
    },
    transports: ["websocket", "polling"],
});

const PORT = process.env.PORT || 4000;

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
}));


app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));



function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    try {
        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );

        req.user = decoded;

        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }
}

// ======================================================
// REDIS + MEMORY CACHE
// ======================================================

let redisClient = null;
let useRedis = false;

const memoryCache = new Map();
const onlineUsers = new Map();

(async() => {
    try {
        const redis = require("redis");
        redisClient = redis.createClient({
            url: process.env.REDIS_URL
        });

        if (!process.env.REDIS_URL) {
            console.log("No Redis URL -> Memory Cache Enabled");
        }

        try {
            await redisClient.connect();
            useRedis = true;
            console.log("ÃƒÂ°Ã…Â¸Ã…Â¸Ã‚Â¢ Redis Connected");
        } catch {
            console.log("ÃƒÂ¢Ã…Â¡Ã‚Â  Redis not available -> Memory Cache Enabled");
            useRedis = false;
        }
    } catch {
        console.log("ÃƒÂ¢Ã…Â¡Ã‚Â  Redis package not installed -> Memory Cache Enabled");
        useRedis = false;
    }
})();

// ======================================================
// HELPERS (Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â´ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â©)
// ======================================================

function generateUniqueId() {
    return Math.floor(Math.random() * 999999999).toString().padStart(9, "1");
}

function generateToken(payload) {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "720h" });
}
// SECURITY (Phase 1): JWTs must NEVER carry secrets. Payload is identity-only:
// { id, name, username } ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â no password, no bcrypt hash, no tokens.
function tokenPayloadFromUser(user) {
    return { id: user.Id_user, name: user.F_user, username: user.S_user };
}
// Verify a Bearer token and require that the user still exists in the DB.
// Rejects suspended/banned accounts (accountState). attachUser=true ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ req.userProfile
// holds the profile (incl. psw) for server-side checks; never serialized.
function requireUser(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    let decoded;
    try {
        decoded = jwt.verify(authHeader.slice(7), process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
    if (!decoded || decoded.id == null) {
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
    if (decoded.pass !== undefined) {
        // Legacy tokens (pre-security-fix) embed the bcrypt hash. Rejected:
        // forces a fresh login and retires every legacy token.
        return res.status(401).json({ success: false, message: "Token expired, please sign in again" });
    }
    (async () => {
        try {
            const user = await DaoForDbUser.findbyID(decoded.id);
            if (!user) return res.status(401).json({ success: false, message: "Invalid token" });
            const state = String(user.accountState || "active");
            if (state === "banned") return res.status(403).json({ success: false, message: "Account banned" });
            req.user = { id: decoded.id, name: decoded.name, username: decoded.username };
            req.userProfile = user;
            req.userAccountState = state;
            next();
        } catch (err) {
            console.error("requireUser error:", err.message);
            return res.status(500).json({ success: false, message: "Auth error" });
        }
    })();
}
// Same userData shape as before, minus the password. Compatibility preserved.
function buildUserData(user, settings) {
    return {
        imgProfile: user.imgProfile,
        id: user.Id_user,
        name: user.F_user,
        username: user.S_user,
        Bio: user.Bio,
        followers: user.followers,
        following: user.following,
        IdPoster: user.Posters,
        settings,
    };
}
// Login/verification endpoints: fixed, tiny bucket per IP (memory-based,
// per-instance ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â acceptable for the single Railway instance).
const loginBuckets = new Map();
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX = 20;
function loginRateLimit(req, res, next) {
    const key = (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    const b = loginBuckets.get(key);
    if (!b || now - b.firstAt > LOGIN_WINDOW_MS) {
        loginBuckets.set(key, { count: 1, firstAt: now });
        return next();
    }
    b.count += 1;
    if (b.count > LOGIN_MAX) {
        return res.status(429).json({ success: false, message: "Too many attempts, try later" });
    }
    next();
}
// Socket-level rate limiter (fixed window, per-user/event, in-memory).
const sockBuckets = new Map();
function rateOK(key, max, windowMs) {
    const now = Date.now();
    const b = sockBuckets.get(key);
    if (!b || now - b.firstAt > windowMs) {
        sockBuckets.set(key, { count: 1, firstAt: now });
        if (sockBuckets.size > 20000) sockBuckets.clear();
        return true;
    }
    b.count += 1;
    return b.count <= max;
}
// Interests allowlist: only known keys, bounded string values.
function sanitizeInterests(input) {
    if (!input || typeof input !== "object") return null;
    const out = {};
    for (const key of ["articles", "novels"]) {
        const list = Array.isArray(input[key]) ? input[key] : [];
        const clean = list
            .filter((v) => typeof v === "string")
            .map((v) => v.trim().slice(0, 60))
            .filter(Boolean)
            .slice(0, 30);
        if (clean.length) out[key] = clean;
    }
    return out.articles || out.novels ? out : null;
}

function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

function paginate(data, limit = 20, cursor = 0) {
    return {
        items: data.slice(cursor, cursor + limit),
        nextCursor: cursor + limit < data.length ? cursor + limit : null,
    };
}

function getTodayDate() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${months[today.getMonth()]} ${today.getFullYear()}`;
}

function getCurrentTime() {
    const now = new Date();
    return [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((n) => String(n).padStart(2, "0"))
        .join(":");
}

// ======================================================
// CACHE SYSTEM
// ======================================================

async function cacheGet(key) {
    try {
        if (useRedis && redisClient?.isReady) {
            const data = await redisClient.get(key);
            return data ? JSON.parse(data) : null;
        }

        const entry = memoryCache.get(key);

        if (!entry) return null;

        // ÃƒËœÃ‚Â­ÃƒËœÃ‚Â°Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂµÃƒËœÃ‚Â± ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡ ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¡
        if (Date.now() >= entry.expiresAt) {
            memoryCache.delete(key);
            return null;
        }

        return entry.value;
    } catch (err) {
        console.error("cacheGet error:", err.message);
        return null;
    }
}

async function cacheSet(key, value, ttl = 60) {
    try {
        if (useRedis && redisClient?.isReady) {
            await redisClient.setEx(
                key,
                ttl,
                JSON.stringify(value)
            );
        } else {
            memoryCache.set(key, {
                value,
                expiresAt: Date.now() + ttl * 1000
            });
        }
    } catch (err) {
        console.error("cacheSet error:", err.message);
    }
}

async function cacheDel(key) {
    try {
        if (useRedis && redisClient?.isReady) {
            await redisClient.del(key);
        }

        memoryCache.delete(key);
    } catch (err) {
        console.error("cacheDel error:", err.message);
    }
}

// Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¸ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂµÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Âª (Audio Hub) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§ÃƒËœÃ‚Â´ Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â€šÂ¬ fetch Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‚Â
initAudioHub({ cacheGet, cacheSet, fetchImpl: fetch });


async function cacheDelPattern(pattern) {
    // ÃƒËœÃ‚Â­ÃƒËœÃ‚Â°Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â§ÃƒËœÃ‚ÂªÃƒâ„¢Ã…Â ÃƒËœÃ‚Â­ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  Memory Cache
    for (const key of memoryCache.keys()) {
        if (key.startsWith(pattern.replace("*", ""))) {
            memoryCache.delete(key);
        }
    }

    // ÃƒËœÃ‚Â­ÃƒËœÃ‚Â°Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â§ÃƒËœÃ‚ÂªÃƒâ„¢Ã…Â ÃƒËœÃ‚Â­ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  Redis
    if (useRedis && redisClient?.isReady) {
        try {
            for await (const key of redisClient.scanIterator({
                MATCH: pattern,
                COUNT: 100
            })) {
                await redisClient.del(key);
            }
        } catch (err) {
            console.error("cacheDelPattern error:", err.message);
        }
    }
}

async function invalidateUserCache(userId) {
    if (userId == null) return;
    await cacheDel(`user:${Number(userId)}`);
}

async function invalidateFeedCache(type) {
    await cacheDelPattern(`${type}:*`);
}

async function invalidateAllFeedCaches() {
    await Promise.all([
        invalidateFeedCache("posts"),
        invalidateFeedCache("articles"),
        invalidateFeedCache("novels")
    ]);
}


// ======================================================
// USER CACHE
// ======================================================

async function getUser(userId) {
    try {

        userId = Number(userId);

        // ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¡ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚ÂµÃƒËœÃ‚Â­ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Â¦
        if (Number.isNaN(userId)) {
            console.error("Invalid userId:", userId);
            return null;
        }

        const cached = await cacheGet(`user:${userId}`);
        if (cached) return cached;

        const user = await DaoForDbUser.findbyID(userId);
        if (user) await cacheSet(`user:${userId}`, user, 300);
        return user;
    } catch (err) {
        console.log("getUser error:", err.message);
        return null;
    }
}

// ======================================================
// ENGAGEMENT SYSTEM
// ======================================================

async function increaseLike(postId, userId) {
    const path = `posts/posts${postId}`;
    await dao.incrementFieldTransaction(path, "likes", 1);
    await dao.likeContent("posts", postId, userId);
}

async function decreaseLike(postId, userId) {
    const path = `posts/posts${postId}`;
    await dao.incrementFieldTransaction(path, "likes", -1);
    await dao.unlikeContent("posts", postId, userId);
}

async function trackEngagement(contentId, userId, type) {
    try {
        const key = `eng:${contentId}`;
        let data = (await cacheGet(key)) || { likes: 0, comments: 0, views: 0 };

        if (type === "view") data.views += 1;

        if (type === "like") {
            const liked = await dao.hasUserLiked(contentId, userId);
            if (liked) return data;
            data.likes += 1;
            await increaseLike(contentId, userId);
        }

        if (type === "unlike") {
            const liked = await dao.hasUserLiked(contentId, userId);
            if (!liked) return data;
            data.likes = Math.max(0, data.likes - 1);
            await decreaseLike(contentId, userId);
        }

        if (type === "comment") data.comments += 1;

        await cacheSet(key, data, 86400);
        return data;
    } catch (err) {
        console.log("trackEngagement error:", err.message);
    }
}

// ======================================================
// RANKING + RECOMMENDATION ENGINE
// ======================================================

async function getScore(content) {
    try {
        const eng = (await cacheGet(`eng:${content.id}`)) || { likes: 0, comments: 0, views: 0 };
        return eng.likes * 3 + eng.comments * 5 + eng.views;
    } catch {
        return 0;
    }
}

async function recommendFeed(user, type) {
    try {
        // "all" merges the three canonical collections; individual types keep
        // the existing single-collection behavior.
        const types =
            String(type).toLowerCase() === "all"
                ? ["posts", "articles", "novels"]
                : [String(type).toLowerCase()];

        let allContent = [];
        // ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â¯ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾: id ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â§ Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¹
        // (Ãƒâ„¢Ã…Â ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â´Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ type ÃƒËœÃ‚ÂªÃƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬ËœÃƒâ„¢Ã‚Â Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§)
        const collectionTypeById = new Map();

        for (const t of types) {
            // ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â­ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¨ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¶Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚Â (user=null) Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™
            // ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ÃƒËœÃ‚ÂªÃƒËœÃ…â€™ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â ÃƒËœÃ‚Â°Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â¨ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â£ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¡.
            const interests =
                (user && (t === "novels"
                    ? (user?.interesting?.novels || [])
                    : (user?.interesting?.articles || []))) || [];

            // Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¹ Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¹ (fallback) Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¹ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¾
            // ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â° Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¦ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â€šÂ¬ feed Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  posts Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Â° novels/articles
            let typeContent = [];

            // =====================================
            // Personalized Feed
            // =====================================
            if (interests.length > 0) {
                for (const category of interests) {
                    const cacheKey = `${t}:${category}`;

                    let results = await cacheGet(cacheKey);

                    if (!results) {
                        results = await dao.getContentByCategory(t, category, 20);

                        if (results && results.length > 0) {
                            await cacheSet(cacheKey, results, 60);
                        }
                    }

                    if (Array.isArray(results) && results.length > 0) {
                        typeContent.push(...results);
                    }
                }
            }

            // =====================================
            // ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¬ ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â©
            // =====================================
            if (typeContent.length === 0) {
                console.log("No personalized feed found. Loading random content...", t);
                typeContent = await dao.getAllContent(t, 20);
            }

            // Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¹ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¡ Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¬ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â·ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¶
            for (const item of typeContent) {
                if (!item || item.id == null) continue;
                const key = String(item.id);
                collectionTypeById.set(key, t);
                allContent.push(item);
            }
        }

        // =====================================
        // ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â²ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â±ÃƒËœÃ‚Â±ÃƒËœÃ‚Â©
        // =====================================
        console.log("Before filter:", allContent.length);

        const seen = new Set();

        allContent = allContent.filter(item => {
            const key = String(item?.id ?? "");
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        console.log("After filter:", allContent.length);

        // Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¹ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Â¡ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â§ Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¹ (ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â¯ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â«Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¡) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
        // ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¾ type ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â«Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ‚Â§ (ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾ parentType) ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  ÃƒËœÃ‚ÂºÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ‚Â§ (ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â©).
        allContent = allContent.map((item) => ({
            ...item,
            type: collectionTypeById.get(String(item.id)) || item.type || "posts",
        }));

        // =====================================
        // ÃƒËœÃ‚Â­ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â€šÂ¬ Score Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â°
        // =====================================
        const scored = await Promise.all(
            allContent.map(async (item) => ({
                ...item,
                score: await getScore(item)
            }))
        );
        console.log("All scored: ", scored.length);

        // =====================================
        // ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚ÂªÃƒâ„¢Ã…Â ÃƒËœÃ‚Â¨: ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â€šÂ¬ score ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ‚Â§ÃƒËœÃ…â€™ ÃƒËœÃ‚Â«Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â« ÃƒËœÃ‚Â²Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¯ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â³ÃƒËœÃ‚Â§Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â€šÂ¬ score
        // (ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ timestamp ÃƒËœÃ‚ÂªÃƒËœÃ‚Â°Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â£ÃƒËœÃ‚Â®Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â )
        // =====================================
        const tsOf = (item) => {
            const ts = Number(item?.timestamp);
            if (Number.isFinite(ts) && ts > 0) return ts;
            try {
                if (item?.date) {
                    const ms = new Date(`${item.date} ${item.time || ""}`.trim()).getTime();
                    if (Number.isFinite(ms)) return ms;
                }
            } catch (_) { /* ignore */ }
            return 0;
        };
        scored.sort((a, b) => (b.score - a.score) || (tsOf(b) - tsOf(a)));

        console.log("All scored2: ", scored.length);
        return scored;

    } catch (err) {

        console.error("recommendFeed error:", err);

        return [];
    }
}
async function enrichContent(contentArray) {
    return Promise.all(
        contentArray.map(async (item) => {
            const profile = await getUser(item.autherID);

            return {
                ...item,
                userData: {
                    F_user: profile?.F_user ?? "Unknown User",
                    Id_user: profile?.Id_user ?? "000000000",
                    S_user: profile?.S_user ?? "@unknown_user",
                    imgProfile: profile?.imgProfile ?? ""
                },
            };
        })
    );
}

// ======================================================
// CLASSIFICATION HELPERS
// ======================================================

// translateToEnglish Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬ËœÃƒâ„¢Ã‚Â ÃƒËœÃ‚Â£ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Translation Service (LibreTranslate)

function classifyMultipleCategories(text, threshold = 0.05) {
    if (!text || typeof text !== "string") return [];
    text = text.toLowerCase();
    let scores = {};
    const totalWords = text.split(/\s+/).length || 1;

    for (const [category, keywords] of Object.entries(categories)) {
        let weightedScore = 0;
        for (const word of keywords) {
            const weight = word.length >= 6 ? 1.5 : 1;
            const matches = text.match(new RegExp(`\\b${word.toLowerCase()}\\b`, "g"));
            if (matches) weightedScore += matches.length * weight;
        }
        scores[category] = weightedScore / totalWords;
    }

    const maxScore = Math.max(...Object.values(scores));
    const sortedCategories = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const selectedCategories = sortedCategories
        .filter(([_, score]) => score >= Math.max(threshold, maxScore * 0.6))
        .map(([cat]) => cat);

    if (selectedCategories.length === 0 && sortedCategories.length > 0)
        selectedCategories.push(sortedCategories[0][0]);

    console.log("Category scores:", scores);
    console.log("Selected categories:", selectedCategories);
    return selectedCategories;
}

function classifyNovel(text, threshold = 2) {
    text = text.toLowerCase();

    function matchCategory(categoryObj) {
        if (!categoryObj || typeof categoryObj !== "object") {
            console.warn("Category object undefined or null");
            return [];
        }

        let scores = {};
        for (const [cat, keywords] of Object.entries(categoryObj)) {
            let count = 0;
            for (const word of keywords) {
                if (text.includes(word.toLowerCase())) count++;
            }
            scores[cat] = count;
        }

        let selected = Object.keys(scores).filter((cat) => scores[cat] >= threshold);
        if (selected.length === 0) {
            const maxScore = Math.max(...Object.values(scores));
            selected = Object.keys(scores).filter((cat) => scores[cat] === maxScore);
        }
        return selected;
    }

    return {
        Genres: matchCategory(novel_categories.Genres),
        Themes: matchCategory(novel_categories.Themes),
        Tone: matchCategory(novel_categories.Tone),
        Purpose: matchCategory(novel_categories.Purpose),
    };
}

// ======================================================
// REST API ROUTES
// ======================================================

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â®Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾
app.post("/signin", loginRateLimit, async(req, res) => {
    const { identifierUser, password } = req.body;
    if (!identifierUser || !password)
        return res.status(400).json({ message: "Please enter all fields" });

    try {
        const user = await sign.login_user(identifierUser, password);
        if (!user) return res.status(401).json({ message: "Invalid credentials" });

        // SECURITY (Phase 1): identity-only JWT ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â the bcrypt hash (pass) is no
        // longer embedded. Existing clients only read accessToken/userData.
        const payload = tokenPayloadFromUser(user);
        const settings =
            await sign.getUserSettings(
                user.Id_user
            );
        const userData = {
            imgProfile: user.imgProfile,
            id: user.Id_user,
            name: user.F_user,
            username: user.S_user,
            Bio: user.Bio,
            followers: user.followers,
            following: user.following,
            IdPoster: user.Posters,
            settings
        };

        res.json({ message: "Login successful", accessToken: generateToken(payload), userData });
    } catch (err) {
        console.error("Signin error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â®Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¬Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾
app.post("/authGoogle", loginRateLimit, async(req, res) => {
    // SECURITY (P2): the client MUST present the Firebase ID token obtained
    // from the actual Google popup sign-in. Signature/issuer/audience/expiry
    // are verified server-side (admin/firebaseIdToken.js); uid and email are
    // taken from the VERIFIED claims Ã¢â‚¬â€ never from the raw body Ã¢â‚¬â€ and must
    // match an existing Bayan account. No JWT is issued otherwise.
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ message: "Missing idToken" });
    try {
        let claims;
        try {
            claims = await verifyFirebaseIdToken(idToken);
        } catch (verr) {
            if (verr.code === "FIREBASE_ADMIN_INIT_FAILED" || verr.message?.startsWith("FIREBASE_ADMIN_INIT_FAILED")) {
                console.error("authGoogle: admin SDK not configured:", verr.message);
                return res.status(503).json({ message: "GOOGLE_AUTH_UNAVAILABLE" });
            }
            console.error("authGoogle: idToken verification failed:", verr.code || verr.message);
            return res.status(401).json({ message: "Invalid Google sign-in" });
        }
        const email = claims.email;
        const uid = claims.uid;
        const existingUser = await sign.findUserByEmailAndUid(email, uid);
        if (!existingUser)
            return res.status(404).json({ message: "Invalid login credentials.", email, uid });
        // SECURITY (Phase 1): identity-only JWT Ã¢â‚¬â€ no password hash inside.
        const payload = tokenPayloadFromUser(existingUser);
        const settings = await sign.getUserSettings(existingUser.Id_user);
        res.json({ message: "Login successful", accessToken: generateToken(payload), userData: buildUserData(existingUser, settings) });
    } catch (err) {
        console.error("Google login error:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â­ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯
app.post("/signup", async(req, res) => {
    const { fullName, username, email, uid, password } = req.body;
    if (!fullName || !username || !password)
        return res.status(400).json({ message: "Please enter all fields" });

    try {
        const existsName = await sign.logup_user_check_fsp(fullName, username, password);
        if (existsName) return res.status(409).json({ message: "Username already exists" });

        const existingUser = await sign.findUserByEmailAndUid(email, uid);

        if (existingUser) {
            const payload = tokenPayloadFromUser(existingUser);
            const settings =
                await sign.getUserSettings(
                    existingUser.Id_user
                );
            const userData = {
                imgProfile: existingUser.imgProfile,
                id: existingUser.Id_user,
                name: existingUser.F_user,
                username: existingUser.S_user,
                Bio: existingUser.Bio,
                followers: existingUser.followers,
                following: existingUser.following,
                IdPoster: existingUser.Posters,
                settings
            };
            return res.json({ message: "Login successful", token: generateToken(payload), userData });
        }

        const uniqueId = generateUniqueId();
        const user = await sign.logup_user_Insert(fullName, username, email, uid, uniqueId, password);
        // SECURITY (Phase 1): the plaintext password is never signed into a JWT.
        const token = generateToken(tokenPayloadFromUser(user));
        const userData = {
            imgProfile: user.imgProfile,
            id: user.Id_user,
            name: user.F_user,
            username: user.S_user,
            Bio: user.Bio,
            followers: user.followers,
            following: user.following,
            IdPoster: user.Posters,
            settings: user.settings
        };

        res.status(201).json({ message: "Signup successful", token, userData });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¡ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â€šÂ¬ Token
app.post("/auth", (req, res) => {
    if (!req.headers.authorization?.startsWith("Bearer "))
        return res.status(401).json({ message: "No token provided" });

    const token = req.headers.authorization.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async(err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        // SECURITY (Phase 1): /auth no longer re-derives identity from a hash.
        // New tokens carry { id, name, username }; the user record is loaded
        // fresh from the DB. Legacy tokens (with `pass`) are rejected with a
        // clear message so the client re-authenticates ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â the ONLY behavior
        // change, required to retire hash-bearing tokens.
        if (!decoded || decoded.id == null) return res.status(403).json({ message: "Invalid token" });
        if (decoded.pass !== undefined) {
            return res.status(401).json({ message: "Token expired, please sign in again" });
        }
        try {
            const user = await DaoForDbUser.findbyID(decoded.id);
            if (!user) return res.status(403).json({ message: "Invalid token" });
            if (String(user.accountState || "active") === "banned") {
                return res.status(403).json({ message: "Account banned" });
            }
            const settings =
                await sign.getUserSettings(
                    user.Id_user
                );
            const userData = {
                imgProfile: user.imgProfile,
                id: user.Id_user,
                name: user.F_user,
                username: user.S_user,
                Bio: user.Bio,
                followers: user.followers,
                following: user.following,
                IdPoster: user.Posters,
                settings
            };
            res.json({ valid: true, userData });
        } catch (err) {
            res.status(500).json({ message: "Error fetching user data" });
        }
    });
});

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â®ÃƒËœÃ‚ÂµÃƒâ„¢Ã…Â 
// SECURITY (Phase 1): was verified only at signature level, and the profile
// DAOs were invoked with decoded.pass (the hash carried in legacy JWTs) as an
// auth side-channel. Now: full requireUser middleware (DB-backed identity),
// the caller may only edit THEIR OWN profile row, DAO calls go through new
// direct-by-id variants (no password side-channel), and input length is
// validated. Old DAO-by-password functions stay unused by routes.
app.post("/editProfile", requireUser, async(req, res) => {
    if (req.userAccountState === "suspended") return res.status(403).json({ success: false, message: "Account suspended" });
    const { Updatable, status } = req.body;
    const statusKey = String(status || "").toLowerCase();
    const trimmedValue = typeof Updatable === "string" ? Updatable.trim() : Updatable;
    try {
        if ((statusKey === "name" || statusKey === "img") &&
            (typeof trimmedValue !== "string" || !trimmedValue || trimmedValue.length > 80)) {
            return res.status(400).json({ message: "Invalid value" });
        }
        if (statusKey === "bio" &&
            (typeof trimmedValue !== "string" || trimmedValue.length > 500)) {
            return res.status(400).json({ message: "Bio value is required (may be empty string, max 500 chars)" });
        }
        const uid = req.user.id;
        if (statusKey === "img") {
            await sign.setProfileImgProfileById(uid, trimmedValue);
        } else if (statusKey === "name") {
            await sign.setProfileFieldById(uid, "F_user", trimmedValue);
        } else if (statusKey === "bio") {
            await sign.setProfileFieldById(uid, "Bio", trimmedValue);
        } else {
            return res.status(400).json({ message: "Invalid status" });
        }
        const updatedUser = await sign.findbyID(uid);
        if (!updatedUser || updatedUser.Id_user == null)
            return res.status(500).json({ message: "Profile update did not return user data" });
        await invalidateUserCache(updatedUser.Id_user);
        const settings = await sign.getUserSettings(updatedUser.Id_user);
        res.json({ message: "Profile updated", userData: buildUserData(updatedUser, settings) });
    } catch (err) {
        console.error("Profile update error:", err.message);
        res.status(500).json({ message: err?.message || "Error updating profile" });
    }
});


// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¸ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â  (Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â«Ãƒâ„¢Ã¢â‚¬Å¡ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â€šÂ¬ autherID Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â©)
app.post("/saveArticle_novels", requireUser, async (req, res) => {
    if (req.userAccountState === "suspended") return res.status(403).json({ status: "error", message: "Account suspended" });
    try {
        const trustedAuthorId = String(req.user?.id ?? "");
        if (!trustedAuthorId) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }

        const payload = { ...req.body, autherID: trustedAuthorId };
        const result = await saveContent_Article_Novels(payload);

        if (!result?.success) {
            return res.status(400).json({
                status: "error",
                message: result?.message || "Failed to save content",
            });
        }

        // ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¸ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·
        await invalidateFeedCache("articles");
        await invalidateFeedCache("novels");

        return res.status(200).json({ status: "ok", message: "Your content saved successfully", id: result.id });
    } catch (err) {
        console.error("POST /saveArticle_novels error:", err);
        return res.status(500).json({ status: "error", message: "Failed to save content" });
    }
});



// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¸ ÃƒËœÃ‚Â¨Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚Âª ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â routes a comment payload to saveContent_Comment,
// normal posts to the existing normal-post path.
// Identity: the verified JWT payload `{ id, name, username, pass }` is the
// authoritative author ID; a mismatching client-supplied autherID is overridden.
app.post("/saveposts", requireUser, async (req, res) => {
  if (req.userAccountState === "suspended") return res.status(403).json({ status: "error", message: "Account suspended" });
  try {
    const { comment_on } = req.body;

    // ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¬ Comment payloads carry `comment_on` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â persist in the comments path.
    if (comment_on) {
      const trustedAuthorId = String(req.user?.id ?? "");
      if (!trustedAuthorId) {
        return res.status(401).json({ status: "error", message: "Unauthorized" });
      }

      const payload = { ...req.body, autherID: trustedAuthorId };

      // ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â®ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦ÃƒËœÃ‚Â· Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¸
      const mediaCheck = validateMediaManifest(payload.media || []);
      if (!mediaCheck.ok) {
        return res.status(400).json({ status: "error", message: mediaCheck.message });
      }

      const result = await saveContent_Comment(payload);

      if (!result.success) {
        console.error("POST /saveposts: reply failed ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â", result.message, result.reason || "");
        return res.status(400).json({
          status: "error",
          message: result.message,
        });
      }

      // Realtime broadcast AFTER Firebase persistence succeeded.
      io.emit("NEW_POST", result.comment);

      return res.status(200).json({
        status: "ok",
        message: "Reply saved successfully",
        id: result.id,
        comment: result.comment,
      });
    }

    // ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â Normal post ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â unchanged behavior.
    const result = await saveContent_Posts(req.body);

    if (!result.success) {
      return res.status(400).json({
        status: "error",
        message: result.message,
      });
    }

    await invalidateFeedCache("posts");

    return res.status(200).json({
      status: "ok",
      message: "Content saved successfully",
      id: result.id,
    });
  } catch (err) {
    console.error("POST /saveposts error:", err);

    return res.status(500).json({
      status: "error",
      message: "Failed to save content",
    });
  }
});

// ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¬ ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â¯
app.post("/getComments", requireUser, async (req, res) => {
  try {
    const { parentId } = req.body;

    if (!parentId) {
      return res.status(400).json({
        status: "error",
        message: "Missing parentId",
      });
    }

    const comments = await dao.getComments(String(parentId));

    return res.status(200).json({
      status: "ok",
      comments,
    });
  } catch (err) {
    console.error("POST /getComments error:", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch comments",
    });
  }
});


// ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¬ ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â¯ (ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯)
app.post("/getReplies", requireUser, async (req, res) => {
  try {
    const { parentId } = req.body;

    if (!parentId) {
      return res.status(400).json({
        status: "error",
        message: "Missing parentId",
      });
    }

    const replies = await dao.getRepliesFor(String(parentId));

    return res.status(200).json({
      status: "ok",
      replies,
    });
  } catch (err) {
    console.error("POST /getReplies error:", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch replies",
    });
  }
});

// ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Å¾ ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â¨Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚Âª/ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â€šÂ¬ ID (Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã‚ÂÃƒËœÃ‚ÂªÃƒËœÃ‚Â­ ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â· Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±ÃƒËœÃ‚Â©)
app.post("/getPostById", requireUser, async (req, res) => {
  try {
    const { postId } = req.body;

    if (!postId) {
      return res.status(400).json({
        status: "error",
        message: "Missing postId",
      });
    }

    console.log("Fetching post by ID:", postId);
    const post = await dao.getPostID(String(postId));
console.log("Fetched post:", post);
    if (!post) {
      return res.status(404).json({
        status: "error",
        message: "Post not found",
      });
    }

    // ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¬ ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¨ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¶ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂµÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±ÃƒËœÃ‚Â©
    const profile = await getUser(post.autherID);
    const enriched = profile
      ? {
          ...post,
          userData: {
            Id_user: profile.Id_user ?? post.autherID,
            F_user: profile.F_user || "",
            S_user: profile.S_user || "",
            imgProfile: profile.imgProfile || "",
          },
        }
      : post;

    return res.status(200).json({ status: "ok", post: enriched });
  } catch (err) {
    console.error("POST /getPostById error:", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch post",
    });
  }
});

// ÃƒÂ°Ã…Â¸Ã…â€™Ã‚Â ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â´Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·.
// ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬ËœÃƒËœÃ‚Â± Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ¢â‚¬Âº ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂªÃƒâ„¢Ã‚ÂÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¹ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â· Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â©ÃƒËœÃ…â€™
// Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ ÃƒËœÃ‚ÂªÃƒâ„¢Ã‚ÂÃƒËœÃ‚Â®ÃƒËœÃ‚Â²Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§ÃƒËœÃ‚Â´ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¤Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Âª Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¨ÃƒËœÃ‚Â· ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â€šÂ¬ contentVersion.
app.post("/translate", requireUser, async (req, res) => {
  try {
    const { contentId, contentType, targetLang, text } = req.body || {};

    if (!contentId || !text || !targetLang) {
      return res.status(400).json({
        status: "error",
        message: "Missing contentId, text or targetLang",
      });
    }

    // ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¹ÃƒËœÃ…â€™ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â©.
    // Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¶Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Â  contentVersion Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥ÃƒËœÃ‚ÂµÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â  (ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â´ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â¹Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬ËœÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ…â€™
    // Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â±Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¶ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§ÃƒËœÃ‚Â´ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥ÃƒËœÃ‚ÂµÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â± ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬ËœÃƒËœÃ‚Â±).
    let originalContent = null;
    switch (contentType) {
      case "posts":
        originalContent = await dao.getPostID(String(contentId));
        break;
      case "articles":
        originalContent = await dao.getArticleID(String(contentId));
        break;
      case "novels":
        originalContent = await dao.getnovelsID(String(contentId));
        break;
      default:
        originalContent = null;
    }

    if (!originalContent) {
      return res.status(404).json({
        status: "error",
        message: "Content not found",
      });
    }

    // ÃƒËœÃ‚Â¥ÃƒËœÃ‚ÂµÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â°: ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â® ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  hash. ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬ËœÃƒËœÃ‚Â±ÃƒËœÃ…â€™ ÃƒËœÃ‚ÂªÃƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â©.
    const contentVersion =
      originalContent.updatedAt ||
      originalContent.editedAt ||
      originalContent.createdAt ||
      "";

    const result = await translateContent({
      contentId: String(contentId),
      content: String(text || ""),
      contentVersion: String(contentVersion),
      targetLang: String(targetLang),
      userId: String(req.user?.id ?? "anonymous"),
      isLong: contentType === "articles" || contentType === "novels",
    });

    // ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª: Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â®ÃƒËœÃ‚Â·ÃƒËœÃ‚Â£ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡ HTTP status Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¨ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ 400 Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¶Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾
    if (!result.ok) {
      const statusMap = {
        MISSING_PARAMS: 400,
        TOO_LONG: 413,
        RATE_LIMITED: 429,
        PROVIDER_UNAVAILABLE: 503,
        PROVIDER_FAILED: 502,
        PROVIDER_TIMEOUT: 504,
        INVALID_RESPONSE: 502,
        UNSUPPORTED_LANGUAGE: 422,
        SAME_LANGUAGE: 422,
        EMPTY: 422,
      };
      const status = statusMap[result.error] || 500;
      return res.status(status).json({
        status: "error",
        error: result.error,
        message: result.message,
        ...(result.retryAfterMs ? { retryAfterMs: result.retryAfterMs } : {}),
      });
    }

    return res.status(200).json({
      status: "ok",
      translatedText: result.translatedText,
      sourceLang: result.sourceLang,
      cached: result.cached,
    });
  } catch (err) {
    console.error("POST /translate error:", err);
    return res.status(500).json({
      status: "error",
      message: "Translation failed",
    });
  }
});

// ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¹ÃƒÂ¯Ã‚Â¸Ã‚Â ÃƒËœÃ‚Â­ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â²Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â´ÃƒËœÃ‚Â®Ãƒâ„¢Ã…Â ÃƒËœÃ‚Âµ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â· (Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ ÃƒËœÃ‚ÂªÃƒâ„¢Ã†â€™ÃƒËœÃ‚Â´Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â£Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â§ÃƒËœÃ‚ÂªÃƒâ„¢Ã…Â ÃƒËœÃ‚Â­)
app.get("/translate/provider", requireUser, async (req, res) => {
  return res.status(200).json({
    status: "ok",
    provider: getProviderInfo(),
  });
});

// ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚ÂÃƒÂ¯Ã‚Â¸Ã‚Â ÃƒËœÃ‚ÂªÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â´ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â²Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚Â°ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  Backend Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·.
// ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂªÃƒâ„¢Ã‚ÂÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â«Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ…â€™ ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  IP hashed Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â²Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±.
// ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â²Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â®ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦.
app.post("/view", async (req, res) => {
  try {
    const { contentId, contentType } = req.body || {};

    if (!contentId || !contentType) {
      return res.status(400).json({ status: "error", message: "Missing contentId or contentType" });
    }

    // ÃƒËœÃ‚Â§ÃƒËœÃ‚Â®ÃƒËœÃ‚ÂªÃƒâ„¢Ã…Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â : ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â  ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€  Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¬Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¡ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â¡ Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â¡
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(" ")[1];
        req.user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      } catch (e) {
        // ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­ ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â²ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦ÃƒËœÃ‚Â± (Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â´Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨)
        req.user = null;
      }
    }

    const viewerId = resolveViewerId(req);
    if (!checkRate(viewerId)) {
      return res.status(429).json({ status: "error", message: "Too many view registrations" });
    }

    const result = await registerView({ contentId: String(contentId), contentType: String(contentType), viewerId });

    if (!result.ok) {
      const status = result.error === "CONTENT_NOT_FOUND" ? 404 : 500;
      return res.status(status).json({ status: "error", error: result.error });
    }

    return res.status(200).json({
      status: "ok",
      views: result.views,
      counted: result.counted, // false = Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â´ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â±ÃƒËœÃ‚Â±ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â®Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â°ÃƒËœÃ‚Â©
    });
  } catch (err) {
    console.error("POST /view error:", err.message);
    return res.status(500).json({ status: "error", message: "Failed to register view" });
  }
});

// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â SEO ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â robots.txt (ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ…â€™ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â  auth)
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(robotsTxt());
});

// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â SEO ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â sitemap.xml ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â´Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â 
app.get("/sitemap.xml", async (req, res) => {
  try {
    const [articles, novels] = await Promise.all([
      dao.getLatestArticles(500),
      dao.getLatestNovels(500),
    ]);
    res.type("application/xml");
    res.send(sitemapXml({ articles: articles || [], novels: novels || [] }));
  } catch (err) {
    console.error("GET /sitemap.xml error:", err.message);
    // Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â´Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â±ÃƒËœÃ‚Â³ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¹ sitemap ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂµÃƒâ„¢Ã‚ÂÃƒËœÃ‚Â­ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·
    res.type("application/xml");
    res.send(sitemapXml({}));
  }
});

// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â±Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹ Cloudinary ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¹ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â´ÃƒËœÃ‚Â£ ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â®ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â· ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¡ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©.
// ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â®ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¹ (image/video) Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·ÃƒËœÃ¢â‚¬Âº Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¹.
app.post("/media/upload-signature", requireUser, async (req, res) => {
    try {
        const kind = req.body?.kind;

        if (!isConfigured()) {
            // logCloudinaryConfigStatus ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â®Ãƒâ„¢Ã¢â‚¬Å¾ buildSignedUpload Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â£Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ (ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·)
            console.error("POST /media/upload-signature: Cloudinary env vars missing (userId=" +
                String(req.user?.id ?? "") + ")");
            return res.status(500).json({ status: "error", message: "Cloudinary not configured" });
        }

        if (!kind || !["image", "video"].includes(kind)) {
            return res.status(400).json({ status: "error", message: "Invalid media kind" });
        }

        const result = buildSignedUpload({ kind });
        if (!result.ok) {
            return res.status(500).json({ status: "error", message: result.message });
        }

        // ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦ÃƒËœÃ‚Â· ÃƒËœÃ‚ÂªÃƒâ„¢Ã‚ÂÃƒËœÃ‚Â±ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¡ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â· ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â®ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã…Â .
        return res.status(200).json({ status: "ok", ...result, limits: MEDIA_LIMITS });
    } catch (err) {
        console.error("POST /media/upload-signature error:", err);
        return res.status(500).json({ status: "error", message: "Failed to build upload signature" });
    }
});

// ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â¹ ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¸Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚Â Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦ÃƒËœÃ‚Â· Ãƒâ„¢Ã…Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© (Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â´Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¸ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â´Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â±Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·ÃƒËœÃ…â€™
// Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â­ÃƒËœÃ‚Â°Ãƒâ„¢Ã‚Â Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒËœÃ‚ÂµÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­ÃƒËœÃ‚Â©Ãƒâ„¢Ã¢â‚¬Â¹ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â´Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¸.
app.post("/media/discard", requireUser, async (req, res) => {
    try {
        const assets = Array.isArray(req.body?.assets) ? req.body.assets.slice(0, 10) : [];
        const valid = assets
            .filter((a) => a && typeof a.publicId === "string" && a.publicId.trim())
            .map((a) => ({
                publicId: a.publicId.trim(),
                resourceType: a.resourceType === "video" ? "video" : "image",
            }));

        if (!valid.length) {
            return res.status(400).json({ status: "error", message: "No valid assets" });
        }

        const results = [];
        for (const asset of valid) {
            try {
                await cloudinary.uploader.destroy(asset.publicId, {
                    resource_type: asset.resourceType,
                    invalidate: true,
                });
                results.push({ ...asset, deleted: true });
            } catch (err) {
                console.error(`POST /media/discard: destroy failed for ${asset.publicId}:`, err.message);
                results.push({ ...asset, deleted: false });
            }
        }

        return res.status(200).json({ status: "ok", results });
    } catch (err) {
        console.error("POST /media/discard error:", err);
        return res.status(500).json({ status: "error", message: "Failed to discard media" });
    }
});

// ÃƒÂ¢Ã…â€œÃ‚ÂÃƒÂ¯Ã‚Â¸Ã‚Â ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â¨Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚Âª ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â· (ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ…â€™ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â³ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â©)
app.post("/editPost", requireUser, async (req, res) => {
    try {
        const { postId, content, media, removedMedia } = req.body;
        const trustedAuthorId = String(req.user?.id ?? "");

        if (!postId || (!content && !media)) {
            return res.status(400).json({ status: "error", message: "Missing postId or content" });
        }

        const post = await dao.getPostID(String(postId));
        if (!post) {
            return res.status(404).json({ status: "error", message: "Post not found" });
        }

        if (String(post.autherID) !== trustedAuthorId) {
            return res.status(403).json({ status: "error", message: "Not authorized to edit this post" });
        }

        // ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â®ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦ÃƒËœÃ‚Â· ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â©
        if (Array.isArray(media) && media.length) {
            const check = validateMediaManifest(media);
            if (!check.ok) {
                return res.status(400).json({ status: "error", message: check.message });
            }
        }

        const updates = {};
        if (typeof content === "string" && content.trim()) updates.content = content.trim();
        if (Array.isArray(media)) {
            // ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¸ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦ÃƒËœÃ‚Â· ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© + ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡ ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â£Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦ÃƒËœÃ‚Â· Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒâ„¢Ã‚ÂÃƒËœÃ‚Â­ÃƒËœÃ‚Â°Ãƒâ„¢Ã‚Â
            updates.media = media;
            // ÃƒËœÃ‚Â­ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¸ ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ img
            updates.img = media.map((m) => (typeof m === "string" ? m : m.url)).filter(Boolean);
        }

        await dao.updateContent("posts", String(postId), updates);

        // ÃƒËœÃ‚Â­ÃƒËœÃ‚Â°Ãƒâ„¢Ã‚Â Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â§ÃƒËœÃ‚Âª Cloudinary ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚Â°Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦ÃƒËœÃ‚Â· ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â· Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€  ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â¢ÃƒËœÃ‚Â®ÃƒËœÃ‚Â±
        let cleanup = null;
        if (Array.isArray(removedMedia) && removedMedia.length) {
            cleanup = await deleteCloudinaryAssetsIfUnused({
                media: removedMedia,
                excludePostId: String(postId),
            });
        }

        const updated = await dao.getPostID(String(postId));
        io.emit("LIKE_UPDATED", { contentType: "posts", post: updated });

        return res.status(200).json({
            status: "ok",
            message: "Post updated",
            post: updated,
            cleanup,
        });
    } catch (err) {
        console.error("POST /editPost error:", err);
        return res.status(500).json({ status: "error", message: "Failed to edit post" });
    }
});

// ÃƒÂ°Ã…Â¸Ã¢â‚¬â€Ã¢â‚¬ËœÃƒÂ¯Ã‚Â¸Ã‚Â ÃƒËœÃ‚Â­ÃƒËœÃ‚Â°Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â¨Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚Âª/ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¯ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â· (ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ…â€™ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â³ÃƒËœÃ‚Âª Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â©)
app.post("/deletePost", requireUser, async (req, res) => {
    try {
        const postId = req.body?.postId;
        const trustedAuthorId = String(req.user?.id ?? "");

        if (!postId || typeof postId !== "string" || !postId.trim()) {
            return res.status(400).json({ status: "error", message: "Missing postId" });
        }
        if (!trustedAuthorId) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }

        const id = String(postId).trim();

        // ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â­ÃƒËœÃ‚Â« ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â«Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â«ÃƒËœÃ‚Â©: ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯/ÃƒËœÃ‚Â¨Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§ÃƒËœÃ‚ÂªÃƒËœÃ…â€™ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚ÂªÃƒËœÃ…â€™ ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª
        // (ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ ÃƒËœÃ‚ÂªÃƒâ„¢Ã‚ÂÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¸ Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª posts ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â³ ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â­ÃƒËœÃ‚Â« ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂºÃƒËœÃ‚Â·Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§)
        let record = null;
        let contentType = "posts";

        record = await dao.getPostID(id);
        if (!record) {
            record = await dao.getArticleID(id);
            if (record) contentType = "articles";
        }
        if (!record) {
            record = await dao.getnovelsID(id);
            if (record) contentType = "novels";
        }

        if (!record) {
            console.warn(`POST /deletePost: record ${id} not found (userId=${trustedAuthorId})`);
            return res.status(404).json({ status: "error", message: "Post not found" });
        }

        const recordAuthorId = String(record.autherID ?? "");
        if (!recordAuthorId || recordAuthorId !== trustedAuthorId) {
            console.warn(
                `POST /deletePost: forbidden ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â record=${id} author=${recordAuthorId} requester=${trustedAuthorId}`
            );
            return res.status(403).json({ status: "error", message: "Not authorized to delete this post" });
        }

        // Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦ÃƒËœÃ‚Â· Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â· ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚Âª ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â§ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â§
        const ownMedia = [
            ...(Array.isArray(record.media) ? record.media : []),
            ...(Array.isArray(record.img) ? record.img : []),
        ];

        // ÃƒËœÃ‚Â­ÃƒËœÃ‚Â°Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂµÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â­
        if (contentType === "articles") {
            await dao.deleteArticle(id);
        } else if (contentType === "novels") {
            await dao.deletenovels(id);
        } else {
            await dao.deletePost(id);
        }

        // ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â²ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â€šÂ¬ ID Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ (Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¸Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â± Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â§Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­ÃƒËœÃ‚Â°Ãƒâ„¢Ã‚Â)
        let profileCleanup = "skipped";
        try {
            await sign.deletePostsFrom_User(trustedAuthorId, id);
            profileCleanup = "done";
        } catch (profileErr) {
            console.error("POST /deletePost: profile cleanup failed:", profileErr.message);
        }

        await invalidateFeedCache(contentType);
        await invalidateUserCache(trustedAuthorId);

        // ÃƒËœÃ‚Â­ÃƒËœÃ‚Â°Ãƒâ„¢Ã‚Â Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â§ÃƒËœÃ‚Âª Cloudinary ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­ ÃƒËœÃ‚Â­ÃƒËœÃ‚Â°Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ…â€™ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â­ÃƒËœÃ‚Âµ ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦
        // Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â´Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â´Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­ÃƒËœÃ‚Â°Ãƒâ„¢Ã‚Â Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚Â§Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â©
        let cleanup = null;
        try {
            cleanup = await deleteCloudinaryAssetsIfUnused({
                media: ownMedia,
                excludePostId: id,
            });
        } catch (cleanupErr) {
            console.error("POST /deletePost: cloudinary cleanup failed:", cleanupErr.message);
            cleanup = { deleted: [], failed: [], skipped: 0, error: "cleanup-failed" };
        }

        console.log(
            `POST /deletePost: deleted ${contentType}/${id} by user=${trustedAuthorId}` +
            ` cleanup.deleted=${(cleanup?.deleted || []).length}`
        );

        // ÃƒËœÃ‚Â­ÃƒËœÃ‚Â°Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ…Â¸ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§: ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â´Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â© (first-class)ÃƒËœÃ…â€™ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Â° Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã…Â .

        // Realtime content-deleted broadcast so open feeds/profiles update
        // without a full reload. The profile layer removes the item by id ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
        // ownership was verified server-side above, never trusted from client.
        try {
            io.emit("CONTENT_DELETED", { contentType, id: String(id) });
        } catch (broadcastErr) {
            console.warn("CONTENT_DELETED broadcast failed:", broadcastErr.message);
        }

        return res.status(200).json({
            status: "ok",
            message: "Post deleted",
            contentType,
            profileCleanup,
            cleanup,
        });
    } catch (err) {
        console.error("POST /deletePost error:", err);
        return res.status(500).json({ status: "error", message: "Failed to delete post" });
    }
});

app.post("/edit_profile_photo", async(req, res) => {

});

app.post("/edit_bio", async(req, res) => {

});

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â­ÃƒËœÃ‚Â« ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦
app.post("/getuser", requireUser, async(req, res) => {
    const { idOtherUser } = req.body;
    try {
        const updatedUser = await sign.findbyID(idOtherUser);
        if (!updatedUser) return res.status(404).json({ message: "User not found" });
        const settings = await sign.getUserSettings(updatedUser.Id_user);
        // SECURITY (Phase 1): requireUser ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â previously anyone could enumerate
        // profiles with zero auth. Response goes through buildUserData (no psw).
        res.json({ userData: buildUserData(updatedUser, settings) });
    } catch (err) {
        console.error("Search error:", err.message);
        res.status(err.message === "User not found" ? 404 : 500).json({ message: err.message || "Error searching user" });
    }
});

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦
app.post("/followingUser", requireUser, async(req, res) => {
    if (req.userAccountState === "suspended") return res.status(403).json({ success: false, message: "Account suspended" });
    // SECURITY (Phase 1): the acting user comes from the verified JWT, never
    // from the request body (was spoofable). Target must exist.
    const idFollowedUser = req.body?.idFollowedUser;
    if (idFollowedUser == null || String(idFollowedUser) === String(req.user.id)) {
        return res.status(400).json({ message: "Invalid follow target" });
    }
    try {
        const target = await sign.findbyID(idFollowedUser);
        if (!target) return res.status(404).json({ message: "User not found" });
        const updatedUser = await sign.IncreasingFollowing(req.user.id, idFollowedUser);
        await sign.IncreasingFollowers(req.user.id, idFollowedUser);
        const settings = await sign.getUserSettings(updatedUser.Id_user);
        res.json({ userData: buildUserData(updatedUser, settings) });
    } catch (err) {
        console.error("Follow error:", err.message);
        res.status(500).json({ message: "Error following user" });
    }
});

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂºÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦
app.post("/unfollowingUser", requireUser, async(req, res) => {
    if (req.userAccountState === "suspended") return res.status(403).json({ success: false, message: "Account suspended" });
    const idFollowedUser = req.body?.idFollowedUser;
    if (idFollowedUser == null || String(idFollowedUser) === String(req.user.id)) {
        return res.status(400).json({ message: "Invalid unfollow target" });
    }
    try {
        const updatedUser = await sign.DecreaseFollowing(req.user.id, idFollowedUser);
        await sign.DecreaseFollower(req.user.id, idFollowedUser);
        const settings = await sign.getUserSettings(updatedUser.Id_user);
        res.json({ userData: buildUserData(updatedUser, settings) });
    } catch (err) {
        console.error("Unfollow error:", err.message);
        res.status(500).json({ message: "Error unfollowing user" });
    }
});

app.get(
    "/settings",
    requireUser,
    async(req, res) => {
        try {

            const settings =
                await sign.getUserSettings(
                    req.user.id
                );
console.log("Fetched settings for user", req.user.id, ":", settings);
            res.json(settings);

        } catch (err) {

            console.error("GET /settings error:", err.message);
            res.status(500).json({
                error: err.message
            });

        }
    }
);

// Whitelist Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â­ ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¸Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â§ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â£Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â©
const SETTINGS_FIELDS = ["appearance", "notifications", "reading", "creator", "profile"];
const ALLOWED_APPEARANCE = ["theme", "fontSize", "fontFamily", "language", "direction", "primaryColor", "customColor"];

function sanitizeSettings(body) {
    const clean = {};
    for (const field of SETTINGS_FIELDS) {
        if (!body[field] || typeof body[field] !== "object") continue;
        if (field === "appearance") {
            clean.appearance = {};
            for (const key of ALLOWED_APPEARANCE) {
                if (body.appearance[key] !== undefined) clean.appearance[key] = body.appearance[key];
            }
            // ÃƒËœÃ‚Â«Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â­ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·: light | dark | system
            if (clean.appearance.theme && !["light", "dark", "system"].includes(clean.appearance.theme)) {
                delete clean.appearance.theme;
            }
            // Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂºÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â­ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â· Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â±ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂªÃƒËœÃ‚Â²ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ LANGUAGES Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â©
            const SUPPORTED_LANGUAGES = ["en", "ar", "fr", "es", "de", "pt", "tr", "zh", "ja", "ru"];
            if (clean.appearance.language && !SUPPORTED_LANGUAGES.includes(clean.appearance.language)) {
                delete clean.appearance.language;
            }
            // Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â£ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â¨ÃƒËœÃ‚ÂµÃƒâ„¢Ã…Â ÃƒËœÃ‚ÂºÃƒËœÃ‚Â© hex ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·
            for (const colorKey of ["primaryColor", "customColor"]) {
                if (clean.appearance[colorKey] && !/^#[0-9a-fA-F]{6}$/.test(clean.appearance[colorKey])) {
                    delete clean.appearance[colorKey];
                }
            }
        } else {
            // ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ boolean Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â· Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ profile (strings)
            if (field === "profile") {
                clean.profile = {};
                for (const [k, v] of Object.entries(body.profile)) {
                    if (typeof v === "string" || v === null) clean.profile[k] = v;
                }
            } else {
                clean[field] = {};
                for (const [k, v] of Object.entries(body[field])) {
                    if (typeof v === "boolean") clean[field][k] = v;
                }
            }
            if (field === "reading" && body.reading?.readingGoal != null) {
                const goal = Number(body.reading.readingGoal);
                if (Number.isFinite(goal) && goal >= 5 && goal <= 180) clean.reading.readingGoal = goal;
            }
        }
    }
    return clean;
}

app.put(
    "/settings",
    requireUser,
    async(req, res) => {
        try {
            const clean = sanitizeSettings(req.body || {});
            if (Object.keys(clean).length === 0) {
                return res.status(400).json({ error: "No valid settings fields" });
            }

            const result =
                await sign.updateUserSettings(
                    req.user.id,
                    clean
                );

            res.json(result);

        } catch (err) {

            console.error("PUT /settings error:", err.message);
            res.status(500).json({
                error: err.message
            });

        }
    }
);

// ======================================================
// FOCUS SPACE ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â² Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦
// ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  verifyToken (req.user.id) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â«Ãƒâ„¢Ã¢â‚¬Å¡ ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â€šÂ¬ userId Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â©
// ======================================================
const FOCUS_LIMITS = {
    notes: 100,
    tasks: 100,
    sessions: 100,
    notifications: 50,
    customBackgrounds: 5,
};
const FOCUS_ROOT = "user_data/FocusSpace";

async function getFocusData(userId) {
    const snap = await get(ref(db, `${FOCUS_ROOT}/${userId}`));
    return snap.exists() ? snap.val() : {};
}

// ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¸ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂµÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Âµ ÃƒËœÃ‚Â¢Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·ÃƒËœÃ…â€™ ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â£Ãƒâ„¢Ã…Â  HTML/Script
function sanitizeNotes(notes) {
    if (!Array.isArray(notes)) return [];
    return notes.slice(0, FOCUS_LIMITS.notes).map((n) => ({
        id: String(n.id || "").slice(0, 40),
        title: String(n.title || "").slice(0, 200),
        content: String(n.content || "").slice(0, 5000),
        pinned: Boolean(n.pinned),
        taskId: n.taskId ? String(n.taskId).slice(0, 40) : null,
        updatedAt: String(n.updatedAt || new Date().toISOString()).slice(0, 30),
    })).filter((n) => n.id);
}

// ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·ÃƒËœÃ…â€™ Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â¢Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â©
function sanitizeTasks(tasks) {
    if (!Array.isArray(tasks)) return [];
    const PRIORITIES = ["low", "medium", "high"];
    const STATUSES = ["pending", "in_progress", "completed"];
    return tasks.slice(0, FOCUS_LIMITS.tasks).map((t) => ({
        id: String(t.id || "").slice(0, 40),
        title: String(t.title || "").slice(0, 200),
        description: String(t.description || "").slice(0, 2000),
        dueDate: t.dueDate ? String(t.dueDate).slice(0, 30) : null,
        reminder: t.reminder ? String(t.reminder).slice(0, 30) : null,
        priority: PRIORITIES.includes(t.priority) ? t.priority : "medium",
        category: String(t.category || "").slice(0, 60),
        status: STATUSES.includes(t.status) ? t.status : "pending",
        deferred: Boolean(t.deferred),
        repeat: ["none", "daily", "weekly", "monthly"].includes(t.repeat) ? t.repeat : "none",
        createdAt: String(t.createdAt || new Date().toISOString()).slice(0, 30),
        completedAt: t.completedAt ? String(t.completedAt).slice(0, 30) : null,
    })).filter((t) => t.id);
}

// ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â² ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â£ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂµÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±ÃƒËœÃ‚Â©
function sanitizeSessions(sessions) {
    if (!Array.isArray(sessions)) return [];
    return sessions.slice(0, FOCUS_LIMITS.sessions).map((s) => ({
        id: String(s.id || "").slice(0, 40),
        mode: ["pomodoro", "deep_focus", "long_study", "custom", "timer"].includes(s.mode) ? s.mode : "pomodoro",
        startedAt: String(s.startedAt || "").slice(0, 30),
        endedAt: String(s.endedAt || "").slice(0, 30),
        plannedMinutes: Math.min(Math.max(Number(s.plannedMinutes) || 25, 1), 240),
        actualMinutes: Math.min(Math.max(Number(s.actualMinutes) || 0, 0), 240),
        completed: Boolean(s.completed),
        type: ["focus", "break"].includes(s.type) ? s.type : "focus",
    })).filter((s) => s.id);
}

// ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â²
const FOCUS_SETTING_KEYS = ["background", "backgroundFit", "overlayOpacity", "brightness",
    "bgBlur", "bgBrightness", "bgContrast", "bgSaturation", "backgroundAnim", "backgroundPosition",
    "clockType", "clockStyle", "clockColor", "clockSize", "clockFont", "clockFontWeight",
    "clockTheme", "immersiveClock", "clockArabicNumerals",
    "timerPreset", "timerSound", "stopwatchLaps", "pomodoroShortBreak", "pomodoroLongBreak",
    "pomodoroSessionsBeforeLong", "unifiedToolTheme", "timerTheme", "stopwatchTheme", "pomodoroTheme",
    "showSeconds", "showDate", "use12Hour", "soundPreferences", "defaultStudyMode",
    "defaultSessionDuration", "ayaNotifications", "savedContentReminders", "hideControls",
    "musicWidgetHidden", "reduceMotion", "overlayVisible", "ayaIntervention", "ayaEnabled"];

function sanitizeFocusSettings(settings) {
    if (!settings || typeof settings !== "object") return {};
    const clean = {};
    for (const key of FOCUS_SETTING_KEYS) {
        if (settings[key] === undefined) continue;
        clean[key] = settings[key];
    }
    // ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¡ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦
    if (clean.clockType && !["digital", "analog"].includes(clean.clockType)) delete clean.clockType;
    if (clean.clockStyle && !["minimal", "classic", "modern"].includes(clean.clockStyle)) delete clean.clockStyle;
    if (typeof clean.clockColor === "string" && !/^#[0-9a-fA-F]{6}$/.test(clean.clockColor)) delete clean.clockColor;
    if (clean.defaultStudyMode && !["classic", "deep_focus", "long_study", "custom"].includes(clean.defaultStudyMode)) delete clean.defaultStudyMode;
    if (clean.defaultSessionDuration != null) {
        const dur = Number(clean.defaultSessionDuration);
        if (Number.isFinite(dur) && dur >= 5 && dur <= 180) clean.defaultSessionDuration = dur;
        else delete clean.defaultSessionDuration;
    }
    for (const numKey of ["overlayOpacity", "brightness", "clockSize", "bgBlur", "bgBrightness", "bgContrast", "bgSaturation",
        "timerPreset", "pomodoroShortBreak", "pomodoroLongBreak", "pomodoroSessionsBeforeLong"]) {
        if (clean[numKey] != null) {
            const v = Number(clean[numKey]);
            if (Number.isFinite(v) && v >= 0 && v <= 100) clean[numKey] = v;
            else delete clean[numKey];
        }
    }
    // strings ÃƒËœÃ‚Â¢Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂµÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â·Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾
    for (const strKey of ["background", "backgroundFit", "clockFont", "clockFontWeight", "clockTheme", "timerSound",
        "backgroundPosition", "timerTheme", "stopwatchTheme", "pomodoroTheme"]) {
        if (clean[strKey] != null) clean[strKey] = String(clean[strKey]).slice(0, 300);
    }
    if (clean.soundPreferences && typeof clean.soundPreferences === "object") {
        const prefs = {};
        for (const [k, v] of Object.entries(clean.soundPreferences).slice(0, 30)) {
            prefs[String(k).slice(0, 40)] = Boolean(v);
        }
        clean.soundPreferences = prefs;
    }
    if (clean.timerSound && !["chime", "bell", "soft", "none"].includes(clean.timerSound)) delete clean.timerSound;
    if (Array.isArray(clean.stopwatchLaps)) {
        clean.stopwatchLaps = clean.stopwatchLaps.slice(0, 50).map((l) => ({
            totalMs: Math.max(0, Math.min(Number(l.totalMs) || 0, 86400000)),
            deltaMs: Math.max(0, Math.min(Number(l.deltaMs) || 0, 86400000)),
            at: String(l.at || "").slice(0, 30),
        }));
    } else if (clean.stopwatchLaps !== undefined) delete clean.stopwatchLaps;
    for (const boolKey of ["ayaNotifications", "savedContentReminders", "hideControls", "reduceMotion", "overlayVisible", "showSeconds", "showDate", "use12Hour",
        "backgroundAnim", "immersiveClock", "clockArabicNumerals", "unifiedToolTheme", "ayaEnabled"]) {
        if (clean[boolKey] !== undefined) clean[boolKey] = Boolean(clean[boolKey]);
    }
    if (clean.ayaIntervention && !["gentle", "balanced", "active"].includes(clean.ayaIntervention)) delete clean.ayaIntervention;
    return clean;
}

function sanitizeFocusData(data) {
    if (!data || typeof data !== "object") return {};
    const clean = {};
    if (data.settings) clean.settings = sanitizeFocusSettings(data.settings);
    if (data.notes !== undefined) clean.notes = sanitizeNotes(data.notes);
    if (data.tasks !== undefined) clean.tasks = sanitizeTasks(data.tasks);
    if (data.sessions !== undefined) clean.sessions = sanitizeSessions(data.sessions);
    if (data.notifications !== undefined) {
        clean.notifications = (Array.isArray(data.notifications) ? data.notifications : [])
            .slice(0, FOCUS_LIMITS.notifications)
            .map((n) => ({
                id: String(n.id || "").slice(0, 40),
                type: ["task_reminder", "session_end", "saved_content", "aya"].includes(n.type) ? n.type : "aya",
                title: String(n.title || "").slice(0, 200),
                body: String(n.body || "").slice(0, 500),
                createdAt: String(n.createdAt || "").slice(0, 30),
                read: Boolean(n.read),
            })).filter((n) => n.id);
    }
    if (data.customBackgrounds !== undefined) {
        clean.customBackgrounds = (Array.isArray(data.customBackgrounds) ? data.customBackgrounds : [])
            .slice(0, FOCUS_LIMITS.customBackgrounds)
            .map((b) => ({
                id: String(b.id || "").slice(0, 40),
                url: /^https?:\/\//.test(String(b.url || "")) ? String(b.url).slice(0, 2000) : "",
                name: String(b.name || "").slice(0, 100),
                createdAt: String(b.createdAt || "").slice(0, 30),
            })).filter((b) => b.id && b.url);
    }
    return clean;
}

app.get(
    "/focus-space",
    requireUser,
    async(req, res) => {
        try {
            const data = await getFocusData(req.user.id);
            res.json(data);
        } catch (err) {
            console.error("GET /focus-space error:", err.message);
            res.status(500).json({ error: err.message });
        }
    }
);

app.put(
    "/focus-space",
    requireUser,
    async(req, res) => {
        try {
            const clean = sanitizeFocusData(req.body || {});
            if (Object.keys(clean).length === 0) {
                return res.status(400).json({ error: "No valid focus fields" });
            }
            // ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¬ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¬Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾
            const existing = await getFocusData(req.user.id);
            const merged = { ...existing, ...clean, updatedAt: new Date().toISOString() };
            await update(ref(db, `${FOCUS_ROOT}/${req.user.id}`), merged);
            res.json({ status: "ok", data: merged });
        } catch (err) {
            console.error("PUT /focus-space error:", err.message);
            res.status(500).json({ error: err.message });
        }
    }
);

// ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¸ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â  ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¸ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª
app.get(
    "/focus-space/saved-content",
    requireUser,
    async(req, res) => {
        try {
            const uid = req.user.id;
            // user_data/Profile/<uid>/savedContent Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â§ÃƒËœÃ‚ÂªÃƒâ„¢Ã…Â ÃƒËœÃ‚Â­ Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¸Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦
            // ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾: { articles: {id1: true}, novels: {id2: true}, posts: {id3: true} }
            const userSnap = await get(ref(db, `user_data/Profile/${uid}`));
            const userData = userSnap.exists() ? userSnap.val() : {};
            const saved = userData.savedContent || userData.saved || {};
            const result = [];
            for (const type of ["articles", "novels", "posts"]) {
                const ids = saved[type] ? Object.keys(saved[type]).slice(0, 100) : [];
                for (const id of ids) {
                    try {
                        let item = null;
                        if (type === "articles") item = await dao.getArticleID(id);
                        else if (type === "novels") item = await dao.getnovelsID(id);
                        else item = await dao.getPostID(id);
                        if (!item) continue;
                        const rec = saved[type][id];
                        const recObj = rec && typeof rec === "object" ? rec : {};
                        result.push({
                            id,
                            type: type.slice(0, -1), // article | novel | post
                            title: String(item.title || "").slice(0, 300),
                            description: String(item.descrip || item.content || "").slice(0, 300),
                            image: Array.isArray(item.img) && item.img[0] ? String(item.img[0]).slice(0, 1000) : null,
                            savedAt: recObj.savedAt || null,
                            readStatus: recObj.readStatus || (recObj.read ? "completed" : "not_started"),
                            readProgressPercent: Number(recObj.readProgressPercent) || 0,
                            lastReadAt: recObj.lastReadAt || null,
                            link: type === "posts" ? `/rp/${id}` : `/r/${id}`,
                        });
                    } catch (e) { /* ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚Â°Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â·Ãƒâ„¢Ã…Â½Ãƒâ„¢Ã¢â‚¬Ëœ */ }
                }
            }
            res.json({ items: result });
        } catch (err) {
            console.error("GET /focus-space/saved-content error:", err.message);
            res.status(500).json({ error: err.message });
        }
    }
);

// ======================================================
// READ LATER ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¸/ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â²ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â©/ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â« ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â£Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° (Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾/ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©/Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â´Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±)
// ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª:
//   user_data/Profile/{uid}/savedContent/{type}/{contentId} =
//     { savedAt, readStatus: not_started|in_progress|completed,
//       readProgressPercent, lastReadAt, completedAt }
// ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  verifyToken ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â«Ãƒâ„¢Ã¢â‚¬Å¡ ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â±Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â©.
// ======================================================
const READ_LATER_TYPES = ["articles", "novels", "posts", "books"];
const READ_STATUSES = ["not_started", "in_progress", "completed"];
const ReadingEngine_FORMATS = ["pdf", "epub", "html", "text", "embed"];

/** deterministic record key for a provider book id (safe path segment) */
function bookRecordKey(provider, providerBookId) {
    const p = String(provider || "").replace(/[^a-z_-]/gi, "").slice(0, 20);
    const id = String(providerBookId || "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 100);
    return p && id ? `${p}__${id}` : null;
}

function sanitizeReadLaterBody(body) {
    const contentType = READ_LATER_TYPES.includes(String(body.contentType || "")) ? String(body.contentType) : null;
    const contentId = String(body.contentId || "").slice(0, 100);
    if (!contentType || !contentId) return null;
    const clean = { contentType, contentId };
    if (body.title !== undefined) clean.title = String(body.title || "").slice(0, 300);
    if (body.image !== undefined) clean.image = /^https?:\/\//.test(String(body.image || "")) ? String(body.image).slice(0, 1000) : "";
    if (body.readStatus !== undefined) {
        if (!READ_STATUSES.includes(body.readStatus)) return null;
        clean.readStatus = body.readStatus;
    }
    if (body.readProgressPercent !== undefined) {
        const p = Number(body.readProgressPercent);
        if (!Number.isFinite(p) || p < 0 || p > 100) return null;
        clean.readProgressPercent = Math.round(p);
    }
    return clean;
}

// PUT /read-later ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â toggle / add / update progress
app.put(
    "/read-later",
    requireUser,
    async(req, res) => {
        try {
            const clean = sanitizeReadLaterBody(req.body || {});
            if (!clean) return res.status(400).json({ status: "error", message: "Invalid read-later payload" });
            const uid = req.user.id;
            const base = `user_data/Profile/${uid}/savedContent/${clean.contentType}/${clean.contentId}`;
            const existingSnap = await get(ref(db, base));

            // Toggle: ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂµÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¸ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â« ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â²ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â©
            if (existingSnap.exists() && clean.readStatus === undefined && clean.readProgressPercent === undefined) {
                await set(ref(db, base), null);
                return res.json({ status: "ok", saved: false });
            }

            const prev = existingSnap.exists() ? existingSnap.val() : {};
            const now = new Date().toISOString();
            const record = {
                savedAt: prev.savedAt || now,
                readStatus: clean.readStatus || prev.readStatus || "not_started",
                readProgressPercent: clean.readProgressPercent !== undefined
                    ? clean.readProgressPercent
                    : (Number(prev.readProgressPercent) || 0),
                lastReadAt: (clean.readStatus === "in_progress" || clean.readProgressPercent !== undefined)
                    ? now
                    : (prev.lastReadAt || null),
                completedAt: clean.readStatus === "completed" ? (prev.completedAt || now) : (clean.readStatus ? null : prev.completedAt || null),
            };
            await set(ref(db, base), record);
            return res.json({ status: "ok", saved: true, record });
        } catch (err) {
            console.error("PUT /read-later error:", err.message);
            res.status(500).json({ status: "error", message: err.message });
        }
    }
);

// GET /read-later/:contentType/:contentId ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¸ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ…Â¸
app.get(
    "/read-later/:contentType/:contentId",
    requireUser,
    async(req, res) => {
        try {
            const contentType = String(req.params.contentType || "");
            const contentId = String(req.params.contentId || "").slice(0, 100);
            if (!READ_LATER_TYPES.includes(contentType) || !contentId) {
                return res.status(400).json({ status: "error", message: "Invalid params" });
            }
            const snap = await get(ref(db, `user_data/Profile/${req.user.id}/savedContent/${contentType}/${contentId}`));
            res.json({ status: "ok", saved: snap.exists(), record: snap.exists() ? snap.val() : null });
        } catch (err) {
            console.error("GET /read-later status error:", err.message);
            res.status(500).json({ status: "error", message: err.message });
        }
    }
);

// GET /read-later ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¸ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â· (metadata Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¶)
app.get(
    "/read-later",
    requireUser,
    async(req, res) => {
        try {
            const snap = await get(ref(db, `user_data/Profile/${req.user.id}/savedContent`));
            const saved = snap.exists() ? snap.val() : {};
            const items = [];
            for (const type of READ_LATER_TYPES) {
                const entries = saved[type] ? Object.entries(saved[type]).slice(0, 200) : [];
                for (const [id, rec] of entries) {
                    if (!rec || typeof rec !== "object") continue;
                    items.push({
                        contentId: id,
                        contentType: type.slice(0, -1),
                        savedAt: rec.savedAt || null,
                        readStatus: rec.readStatus || "not_started",
                        readProgressPercent: Number(rec.readProgressPercent) || 0,
                        lastReadAt: rec.lastReadAt || null,
                        completedAt: rec.completedAt || null,
                    });
                }
            }
            res.json({ status: "ok", items });
        } catch (err) {
            console.error("GET /read-later error:", err.message);
            res.status(500).json({ status: "error", message: err.message });
        }
    }
);

// GET /focus-space/saved-content/:contentType/:contentId/full ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ‚Â§
// Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â®Ãƒâ„¢Ã¢â‚¬Å¾ Focus Space. Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§ÃƒËœÃ‚Â­ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â· ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¸Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ‚Â§ Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦
// (Authorization: ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â®ÃƒËœÃ‚Â§ÃƒËœÃ‚ÂµÃƒËœÃ‚Â© ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â§ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â° Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â¢ÃƒËœÃ‚Â®ÃƒËœÃ‚Â±).
app.get(
    "/focus-space/saved-content/:contentType/:contentId/full",
    requireUser,
    async(req, res) => {
        try {
            const contentType = String(req.params.contentType || "");
            const contentId = String(req.params.contentId || "").slice(0, 100);
            if (!READ_LATER_TYPES.includes(contentType) || !contentId) {
                return res.status(400).json({ status: "error", message: "Invalid params" });
            }
            const uid = req.user.id;
            const savedSnap = await get(ref(db, `user_data/Profile/${uid}/savedContent/${contentType}/${contentId}`));
            if (!savedSnap.exists()) {
                return res.status(403).json({ status: "error", message: "Not in your read-later list" });
            }
            let item = null;
            if (contentType === "articles") item = await dao.getArticleID(contentId);
            else if (contentType === "novels") item = await dao.getnovelsID(contentId);
            else item = await dao.getPostID(contentId);
            if (!item) return res.status(404).json({ status: "error", message: "Content not found" });
            const profile = await getUser(item.autherID);
            res.json({
                status: "ok",
                content: {
                    id: contentId,
                    type: contentType,
                    title: item.title || "",
                    descrip: item.descrip || "",
                    content: item.content || "",
                    img: Array.isArray(item.img) ? item.img : [],
                    date: item.date || "",
                    time: item.time || "",
                    savedRecord: savedSnap.val(),
                    userData: profile
                        ? { Id_user: profile.Id_user ?? item.autherID, F_user: profile.F_user || "", S_user: profile.S_user || "", imgProfile: profile.imgProfile || "" }
                        : null,
                },
            });
        } catch (err) {
            console.error("GET saved-content full error:", err.message);
            res.status(500).json({ status: "error", message: err.message });
        }
    }
);

// ======================================================
// AUDIO HUB ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¸ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§Ãƒâ„¢Ã†â€™ÃƒËœÃ‚ÂªÃƒËœÃ‚Â´ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚Â Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â´ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂµÃƒâ„¢Ã‹â€ ÃƒËœÃ‚ÂªÃƒâ„¢Ã…Â 
// ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  verifyToken ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â²Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  Firebase
// ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â­ÃƒËœÃ‚Â« ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â®ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â± Openverse (CC-licensed) Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ Cache + Rate-limit ÃƒËœÃ‚Â®ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â 
// ======================================================
const AUDIOHUB_LIMITS = {
    favorites: 500,
    playlists: 50,
    tracksPerPlaylist: 200,
    history: 200,
};
const AUDIOHUB_ROOT = "user_data/AudioHub";

async function getAudioHubDoc(userId) {
    const snap = await get(ref(db, `${AUDIOHUB_ROOT}/${userId}`));
    return snap.exists() ? snap.val() : {};
}

// ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·ÃƒËœÃ‚Â¹ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂµÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Âµ ÃƒËœÃ‚Â¢Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â©ÃƒËœÃ…â€™ ÃƒËœÃ‚Â£ÃƒËœÃ‚Â·Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂµÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±ÃƒËœÃ‚Â©
function sanitizeTrack(t) {
    if (!t || typeof t !== "object") return null;
    const id = String(t.id || "").slice(0, 120);
    if (!id) return null;
    return {
        id,
        title: String(t.title || "").slice(0, 300),
        author: String(t.author || "").slice(0, 120),
        durationSec: Math.min(Math.max(Number(t.durationSec) || 0, 0), 86400),
        thumbnail: /^https?:\/\//.test(String(t.thumbnail || "")) ? String(t.thumbnail).slice(0, 1000) : null,
        audioUrl: /^https?:\/\//.test(String(t.audioUrl || "")) ? String(t.audioUrl).slice(0, 1000) : "",
        licenseCode: String(t.licenseCode || "").slice(0, 60),
        licenseUrl: /^https?:\/\//.test(String(t.licenseUrl || "")) ? String(t.licenseUrl).slice(0, 1000) : "",
        source: String(t.source || "").slice(0, 60),
        section: ["music", "quran", "ambient"].includes(t.section) ? t.section : "music",
        foreignLandingUrl: /^https?:\/\//.test(String(t.foreignLandingUrl || "")) ? String(t.foreignLandingUrl).slice(0, 1000) : "",
        addedAt: String(t.addedAt || new Date().toISOString()).slice(0, 30),
    };
}

// ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â  (Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â³ Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â¶ÃƒËœÃ‚ÂºÃƒËœÃ‚Â·ÃƒËœÃ‚Â© Play)
function sanitizeListenEvent(e) {
    if (!e || typeof e !== "object") return null;
    const track = sanitizeTrack(e.track);
    if (!track) return null;
    const playedSec = Math.min(Math.max(Number(e.playedSec) || 0, 0), 86400);
    const durationSec = Math.min(Math.max(Number(e.durationSec) || 0, 0), 86400);
    // ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â : ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥30 ÃƒËœÃ‚Â«ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥50% Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© (ÃƒËœÃ‚Â£Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¾)
    const listenedFully = (durationSec > 0 && playedSec >= Math.min(30, durationSec * 0.5)) || playedSec >= 30;
    return {
        track,
        playedSec: Math.round(playedSec * 10) / 10,
        durationSec,
        listened: listenedFully,
        at: String(e.at || new Date().toISOString()).slice(0, 30),
    };
}

// ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â­ÃƒËœÃ‚Â« Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Â° CC ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â± Openverse ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§ÃƒËœÃ‚Â´ Ãƒâ„¢Ã‹â€ rate-limit ÃƒËœÃ‚Â®ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â 
app.get(
    "/audio-hub/search",
    requireUser,
    async(req, res) => {
        try {
            const { q, page, limit } = req.query;
            const result = await searchOpenverse({ query: q, section: "music", page, limit });
            res.json({ status: "ok", ...result });
        } catch (err) {
            console.error("GET /audio-hub/search error:", err.message);
            res.status(err.status || 500).json({ error: err.message });
        }
    }
);

// ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â­ÃƒËœÃ‚Â« ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â : iTunes (Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â /ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â¦/ÃƒËœÃ‚ÂºÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚Â + Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â© 30 ÃƒËœÃ‚Â« Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©)
// + Openverse (ÃƒËœÃ‚ÂªÃƒËœÃ‚Â´ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾ CC). source=itunes|openverse Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â®ÃƒËœÃ‚ÂªÃƒâ„¢Ã…Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â²Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯.
app.get(
    "/audio-hub/search-music",
    requireUser,
    async(req, res) => {
        try {
            const { q, page, limit, source } = req.query;
            // jamendo ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã†â€™ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¬ Jamendo ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾ (CCÃƒËœÃ…â€™ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â´ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾) ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â± Openverse
            if (source === "jamendo") {
                const result = await searchOpenverse({ query: q, section: "music", page, limit, ovSource: "jamendo" });
                return res.json({ status: "ok", provider: "jamendo", ...result });
            }
            if (source === "openverse") {
                const result = await searchOpenverse({ query: q, section: "music", page, limit });
                return res.json({ status: "ok", provider: "openverse", ...result });
            }
            const result = await searchItunes({ query: q, page, limit });
            res.json({ status: "ok", provider: "itunes", ...result });
        } catch (err) {
            console.error("GET /audio-hub/search-music error:", err.message);
            res.status(err.status || 500).json({ error: err.message });
        }
    }
);

// ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦: favorites + playlists + history
app.get(
    "/audio-hub/library",
    requireUser,
    async(req, res) => {
        try {
            const doc = await getAudioHubDoc(req.user.id);
            res.json({
                favorites: doc.favorites || [],
                playlists: doc.playlists || [],
                history: doc.history || [],
            });
        } catch (err) {
            console.error("GET /audio-hub/library error:", err.message);
            res.status(500).json({ error: err.message });
        }
    }
);

// Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â²ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¶Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â©/ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã¢â‚¬Â¦/ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ (Ãƒâ„¢Ã†â€™ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â© Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â©)
app.put(
    "/audio-hub/library",
    requireUser,
    async(req, res) => {
        try {
            const body = req.body || {};
            const clean = {};
            if (body.favorites !== undefined) {
                clean.favorites = (Array.isArray(body.favorites) ? body.favorites : [])
                    .slice(0, AUDIOHUB_LIMITS.favorites)
                    .map(sanitizeTrack).filter(Boolean);
            }
            if (body.playlists !== undefined) {
                clean.playlists = (Array.isArray(body.playlists) ? body.playlists : [])
                    .slice(0, AUDIOHUB_LIMITS.playlists)
                    .map((p) => ({
                        id: String(p?.id || "").slice(0, 40),
                        name: String(p?.name || "").slice(0, 120),
                        createdAt: String(p?.createdAt || new Date().toISOString()).slice(0, 30),
                        tracks: (Array.isArray(p?.tracks) ? p.tracks : [])
                            .slice(0, AUDIOHUB_LIMITS.tracksPerPlaylist)
                            .map(sanitizeTrack).filter(Boolean),
                    })).filter((p) => p.id);
            }
            if (body.history !== undefined) {
                clean.history = (Array.isArray(body.history) ? body.history : [])
                    .slice(0, AUDIOHUB_LIMITS.history)
                    .map(sanitizeListenEvent).filter(Boolean);
            }
            if (body.progress !== undefined && body.progress && typeof body.progress === "object") {
                // ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â®ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â·ÃƒËœÃ‚Â© trackId -> positionSec
                const prog = {};
                for (const [k, v] of Object.entries(body.progress).slice(0, 200)) {
                    const sec = Number(v);
                    if (Number.isFinite(sec) && sec >= 0 && sec < 86400) {
                        prog[String(k).slice(0, 120)] = Math.round(sec * 10) / 10;
                    }
                }
                clean.progress = prog;
            }
            if (Object.keys(clean).length === 0) {
                return res.status(400).json({ error: "No valid audio-hub fields" });
            }
            const existing = await getAudioHubDoc(req.user.id);
            const merged = { ...existing, ...clean, updatedAt: new Date().toISOString() };
            await update(ref(db, `${AUDIOHUB_ROOT}/${req.user.id}`), merged);
            res.json({ status: "ok", data: merged });
        } catch (err) {
            console.error("PUT /audio-hub/library error:", err.message);
            res.status(500).json({ error: err.message });
        }
    }
);

// ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â«ÃƒËœÃ‚Â± ÃƒËœÃ‚ÂªÃƒËœÃ‚Â´ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂµÃƒËœÃ‚Â© (ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¹ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â 
// ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â£Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â´ÃƒËœÃ‚Â®ÃƒËœÃ‚ÂµÃƒâ„¢Ã…Â ÃƒËœÃ‚Â©: Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â· ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·ÃƒËœÃ‚Â¹
app.get(
    "/audio-hub/trending",
    requireUser,
    async(req, res) => {
        try {
            const cached = await cacheGet("audiohub:trending");
            if (cached) return res.json({ status: "ok", items: cached });

            const snap = await get(ref(db, AUDIOHUB_ROOT));
            if (!snap.exists()) return res.json({ status: "ok", items: [] });
            const all = snap.val() || {};
            const counts = new Map();
            for (const userDoc of Object.values(all)) {
                for (const ev of userDoc.history || []) {
                    if (!ev?.listened || !ev?.track?.id) continue;
                    const key = ev.track.id;
                    if (!counts.has(key)) counts.set(key, { track: ev.track, plays: 0 });
                    counts.get(key).plays += 1;
                }
            }
            const items = [...counts.values()]
                .sort((a, b) => b.plays - a.plays)
                .slice(0, 50)
                .map((x) => ({ ...x.track, plays: x.plays }));
            await cacheSet("audiohub:trending", items, 300);
            res.json({ status: "ok", items });
        } catch (err) {
            console.error("GET /audio-hub/trending error:", err.message);
            res.status(500).json({ error: err.message });
        }
    }
);

// ======================================================
// TRIVIA ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Open Trivia DB (server-side proxy + cache + session answer key)
// ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  verifyToken ÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â« ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂªÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ¢â‚¬Âº ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¸ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦ÃƒËœÃ‚Â¬ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  user_data/Profile/{uid}/triviaResults
// ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â¯ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â : https://opentdb.com ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‚ÂÃƒËœÃ‚ÂªÃƒËœÃ‚Â§ÃƒËœÃ‚Â­ÃƒËœÃ…â€™ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦ rate limits ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§ÃƒËœÃ‚Â´
// ======================================================
const trivia = require("./service/trivia.service.js");
trivia.initTrivia({ cacheGet, cacheSet });

// in-memory session keys (short TTL via periodic cleanup ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â a session lives minutes)
const triviaSessions = new Map();

// ---- BOOKS ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â unified provider registry (Gutenberg, Open Library, Google
// Books, Wikisource, Internet Archive, DOAB/OAPEN via local OAI index) ----
const booksRegistry = require("./service/books/registry.js");
booksRegistry.initBooksRegistry({ cacheGet, cacheSet });
const { startDoabHarvest } = require("./service/books/doabHarvest.js");
startDoabHarvest();

app.get(
    "/books/search",
    async(req, res) => {
        try {
            const { q, language, yearFrom, yearTo, author, subject, isbn, source, page, sort } = req.query;
            const result = await booksRegistry.searchBooks(q, {
                language, yearFrom, yearTo, author, subject, isbn,
                sources: source ? String(source).split(",").map((s) => s.trim()).filter(Boolean) : undefined,
                sort,
            }, { page });
            res.json({ status: "ok", ...result });
        } catch (err) {
            console.error("GET /books/search error:", err.message);
            res.status(err.status || 500).json({ status: "error", message: err.message });
        }
    }
);

// book details ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â provider + providerBookId are explicit (no parsing of
// composite ids in the frontend); response carries readingSources resolved
app.get(
    "/books/:provider/:providerBookId",
    async(req, res) => {
        try {
            const { provider, providerBookId } = req.params;
            const book = await booksRegistry.getBook(provider, providerBookId);
            if (!book) return res.status(404).json({ status: "error", message: "BOOK_NOT_FOUND" });
            // Open Library works get enriched with author/year/covers + IA access
            if (provider === "openlibrary") {
                const p = booksRegistry.getProvider("openlibrary");
                const extra = await p.enrichWork(providerBookId);
                if (extra.authorName) book.authors = [extra.authorName];
                if (extra.firstPublishYear && !book.publishedDate) book.publishedDate = String(extra.firstPublishYear).slice(0, 4);
                if (!book.cover && extra.covers?.length) {
                    const c = extra.covers.find((x) => Number(x) > 0);
                    if (c) book.cover = `https://covers.openlibrary.org/b/id/${c}-M.jpg?default=false`;
                }
                if (book.iaId) {
                    const ia = booksRegistry.getProvider("internetarchive");
                    const access = await ia.getAccess(book.iaId);
                    book.accessLevel = access.level;
                    book.pdfFile = access.pdfFile || null;
                    book.fullTextAvailable = access.level === "full";
                    book.downloadAllowed = access.level === "full" && Boolean(access.pdfFile);
                    if (access.level === "full") book.license = "public-domain";
                }
            }
            if (provider === "internetarchive") {
                // access classification already inside the item fetch
                book.readingSources = await booksRegistry.getBookReadingSources(book);
                return res.json({ status: "ok", book });
            }
            book.readingSources = await booksRegistry.getBookReadingSources(book);
            res.json({ status: "ok", book });
        } catch (err) {
            console.error("GET /books/:provider/:id error:", err.message);
            res.status(err.status || 500).json({ status: "error", message: err.message });
        }
    }
);

// in-site reading content ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Gutenberg HTML/text or Wikisource HTML, proxied
// (sanitized downstream in the reader UI; scripts stripped before render)
app.get(
    "/books/:provider/:providerBookId/read",
    async(req, res) => {
        try {
            const { provider, providerBookId } = req.params;
            const p = booksRegistry.getProvider(provider);
            if (!p || typeof p.getReadContent !== "function") return res.status(400).json({ status: "error", message: "NO_IN_SITE_READER_FOR_SOURCE" });
            const text = await p.getReadContent(providerBookId);
            if (!text) return res.status(404).json({ status: "error", message: "NO_READABLE_FORMAT" });
            res.json({ status: "ok", format: text.format, content: text.content.slice(0, 2000000) });
        } catch (err) {
            console.error("GET /books/:provider/:id/read error:", err.message);
            res.status(err.status || 500).json({ status: "error", message: err.message });
        }
    }
);

// PDF proxy ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â public-domain PDFs only (Gutenberg ebook / IA public scan).
// Streams Range requests so pdf.js lazy-fetches pages instead of pulling
// whole files. Access level is re-verified server-side before streaming.
app.get(
    "/books/:provider/:providerBookId/pdf",
    async(req, res) => {
        try {
            const { provider, providerBookId } = req.params;
            let url = null;
            if (provider === "gutenberg") {
                url = await booksRegistry.getProvider("gutenberg").getPdfUrl(providerBookId);
            } else if (provider === "internetarchive") {
                const ia = booksRegistry.getProvider("internetarchive");
                const access = await ia.getAccess(providerBookId);
                if (access.level !== "full") return res.status(403).json({ status: "error", message: "BORROW_ONLY_OR_RESTRICTED" });
                url = access.pdfFile;
            } else if (provider === "doab") {
                const b = await booksRegistry.getBook("doab", providerBookId);
                url = b?.formats?.pdf || null; // publisher-hosted OA PDF
            }
            if (!url) return res.status(404).json({ status: "error", message: "NO_PDF" });
            const headers = { Accept: "application/pdf", "User-Agent": "BayanSpace/1.0" };
            if (req.headers.range) headers.Range = req.headers.range;
            const upstream = await fetch(url, { headers });
            if (!upstream.ok && upstream.status !== 206) {
                return res.status(502).json({ status: "error", message: `UPSTREAM_${upstream.status}` });
            }
            const outHeaders = { "Content-Type": "application/pdf", "Accept-Ranges": "bytes" };
            for (const h of ["content-length", "content-range", "etag", "last-modified"]) {
                const v = upstream.headers.get(h);
                if (v) outHeaders[h] = v;
            }
            res.writeHead(upstream.status, outHeaders);
            // upstream.body is a Node-readable (PassThrough) in this fetch polyfill
            if (typeof upstream.body.pipe === "function") {
                upstream.body.pipe(res);
                upstream.body.on("error", () => res.destroy());
            } else {
                const { Readable } = require("stream");
                Readable.fromWeb(upstream.body).pipe(res);
            }
            req.on("close", () => { try { upstream.body?.destroy?.(); } catch { /* gone */ } });
        } catch (err) {
            console.error("GET /books/:provider/:id/pdf error:", err.message);
            if (!res.headersSent) res.status(err.status || 500).json({ status: "error", message: err.message });
            else res.destroy();
        }
    }
);
// GET /books/:provider/:providerBookId/progress ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â restore reading progress
app.get(
    "/books/:provider/:providerBookId/progress",
    requireUser,
    async(req, res) => {
        try {
            const bookKey = bookRecordKey(req.params.provider, req.params.providerBookId);
            if (!bookKey) return res.status(400).json({ status: "error", message: "INVALID_BOOK_ID" });
            const snap = await get(ref(db, `user_data/Profile/${req.user.id}/savedContent/books/${bookKey}`));
            res.json({ status: "ok", record: snap.exists() ? snap.val() : null });
        } catch (err) {
            console.error("GET books progress error:", err.message);
            res.status(500).json({ status: "error", message: err.message });
        }
    }
);

// PUT /books/:provider/:providerBookId/progress ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â save reading position.
// Identity from verifyToken only; field sizes validated; owner can never
// touch another user's record because the path is derived from the token.
app.put(
    "/books/:provider/:providerBookId/progress",
    requireUser,
    async(req, res) => {
        try {
            const bookKey = bookRecordKey(req.params.provider, req.params.providerBookId);
            if (!bookKey) return res.status(400).json({ status: "error", message: "INVALID_BOOK_ID" });
            const b = req.body || {};
            const allowed = ["readingFormat", "currentPage", "totalPages", "currentChapter", "currentLocation", "scrollPosition", "progressPercent", "readingStatus"];
            const update = {};
            for (const k of allowed) if (b[k] !== undefined) update[k] = b[k];
            if (update.readingFormat && !ReadingEngine_FORMATS.includes(update.readingFormat)) return res.status(400).json({ status: "error", message: "INVALID_FORMAT" });
            if (update.readingStatus && !READ_STATUSES.includes(update.readingStatus)) return res.status(400).json({ status: "error", message: "INVALID_STATUS" });
            for (const k of ["currentPage", "totalPages"]) {
                if (update[k] !== undefined && (!Number.isFinite(Number(update[k])) || update[k] < 0 || update[k] > 100000)) return res.status(400).json({ status: "error", message: `INVALID_${k.toUpperCase()}` });
            }
            if (update.progressPercent !== undefined) {
                const p = Number(update.progressPercent);
                if (!Number.isFinite(p) || p < 0 || p > 100) return res.status(400).json({ status: "error", message: "INVALID_PROGRESS" });
                update.progressPercent = Math.round(p);
            }
            if (update.currentLocation !== undefined && String(update.currentLocation).length > 500) return res.status(400).json({ status: "error", message: "INVALID_LOCATION" });
            if (update.currentChapter !== undefined && String(update.currentChapter).length > 200) return res.status(400).json({ status: "error", message: "INVALID_CHAPTER" });
            if (Object.keys(update).length === 0) return res.status(400).json({ status: "error", message: "EMPTY_UPDATE" });

            const base = `user_data/Profile/${req.user.id}/savedContent/books/${bookKey}`;
            const snap = await get(ref(db, base));
            const prev = snap.exists() ? snap.val() : {};
            const now = new Date().toISOString();
            const record = {
                bookId: bookKey,
                ...prev,
                ...update,
                savedAt: prev.savedAt || now,
                lastReadAt: now,
                completedAt: update.readingStatus === "completed" ? (prev.completedAt || now) : (update.readingStatus ? null : prev.completedAt || null),
                updatedAt: now,
            };
            await set(ref(db, base), record);
            res.json({ status: "ok", record });
        } catch (err) {
            console.error("PUT books progress error:", err.message);
            res.status(500).json({ status: "error", message: err.message });
        }
    }
);

// DELETE ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â remove a book from the user's saved list (same authorization)
app.delete(
    "/books/:provider/:providerBookId/progress",
    requireUser,
    async(req, res) => {
        try {
            const bookKey = bookRecordKey(req.params.provider, req.params.providerBookId);
            if (!bookKey) return res.status(400).json({ status: "error", message: "INVALID_BOOK_ID" });
            await set(ref(db, `user_data/Profile/${req.user.id}/savedContent/books/${bookKey}`), null);
            res.json({ status: "ok" });
        } catch (err) {
            console.error("DELETE books progress error:", err.message);
            res.status(500).json({ status: "error", message: err.message });
        }
    }
);

// EPUB proxy ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â public-domain Gutenberg EPUBs only. The URL is resolved
// server-side from Gutendex metadata (never from user input ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ no SSRF).
// epub.js reads it cross-origin-free and lazily fetches CFI ranges.
app.get(
    "/books/:provider/:providerBookId/epub",
    async(req, res) => {
        try {
            const { provider, providerBookId } = req.params;
            let url = null;
            if (provider === "gutenberg") {
                url = await booksRegistry.getProvider("gutenberg").getEpubUrl(providerBookId);
            }
            if (!url) return res.status(404).json({ status: "error", message: "NO_EPUB" });
            const upstream = await fetch(url, { headers: { "User-Agent": "BayanSpace/1.0" } });
            if (!upstream.ok) return res.status(502).json({ status: "error", message: `UPSTREAM_${upstream.status}` });
            const len = upstream.headers.get("content-length");
            // guard: refuse absurdly large files (20MB cap)
            if (len && Number(len) > 20 * 1024 * 1024) return res.status(413).json({ status: "error", message: "EPUB_TOO_LARGE" });
            res.writeHead(200, {
                "Content-Type": "application/epub+zip",
                ...(len ? { "Content-Length": len } : {}),
                "Cache-Control": "public, max-age=86400",
            });
            if (typeof upstream.body.pipe === "function") {
                upstream.body.pipe(res);
                upstream.body.on("error", () => res.destroy());
            } else {
                const { Readable } = require("stream");
                Readable.fromWeb(upstream.body).pipe(res);
            }
            req.on("close", () => { try { upstream.body?.destroy?.(); } catch { /* gone */ } });
        } catch (err) {
            console.error("GET /books/:provider/:id/epub error:", err.message);
            if (!res.headersSent) res.status(err.status || 500).json({ status: "error", message: err.message });
            else res.destroy();
        }
    }
);

// EPUB proxy ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â same-origin streaming for public-domain EPUBs only.
// Access + host are verified server-side (SSRF-safe, DRM never passes).
const { epubProxyHandler } = require("./service/books/epubProxy.js");
app.get(
    "/books/:provider/:providerBookId/epub",
    (req, res) => epubProxyHandler(req, res, booksRegistry)
);

// DOAB index status ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â honest loading state for the UI while the first
// harvest populates the local index (never show "no results" while empty
// due to initial harvesting in progress).
app.get(
    "/books-doab-status",
    async(req, res) => {
        try {
            const snap = await get(ref(db, "books_index/doab/meta"));
            const meta = snap.val() || {};
            res.json({ status: "ok", ...meta });
        } catch (err) {
            console.error("GET /books/doab/status error:", err.message);
            res.status(500).json({ status: "error", message: err.message });
        }
    }
);

setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000; // 1h
    for (const [k, v] of triviaSessions) if (v.at < cutoff) triviaSessions.delete(k);
}, 15 * 60 * 1000).unref();

app.get(
    "/trivia/categories",
    async(req, res) => {
        try {
            res.json({ status: "ok", ...(await trivia.getCategories()) });
        } catch (err) {
            console.error("GET /trivia/categories error:", err.message);
            res.status(err.status || 500).json({ status: "error", message: err.message });
        }
    }
);

app.post(
    "/trivia/session",
    requireUser,
    async(req, res) => {
        try {
            const { amount, category, difficulty, type } = req.body || {};
            const { sessionId, questions, key, config } = await trivia.createSession({ amount, category, difficulty, type });
            triviaSessions.set(sessionId, { key, userId: req.user.id, at: Date.now() });
            // server-side ownership: only the creator can grade this session
            res.json({ status: "ok", sessionId, questions, config });
        } catch (err) {
            console.error("POST /trivia/session error:", err.message);
            res.status(err.status || 500).json({ status: "error", message: err.message, code: err.code });
        }
    }
);

app.post(
    "/trivia/answer",
    requireUser,
    async(req, res) => {
        try {
            const { sessionId, question, answer } = req.body || {};
            const session = triviaSessions.get(String(sessionId || ""));
            if (!session) return res.status(404).json({ status: "error", message: "SESSION_NOT_FOUND" });
            if (session.userId !== req.user.id) return res.status(403).json({ status: "error", message: "NOT_YOUR_SESSION" });
            // Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â±ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¤ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â£Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â«ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±ÃƒËœÃ‚Â©
            session.answered = session.answered || new Set();
            const answeredKey = String(question || "");
            if (session.answered.has(answeredKey)) {
                return res.status(409).json({ status: "error", message: "ALREADY_ANSWERED" });
            }
            const result = trivia.checkAnswer(session, String(question || ""), answer);
            if (!result) return res.status(404).json({ status: "error", message: "QUESTION_NOT_IN_SESSION" });
            session.answered.add(answeredKey);
            res.json({ status: "ok", ...result });
        } catch (err) {
            console.error("POST /trivia/answer error:", err.message);
            res.status(500).json({ status: "error", message: err.message });
        }
    }
);

// ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¸ Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã…Â ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã†â€™ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â­ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¨ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â®ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ…â€™
// Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â«Ãƒâ„¢Ã¢â‚¬Å¡ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â£Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾.
app.post(
    "/trivia/save-result",
    requireUser,
    async(req, res) => {
        try {
            const { sessionId, config, answers, timeSpentSec } = req.body || {};
            const session = triviaSessions.get(String(sessionId || ""));
            if (!session) return res.status(404).json({ status: "error", message: "SESSION_NOT_FOUND" });
            if (session.userId !== req.user.id) return res.status(403).json({ status: "error", message: "NOT_YOUR_SESSION" });
            if (!Array.isArray(answers) || !answers.length) {
                return res.status(400).json({ status: "error", message: "NO_ANSWERS" });
            }
            let correct = 0;
            const review = [];
            for (const a of answers.slice(0, 20)) {
                const r = trivia.checkAnswer(session, String(a.question || ""), a.answer);
                if (!r) continue;
                if (r.isCorrect) correct++;
                review.push({ question: String(a.question || "").slice(0, 300), answer: String(a.answer || "").slice(0, 300), correctAnswer: r.correct.slice(0, 300), isCorrect: r.isCorrect });
            }
            const total = review.length;
            if (!total) return res.status(400).json({ status: "error", message: "NO_VALID_ANSWERS" });
            const record = {
                sessionId: String(sessionId).slice(0, 40),
                category: String(config?.category || "").slice(0, 60),
                categoryName: String(config?.categoryName || "").slice(0, 80),
                difficulty: String(config?.difficulty || "any").slice(0, 10),
                type: String(config?.type || "any").slice(0, 10),
                total,
                correct,
                accuracy: Math.round((correct / total) * 100),
                timeSpentSec: Math.min(Math.max(Number(timeSpentSec) || 0, 0), 3600),
                review,
                savedAt: new Date().toISOString(),
            };
            const path = `user_data/Profile/${req.user.id}/triviaResults/${record.sessionId}`;
            await set(ref(db, path), record);
            res.json({ status: "ok", record });
        } catch (err) {
            console.error("POST /trivia/save-result error:", err.message);
            res.status(500).json({ status: "error", message: err.message });
        }
    }
);

// ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â®ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â²Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾: uid Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â€šÂ¬ JWT Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·
app.get(
    "/trivia/history",
    requireUser,
    async(req, res) => {
        try {
            const snap = await get(ref(db, `user_data/Profile/${req.user.id}/triviaResults`));
            const val = snap.exists() ? snap.val() : {};
            const history = Object.values(val)
                .filter((r) => r && typeof r === "object")
                .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
                .slice(0, 50);
            res.json({ status: "ok", history });
        } catch (err) {
            console.error("GET /trivia/history error:", err.message);
            res.status(500).json({ status: "error", message: err.message });
        }
    }
);

// ======================================================
// QURAN ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â AlQuran Cloud (proxy + cacheÃƒËœÃ¢â‚¬Âº ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Âµ Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€  ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â£Ãƒâ„¢Ã…Â  ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾)
// ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© (ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â ) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡ÃƒËœÃ‚Â© Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·ÃƒËœÃ…â€™ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â´ÃƒËœÃ‚Â®ÃƒËœÃ‚ÂµÃƒâ„¢Ã…Â ÃƒËœÃ‚Â©
// ======================================================
const quranService = require("./service/quran.service.js");
quranService.initQuran({ cacheGet, cacheSet });

app.get(
    "/quran/surahs",
    async(req, res) => {
        try {
            res.json({ status: "ok", ...(await quranService.getSurahs()) });
        } catch (err) {
            console.error("GET /quran/surahs error:", err.message);
            res.status(err.status || 500).json({ status: "error", message: err.message });
        }
    }
);

app.get(
    "/quran/translations",
    async(req, res) => {
        try {
            res.json({ status: "ok", ...(await quranService.getTranslations()) });
        } catch (err) {
            console.error("GET /quran/translations error:", err.message);
            res.status(err.status || 500).json({ status: "error", message: err.message });
        }
    }
);

app.get(
    "/quran/reciters",
    async(req, res) => {
        try {
            res.json({ status: "ok", ...(await quranService.getReciters()) });
        } catch (err) {
            console.error("GET /quran/reciters error:", err.message);
            res.status(err.status || 500).json({ status: "error", message: err.message });
        }
    }
);

app.get(
    "/quran/surah/:number",
    async(req, res) => {
        try {
            const { translation, reciter, bitrate } = req.query;
            res.json({ status: "ok", ...(await quranService.getSurah(req.params.number, { translation, reciter, bitrate })) });
        } catch (err) {
            console.error("GET /quran/surah/:number error:", err.message);
            res.status(err.status || 500).json({ status: "error", message: err.message });
        }
    }
);

// ÃƒËœÃ‚Â¢ÃƒËœÃ‚Â®ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¶ÃƒËœÃ‚Â¹ Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡ÃƒËœÃ‚Â© + ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â´ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â³ ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©ÃƒËœÃ…â€™ uid Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â€šÂ¬ JWT
app.get(
    "/quran/progress",
    requireUser,
    async(req, res) => {
        try {
            const snap = await get(ref(db, `user_data/Profile/${req.user.id}/quranProgress`));
            res.json({ status: "ok", progress: snap.exists() ? snap.val() : null });
        } catch (err) {
            console.error("GET /quran/progress error:", err.message);
            res.status(500).json({ status: "error", message: err.message });
        }
    }
);

app.put(
    "/quran/progress",
    requireUser,
    async(req, res) => {
        try {
            const surah = Math.min(Math.max(1, Number(req.body?.surah) || 1), 114);
            const ayah = Math.max(1, Number(req.body?.ayah) || 1);
            const record = { surah, ayah, updatedAt: new Date().toISOString() };
            await set(ref(db, `user_data/Profile/${req.user.id}/quranProgress`), record);
            res.json({ status: "ok", record });
        } catch (err) {
            console.error("PUT /quran/progress error:", err.message);
            res.status(500).json({ status: "error", message: err.message });
        }
    }
);

app.get(
    "/quran/bookmarks",
    requireUser,
    async(req, res) => {
        try {
            const snap = await get(ref(db, `user_data/Profile/${req.user.id}/quranBookmarks`));
            const val = snap.exists() ? snap.val() : {};
            const bookmarks = Object.values(val).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 100);
            res.json({ status: "ok", bookmarks });
        } catch (err) {
            console.error("GET /quran/bookmarks error:", err.message);
            res.status(500).json({ status: "error", message: err.message });
        }
    }
);

app.put(
    "/quran/bookmarks",
    requireUser,
    async(req, res) => {
        try {
            const surah = Math.min(Math.max(1, Number(req.body?.surah) || 1), 114);
            const ayah = Math.max(1, Number(req.body?.ayah) || 1);
            const note = String(req.body?.note || "").slice(0, 140);
            const id = `s${surah}a${ayah}`;
            const existing = await get(ref(db, `user_data/Profile/${req.user.id}/quranBookmarks/${id}`));
            if (existing.exists()) {
                await set(ref(db, `user_data/Profile/${req.user.id}/quranBookmarks/${id}`), null);
                return res.json({ status: "ok", bookmarked: false });
            }
            const record = { id, surah, ayah, note, createdAt: new Date().toISOString() };
            await set(ref(db, `user_data/Profile/${req.user.id}/quranBookmarks/${id}`), record);
            res.json({ status: "ok", bookmarked: true, record });
        } catch (err) {
            console.error("PUT /quran/bookmarks error:", err.message);
            res.status(500).json({ status: "error", message: err.message });
        }
    }
);

// ======================================================
// BOOKS ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Gutendex (Project Gutenberg) + Open Library proxy
// ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§ÃƒËœÃ‚Â´ ÃƒËœÃ‚Â®ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â ÃƒËœÃ¢â‚¬Âº Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â§ÃƒËœÃ‚ÂªÃƒâ„¢Ã…Â ÃƒËœÃ‚Â­ÃƒËœÃ¢â‚¬Âº Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ ÃƒËœÃ‚ÂªÃƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â©. ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â  ÃƒËœÃ‚ÂµÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â­
// (full / borrow / readonline / metadata) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â· Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©.
// ======================================================

io.use((socket, next) => {
    // SECURITY (Phase 1): every Socket.IO connection may present the same
    // Bearer JWT used by the REST API (socket.handshake.auth.token).
    // Unauthenticated sockets connect ONLY as guests: no identity, no
    // interest rooms, no follow/unfollow, no like/unlike; they receive the
    // guest discovery feed only (pre-existing guest behavior preserved).
    const raw = socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization || "").replace(/^Bearer /, "");
    if (raw) {
        try {
            const decoded = jwt.verify(raw, process.env.ACCESS_TOKEN_SECRET);
            if (decoded && decoded.id != null && decoded.pass === undefined) {
                socket.userId = String(decoded.id);
                socket.userName = String(decoded.name || "");
            }
        } catch {
            // invalid token ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ guest (identity NOT trusted)
        }
    }
    next();
});
io.on("connection", (socket) => {
    // Server-side identity only ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â the client-supplied query userId is ignored.
    const userId = socket.userId || null;
    if (userId) {
        onlineUsers.set(userId, socket.id);
        socket.join(`user:${userId}`);
    }

    // SET INTERESTS ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â SECURITY (Phase 1): identity from the authenticated
    // handshake; the client-supplied idUser parameter is ignored.
    socket.on("setInterests", async(idUser, interests) => {
        try {
            if (!socket.userId) return socket.emit("result", { status: "error", message: "Authentication required" });
            if (!rateOK(`si:${socket.userId}`, 10, 60000)) return socket.emit("result", { status: "error", message: "Rate limited" });
            const clean = sanitizeInterests(interests);
            if (!clean) return socket.emit("result", { status: "error", message: "Invalid interests" });
            await DaoForDbUser.updateUserToInsertInteresting(socket.userId, clean);
            if (useRedis && redisClient) {
                await redisClient.del(`user:${socket.userId}`);
            } else {
                memoryCache.delete(`user:${socket.userId}`);
            }
            clean.articles?.forEach((i) => socket.join(`room:${i}`));
            clean.novels?.forEach((i) => socket.join(`room:${i}`));
            socket.emit("result", { status: "ok" });
        } catch (err) {
            console.log("ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ setInterests error:", err.message);
            socket.emit("result", { status: "error", message: "Failed to update interests" });
        }
    });

    // JOIN ROOMS ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â SECURITY (Phase 1): authenticated, own interests only.
    socket.on("JOIN_ROOMS", async() => {
        try {
            if (!socket.userId) return;
            const user = await getUser(socket.userId);
            if (!user) return;
            (user?.interesting?.articles || []).forEach((i) => socket.join(`room:${i}`));
            (user?.interesting?.novels || []).forEach((i) => socket.join(`room:${i}`));
        } catch (err) {
            console.log("JOIN_ROOMS error:", err.message);
        }
    });

// TRACK ENGAGEMENT ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â SECURITY (Phase 1): requires an authenticated socket;
// the acting userId comes from the handshake, never the payload.
socket.on("ENGAGEMENT", async ({ contentId, type, contentType = "posts" }) => {
  try {
    if (!socket.userId) {
      return socket.emit("ENGAGEMENT_ERROR", { contentId, message: "Authentication required" });
    }
    const userId = socket.userId;
    if (!contentId) {
      return socket.emit("ENGAGEMENT_ERROR", { contentId, message: "Missing contentId" });
    }
    if (!["like", "unlike"].includes(type)) {
      return socket.emit("ENGAGEMENT_ERROR", { contentId, message: "Invalid engagement type" });
    }
    if (!rateOK(`eng:${userId}`, 60, 60000)) {
      return socket.emit("ENGAGEMENT_ERROR", { contentId, message: "Rate limited" });
    }
    await trackEngagement(contentId, userId, type);
    await invalidateAllFeedCaches();
    let dataContent;
    switch (contentType) {
      case "posts":
        dataContent = await dao.getPostID(contentId);
        break;
      case "articles":
        dataContent = await dao.getArticleID(contentId);
        break;
      case "novels":
        dataContent = await dao.getnovelsID(contentId);
        break;
      default:
        return socket.emit("ENGAGEMENT_ERROR", { contentId, message: "Invalid content type" });
    }
    if (!dataContent) {
      return socket.emit("ENGAGEMENT_ERROR", { contentId, message: "Content not found after update" });
    }
    io.emit("LIKE_UPDATED", { contentType, post: dataContent });
  } catch (error) {
    console.error("ENGAGEMENT error:", error.message);
    socket.emit("ENGAGEMENT_ERROR", { contentId, message: "Failed to update engagement" });
  }
});

    // MY CONTENT ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â SECURITY (Phase 1): authenticated sockets only; idUser from
    // the handshake. Guests get an empty result (same as unknown ids before).
    socket.on("MYCONTENT", async(payload = {}) => {
        try {
            const type = payload.type || "all";
            const cursor = payload.cursor || 0;
            const limit = payload.limit || 10;
            if (!socket.userId) {
                return socket.emit("CONTENT_RESULT", { items: [], nextCursor: null, counts: {} });
            }
            if (!rateOK(`mc:${socket.userId}`, 30, 60000)) {
                return socket.emit("CONTENT_RESULT", { items: [], nextCursor: null, counts: {}, error: "Rate limited" });
            }
            const result = await getProfileContent({ idUser: socket.userId, type, cursor, limit });
            socket.emit("CONTENT_RESULT", result);
        } catch (err) {
            console.log("MYCONTENT ERROR:", err.message);
            socket.emit("CONTENT_RESULT", { items: [], nextCursor: null, counts: {}, error: err.message });
        }
    });

socket.on("GET_FEED", async ({ type = "posts", cursor = 0, limit = 20 } = {}) => {
    // SECURITY (Phase 1): the feed user comes from the authenticated
    // handshake. Guests (unauthenticated) keep the discovery feed ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â
    // identical public behavior to before.
    try {
        const effectiveUser = socket.userId ? await getUser(socket.userId) : null;
        if (socket.userId && !effectiveUser) {
            let feed = await recommendFeed(null, type);
            feed = await enrichContent(feed);
            const result = paginate(feed, limit, cursor);
            return socket.emit("FEED_RESULT", result);
        }
        let feed = await recommendFeed(effectiveUser, type);
        feed = await enrichContent(feed);
        const result = paginate(feed, limit, cursor);
        socket.emit("FEED_RESULT", result);
    } catch (err) {
        console.log("GET_FEED error:", err.message);
    }
});

    // NEW POST LIVE ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â public broadcast to category rooms (unchanged public
    // behavior); authorship of the underlying content is enforced elsewhere.
    socket.on("NEW_POST", async({ category, post } = {}) => {
        try {
            if (!socket.userId) return; // guests cannot seed broadcasts
            io.to(`room:${category}`).emit("NEW_POST", post);
        } catch (err) {
            console.log("NEW_POST error:", err.message);
        }
    });

    // FOLLOW USER ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â SECURITY (Phase 1): identity from handshake; spoofable
    // idUser payload ignored; target must exist.
    socket.on("followUser", async(payload = {}) => {
        try {
            const idFollowedUser = payload.idFollowedUser;
            if (!socket.userId) return socket.emit("followError", { message: "Authentication required" });
            if (!idFollowedUser || String(idFollowedUser) === String(socket.userId)) return;
            const target = await getUser(idFollowedUser);
            if (!target) return;
            await sign.IncreasingFollowing(socket.userId, idFollowedUser);
            await sign.IncreasingFollowers(socket.userId, idFollowedUser);
            const targetSocket = onlineUsers.get(String(idFollowedUser));
            if (targetSocket) io.to(targetSocket).emit("newFollower", { from: socket.userId });
            socket.emit("followSuccess", { userId: idFollowedUser });
        } catch (err) {
            console.log("followUser error:", err.message);
        }
    });

    // UNFOLLOW USER ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â same identity rules as followUser
    socket.on("unfollowUser", async(payload = {}) => {
        try {
            const idFollowedUser = payload.idFollowedUser;
            if (!socket.userId) return socket.emit("unfollowError", { message: "Authentication required" });
            if (!idFollowedUser || String(idFollowedUser) === String(socket.userId)) return;
            await sign.DecreaseFollowing(socket.userId, idFollowedUser);
            await sign.DecreaseFollower(socket.userId, idFollowedUser);
            const targetSocket = onlineUsers.get(String(idFollowedUser));
            if (targetSocket) io.to(targetSocket).emit("lostFollower", { from: socket.userId });
            socket.emit("unfollowSuccess", { userId: idFollowedUser });
        } catch (err) {
            console.log("unfollowUser error:", err.message);
        }
    });

    // DISCONNECT
    socket.on("disconnect", () => {
        console.log("ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â´ Client disconnected:", socket.id);
        if (socket.userId) onlineUsers.delete(socket.userId);
    });
});
// ======================================================
// BAYAN CONTROL CENTER ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â admin namespace (/admin/api/*)
// Independent credential store, JWT secret, sessions and RBAC.
// Mounted AFTER all user routes; touches no existing behavior.
// See control-center/docs/ for the architecture map and API docs.
// ======================================================
try {
    const adminCore = require("./admin/core");
    const adminRouter = require("./admin/index");
    // db          = user/auth database (chatweb-2e06a)
    // dao's db    = content database (tiaralamal)
    const contentDb = require("./datastore/firebaseArticle").db;
    adminCore.initAdmin({
        dbUsers: db,
        dbContent: contentDb,
        cacheGet,
        cacheSet,
        io,
        redisMode: useRedis ? "redis" : "memory",
    });
    app.use("/admin/api", adminRouter);
    console.log("ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ‚Â¡ÃƒÂ¯Ã‚Â¸Ã‚Â  Control Center admin API mounted at /admin/api");
} catch (adminErr) {
    // Fail-safe: an admin module problem must never take the platform down.
    console.error("Control Center admin module failed to mount:", adminErr.message);
}

// ======================================================
// START SERVER
// ======================================================

httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Unified Server running on port ${PORT}`);
    console.log(`   REST API  ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ http://localhost:${PORT}`);
    console.log(`   Socket.IO ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ws://localhost:${PORT}`);
});
