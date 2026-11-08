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
 * تصنيف تلقائي — يستخدم الترجمة إلى الإنجليزية عبر Translation Service
 * بدل مكتبة Google المباشرة (تم استبدالها بـ LibreTranslate).
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
        return text; // fallback للنص الأصلي — التصنيف يستمر
    }
}

const sign = require("./datastore/signin_signupDao_firebase.js");
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
// Firebase Realtime Database — المستخدمة في getFocusData و/update(ref(db...)))
// (كانت تُستخدم دون استيراد في أجزاء قديمة — تصحيح: استيراد موحد هنا)
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
// strict list above — no wildcard, and these are never sent in prod.
if (process.env.NODE_ENV !== "production") {
    allowedOrigins.push("http://localhost:3001", "http://localhost:3011");
}

const app = express();
const httpServer = createServer(app);

// CORS لطلبات Express العادية مثل signup و login
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
// CORS الخاص بـ Socket.IO
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
            console.log("🟢 Redis Connected");
        } catch {
            console.log("⚠ Redis not available -> Memory Cache Enabled");
            useRedis = false;
        }
    } catch {
        console.log("⚠ Redis package not installed -> Memory Cache Enabled");
        useRedis = false;
    }
})();

// ======================================================
// HELPERS (مشتركة)
// ======================================================

function generateUniqueId() {
    return Math.floor(Math.random() * 999999999).toString().padStart(9, "1");
}

function generateToken(payload) {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "720h" });
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

        // حذف العنصر عند انتهاء صلاحيته
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

// نظام الصوت (Audio Hub) — حقن الكاش والـ fetch من هذا الملف
initAudioHub({ cacheGet, cacheSet, fetchImpl: fetch });


async function cacheDelPattern(pattern) {
    // حذف المفاتيح المطابقة من Memory Cache
    for (const key of memoryCache.keys()) {
        if (key.startsWith(pattern.replace("*", ""))) {
            memoryCache.delete(key);
        }
    }

    // حذف المفاتيح المطابقة من Redis
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

        // التحقق من صحة الرقم
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
        // المصدر الحقيقي لكل سجل: id → المجموعة التي جاء منها فعلاً
        // (يتجاهل الكشف التقريبي بالشكل — السجلات القديمة بلا type تُعرّف من هنا)
        const collectionTypeById = new Map();

        for (const t of types) {
            // استخراج الاهتمامات حسب نوع المحتوى — الضيف (user=null) لا يملك
            // اهتمامات، فيذهب مباشرة لمسار المحتوى العام أدناه.
            const interests =
                (user && (t === "novels"
                    ? (user?.interesting?.novels || [])
                    : (user?.interesting?.articles || []))) || [];

            // محتوى هذا النوع وحده — الرجوع (fallback) لكل نوع مستقل
            // حتى لا يمتلئ الـ feed من posts ويُقصى novels/articles
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
            // إذا لم توجد اهتمامات أو لم ينتج عنها محتوى — لكل نوع على حدة
            // =====================================
            if (typeContent.length === 0) {
                console.log("No personalized feed found. Loading random content...", t);
                typeContent = await dao.getAllContent(t, 20);
            }

            // وسم كل سجل بمجموعته قبل الدمج — هذا هو التطبيع الموحد للعرض
            for (const item of typeContent) {
                if (!item || item.id == null) continue;
                const key = String(item.id);
                collectionTypeById.set(key, t);
                allContent.push(item);
            }
        }

        // =====================================
        // إزالة المحتويات المكررة
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

        // كل نوع يحمل نوعه من المجموعة التي جاء منها فعلاً (المصدر الموثوق) —
        // حقل type على السجل قد يكون ملوثًا (الردود تحمل parentType) أو غائبًا (سجلات قديمة).
        allContent = allContent.map((item) => ({
            ...item,
            type: collectionTypeById.get(String(item.id)) || item.type || "posts",
        }));

        // =====================================
        // حساب الـ Score لكل محتوى
        // =====================================
        const scored = await Promise.all(
            allContent.map(async (item) => ({
                ...item,
                score: await getScore(item)
            }))
        );
        console.log("All scored: ", scored.length);

        // =====================================
        // ترتيب: الـ score أولًا، ثم الأحدث زمنيًا عند تساوي الـ score
        // (السجلات القديمة بلا timestamp تذهب أخيرًا بأمان)
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

// translateToEnglish معرّف أعلى الملف — يستخدم Translation Service (LibreTranslate)

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

// ✅ تسجيل الدخول
app.post("/signin", async(req, res) => {
    const { identifierUser, password } = req.body;
    if (!identifierUser || !password)
        return res.status(400).json({ message: "Please enter all fields" });

    try {
        const user = await sign.login_user(identifierUser, password);
        if (!user) return res.status(401).json({ message: "Invalid credentials" });

        const payload = { id: user.Id_user, name: user.F_user, username: user.S_user, pass: user.psw };
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

// ✅ تسجيل الدخول بجوجل
app.post("/authGoogle", async(req, res) => {
    const { email, uid } = req.body;
    if (!email || !uid) return res.status(400).json({ message: "Please enter all fields" });
    console.log(email)
    console.log(uid)

    try {
        const existingUser = await sign.findUserByEmailAndUid(email, uid);
        if (!existingUser)
            return res.status(404).json({ message: "Invalid login credentials.", email, uid });

        const payload = { id: existingUser.Id_user, name: existingUser.F_user, username: existingUser.S_user, pass: existingUser.psw };
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

        res.json({ message: "Login successful", accessToken: generateToken(payload), userData });
    } catch (err) {
        console.error("Google login error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ✅ تسجيل حساب جديد
app.post("/signup", async(req, res) => {
    const { fullName, username, email, uid, password } = req.body;
    if (!fullName || !username || !password)
        return res.status(400).json({ message: "Please enter all fields" });

    try {
        const existsName = await sign.logup_user_check_fsp(fullName, username, password);
        if (existsName) return res.status(409).json({ message: "Username already exists" });

        const existingUser = await sign.findUserByEmailAndUid(email, uid);

        if (existingUser) {
            const payload = { id: existingUser.Id_user, name: existingUser.F_user, username: existingUser.S_user, pass: existingUser.psw };
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
        const token = generateToken({ id: uniqueId, username, pass: password });
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

// ✅ تحقق من الـ Token
app.post("/auth", (req, res) => {
    if (!req.headers.authorization?.startsWith("Bearer "))
        return res.status(401).json({ message: "No token provided" });

    const token = req.headers.authorization.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async(err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        try {
            const user = await sign.login_user(decoded.id, decoded.pass);
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

// ✅ تعديل الملف الشخصي
app.post("/editProfile", async(req, res) => {
    const { Updatable, status } = req.body;
    if (!req.headers.authorization?.startsWith("Bearer "))
        return res.status(401).json({ message: "No token provided" });

    const token = req.headers.authorization.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async(err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid token" });

        const buildUserData = async(u) => {
            const settings = await sign.getUserSettings(u.Id_user);

            return {
                imgProfile: u.imgProfile,
                id: u.Id_user,
                name: u.F_user,
                username: u.S_user,
                Bio: u.Bio,
                followers: u.followers,
                following: u.following,
                IdPoster: u.Posters,
                settings
            };
        };
        try {
            let updatedUser;
            // تطبيع اسم الحقل: الواجهة قد ترسل "Bio" أو "bio" أو "name"/"img" بأي حالة.
            const statusKey = String(status || "").toLowerCase();
            const trimmedValue = typeof Updatable === "string" ? Updatable.trim() : Updatable;

            if (statusKey === "img") {
                updatedUser = await sign.logup_user_Insert_ImgProfile(trimmedValue, decoded.username, decoded.pass);
            } else if (statusKey === "name") {
                updatedUser = await sign.logup_user_Insert_Name(trimmedValue, decoded.username, decoded.pass);
            } else if (statusKey === "bio") {
                // فارغ مسموح (تصميم المنتج يسمح بمحيّة بدون بايو) — لكن ليس undefined/null.
                if (trimmedValue == null)
                    return res.status(400).json({ message: "Bio value is required (may be empty string)" });
                updatedUser = await sign.logup_user_Insert_BIO(trimmedValue, decoded.username, decoded.pass);
            } else {
                return res.status(400).json({ message: "Invalid status" });
            }

            if (!updatedUser || updatedUser.Id_user == null)
                return res.status(500).json({ message: "Profile update did not return user data" });

            await invalidateUserCache(updatedUser.Id_user);
            res.json({ message: "Profile updated", userData: await buildUserData(updatedUser) });
        } catch (err) {
            console.error("Profile update error:", err);
            res.status(500).json({ message: err?.message || "Error updating profile" });
        }
    });
});


// ✅ حفظ مقال أو رواية — الهوية من التوكن (لا نثق بالـ autherID من الواجهة)
app.post("/saveArticle_novels", verifyToken, async (req, res) => {
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

        // بعد نجاح الحفظ فقط
        await invalidateFeedCache("articles");
        await invalidateFeedCache("novels");

        return res.status(200).json({ status: "ok", message: "Your content saved successfully", id: result.id });
    } catch (err) {
        console.error("POST /saveArticle_novels error:", err);
        return res.status(500).json({ status: "error", message: "Failed to save content" });
    }
});



// ✅ حفظ بوست — routes a comment payload to saveContent_Comment,
// normal posts to the existing normal-post path.
// Identity: the verified JWT payload `{ id, name, username, pass }` is the
// authoritative author ID; a mismatching client-supplied autherID is overridden.
app.post("/saveposts", verifyToken, async (req, res) => {
  try {
    const { comment_on } = req.body;

    // 💬 Comment payloads carry `comment_on` — persist in the comments path.
    if (comment_on) {
      const trustedAuthorId = String(req.user?.id ?? "");
      if (!trustedAuthorId) {
        return res.status(401).json({ status: "error", message: "Unauthorized" });
      }

      const payload = { ...req.body, autherID: trustedAuthorId };

      // تحقق الخادم من حدود الوسائط قبل الحفظ
      const mediaCheck = validateMediaManifest(payload.media || []);
      if (!mediaCheck.ok) {
        return res.status(400).json({ status: "error", message: mediaCheck.message });
      }

      const result = await saveContent_Comment(payload);

      if (!result.success) {
        console.error("POST /saveposts: reply failed —", result.message, result.reason || "");
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

    // 📝 Normal post — unchanged behavior.
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

// 💬 جلب تعليقات محتوى محدد
app.post("/getComments", verifyToken, async (req, res) => {
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


// 💬 جلب ردود محتوى محدد (بما فيها ردود على ردود)
app.post("/getReplies", verifyToken, async (req, res) => {
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

// 📄 جلب بوست/رد واحد بالـ ID (يدعم فتح رد من الرابط مباشرة)
app.post("/getPostById", verifyToken, async (req, res) => {
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

    // دمج بيانات الكاتب لعرض الاسم والصورة
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

// 🌐 ترجمة المحتوى المنشور — عند طلب المستخدم فقط.
// المحتوى الأصلي لا يُغيّر ولا يُستبدل؛ الترجمة تُرجع فقط في الاستجابة،
// ولا تُخزن في قاعدة المحتوى إلا في كاش مؤقت مرتبط بـ contentVersion.
app.post("/translate", verifyToken, async (req, res) => {
  try {
    const { contentId, contentType, targetLang, text } = req.body || {};

    if (!contentId || !text || !targetLang) {
      return res.status(400).json({
        status: "error",
        message: "Missing contentId, text or targetLang",
      });
    }

    // جلب المحتوى الأصلي من قاعدة البيانات — المحتوى هو المرجع، لا الواجهة.
    // هذا يضمن أن contentVersion هو الإصدار الفعلي (إذا نُشر المحتوى عُدّل،
    // يُرفض الكاش القديم تلقائيًا لأن الإصدار تغيّر).
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

    // إصدار المحتوى: تاريخ التعديل أو hash. إذا تغيّر، تُهمل الترجمة القديمة.
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

    // دقة الحالات: كل خطأ له HTTP status مناسب — لا 400 مضلل
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

// ℹ️ حالة مزود الترجمة — للتشخيص فقط (لا تكشف أي مفاتيح)
app.get("/translate/provider", verifyToken, async (req, res) => {
  return res.status(200).json({
    status: "ok",
    provider: getProviderInfo(),
  });
});

// 👁️ تسجيل مشاهدة محتوى — زيادة ذرية في Backend فقط.
// الهوية تُستخرج من الجلسة الموثقة للمسجلين، أو IP hashed للزوار.
// الواجهة لا تختار العدد ولا تعيده الزيادة إلا من استجابة الخادم.
app.post("/view", async (req, res) => {
  try {
    const { contentId, contentType } = req.body || {};

    if (!contentId || !contentType) {
      return res.status(400).json({ status: "error", message: "Missing contentId or contentType" });
    }

    // اختياري: التوكن — لو موجود نتحقق منه ونستخرج الهوية منه
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(" ")[1];
        req.user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      } catch (e) {
        // توكن غير صالح → نتعامل كزائر (لا نفشل الطلب)
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
      counted: result.counted, // false = مشاهدة مكررة داخل النافذة
    });
  } catch (err) {
    console.error("POST /view error:", err.message);
    return res.status(500).json({ status: "error", message: "Failed to register view" });
  }
});

// 🔍 SEO — robots.txt (عام، بدون auth)
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(robotsTxt());
});

// 🔍 SEO — sitemap.xml ديناميكي من المحتوى المنشور الفعلي
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
    // لا نفشل الفهرسة بالكامل — نرجع sitemap بالصفحات الأساسية فقط
    res.type("application/xml");
    res.send(sitemapXml({}));
  }
});

// 🔐 توقيع رفع Cloudinary — التوقيع يُنشأ على الخادم فقط بعد التحقق من الهوية.
// العميل يختار النوع (image/video) فقط؛ لا يمكنه التلاعب بباراميترات التوقيع.
app.post("/media/upload-signature", verifyToken, async (req, res) => {
    try {
        const kind = req.body?.kind;

        if (!isConfigured()) {
            // logCloudinaryConfigStatus داخل buildSignedUpload يسجل أي متغير مفقود (الأسماء فقط)
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

        // حدود الوسائط تُرسل للواجهة للتحقق المسبق فقط — الخادم هو المرجع النهائي.
        return res.status(200).json({ status: "ok", ...result, limits: MEDIA_LIMITS });
    } catch (err) {
        console.error("POST /media/upload-signature error:", err);
        return res.status(500).json({ status: "error", message: "Failed to build upload signature" });
    }
});

// 🧹 تنظيف وسائط يتيمة (فشل حفظ المنشور بعد نجاح الرفع) — المالك فقط،
// ولا يُحذف ملف إلا إذا تم تمريره صراحةً من الواجهة بعد فشل الحفظ.
app.post("/media/discard", verifyToken, async (req, res) => {
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

// ✏️ تعديل بوست — المالك فقط (الهوية من التوكن، ليس من الواجهة)
app.post("/editPost", verifyToken, async (req, res) => {
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

        // تحقق الخادم من حدود الوسائط الجديدة
        if (Array.isArray(media) && media.length) {
            const check = validateMediaManifest(media);
            if (!check.ok) {
                return res.status(400).json({ status: "error", message: check.message });
            }
        }

        const updates = {};
        if (typeof content === "string" && content.trim()) updates.content = content.trim();
        if (Array.isArray(media)) {
            // حفظ الوسائط الجديدة + الإبقاء على أي وسائط قديمة لم تُحذف
            updates.media = media;
            // حافظ على توافق الحقل القديم img
            updates.img = media.map((m) => (typeof m === "string" ? m : m.url)).filter(Boolean);
        }

        await dao.updateContent("posts", String(postId), updates);

        // حذف ملفات Cloudinary المحذوفة من الوسائط القديمة — فقط لو غير مستخدمة في سجل آخر
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

// 🗑️ حذف بوست/رد — المالك فقط (الهوية من التوكن، ليست من الواجهة)
app.post("/deletePost", verifyToken, async (req, res) => {
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

        // البحث عن السجل في المسارات الثلاثة: ردود/بوستات، مقالات، روايات
        // (الردود تُحفظ كسجلات posts — نفس دالة البحث تغطيهما)
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
                `POST /deletePost: forbidden — record=${id} author=${recordAuthorId} requester=${trustedAuthorId}`
            );
            return res.status(403).json({ status: "error", message: "Not authorized to delete this post" });
        }

        // وسائط هذا السجل فقط — ردود البوست سجلات مستقلة بملفاتها
        const ownMedia = [
            ...(Array.isArray(record.media) ? record.media : []),
            ...(Array.isArray(record.img) ? record.img : []),
        ];

        // حذف السجل من المسار الصحيح
        if (contentType === "articles") {
            await dao.deleteArticle(id);
        } else if (contentType === "novels") {
            await dao.deletenovels(id);
        } else {
            await dao.deletePost(id);
        }

        // إزالة الـ ID من قائمة محتوى المالك (لن يظهر في بروفايله بعد الحذف)
        let profileCleanup = "skipped";
        try {
            await sign.deletePostsFrom_User(trustedAuthorId, id);
            profileCleanup = "done";
        } catch (profileErr) {
            console.error("POST /deletePost: profile cleanup failed:", profileErr.message);
        }

        await invalidateFeedCache(contentType);
        await invalidateUserCache(trustedAuthorId);

        // حذف ملفات Cloudinary بعد نجاح حذف السجل، مع فحص إعادة الاستخدام
        // فشلها لا يفشل الحذف نفسه — يُسجل لإعادة المحاولة
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

        // حذف ردود البوست؟ — لا: الردود منشورات مستقلة (first-class)، تبقى كما هي.

        // Realtime content-deleted broadcast so open feeds/profiles update
        // without a full reload. The profile layer removes the item by id —
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

// ✅ البحث عن مستخدم
app.post("/getuser", async(req, res) => {
    const { idOtherUser } = req.body;
    try {
        const updatedUser = await sign.findbyID(idOtherUser);
        const settings =
            await sign.getUserSettings(
                updatedUser.Id_user
            );
        res.json({
            userData: {
                imgProfile: updatedUser.imgProfile,
                id: updatedUser.Id_user,
                name: updatedUser.F_user,
                username: updatedUser.S_user,
                Bio: updatedUser.Bio,
                followers: updatedUser.followers,
                following: updatedUser.following,
                IdPoster: updatedUser.Posters,
                settings
            },
        });
    } catch (err) {
        console.error("Search error:", err);
        res.status(err.message === "User not found" ? 404 : 500).json({ message: err.message || "Error searching user" });
    }
});

// ✅ متابعة مستخدم
app.post("/followingUser", async(req, res) => {
    const { IdUser, idFollowedUser } = req.body;
    try {
        const updatedUser = await sign.IncreasingFollowing(IdUser, idFollowedUser);
        await sign.IncreasingFollowers(IdUser, idFollowedUser);

        const settings =
            await sign.getUserSettings(
                updatedUser.Id_user
            );
        res.json({
            userData: {
                imgProfile: updatedUser.imgProfile,
                id: updatedUser.Id_user,
                name: updatedUser.F_user,
                username: updatedUser.S_user,
                Bio: updatedUser.Bio,
                followers: updatedUser.followers,
                following: updatedUser.following,
                IdPoster: updatedUser.Posters,
                settings
            },
        });
    } catch (err) {
        console.error("Follow error:", err);
        res.status(500).json({ message: "Error following user" });
    }
});

// ✅ إلغاء متابعة مستخدم
app.post("/unfollowingUser", async(req, res) => {
    const { IdUser, idFollowedUser } = req.body;
    try {
        const updatedUser = await sign.DecreaseFollowing(IdUser, idFollowedUser);
        await sign.DecreaseFollower(IdUser, idFollowedUser);

        const settings =
            await sign.getUserSettings(
                updatedUser.Id_user
            );
        res.json({
            userData: {
                imgProfile: updatedUser.imgProfile,
                id: updatedUser.Id_user,
                name: updatedUser.F_user,
                username: updatedUser.S_user,
                Bio: updatedUser.Bio,
                followers: updatedUser.followers,
                following: updatedUser.following,
                IdPoster: updatedUser.Posters,
                settings
            },
        });
    } catch (err) {
        console.error("Unfollow error:", err);
        res.status(500).json({ message: "Error unfollowing user" });
    }
});

app.get(
    "/settings",
    verifyToken,
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

// Whitelist للحقول المسموح حفظها — لا يُقبل أي حقل مجهول من الواجهة
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
            // ثيم مسموح فقط: light | dark | system
            if (clean.appearance.theme && !["light", "dark", "system"].includes(clean.appearance.theme)) {
                delete clean.appearance.theme;
            }
            // لغة مسموح فقط من القائمة الرسمية — متزامنة مع LANGUAGES في الواجهة
            const SUPPORTED_LANGUAGES = ["en", "ar", "fr", "es", "de", "pt", "tr", "zh", "ja", "ru"];
            if (clean.appearance.language && !SUPPORTED_LANGUAGES.includes(clean.appearance.language)) {
                delete clean.appearance.language;
            }
            // لون أساسي بصيغة hex سليمة فقط
            for (const colorKey of ["primaryColor", "customColor"]) {
                if (clean.appearance[colorKey] && !/^#[0-9a-fA-F]{6}$/.test(clean.appearance[colorKey])) {
                    delete clean.appearance[colorKey];
                }
            }
        } else {
            // حقول boolean فقط لبقية الأقسام عدا profile (strings)
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
    verifyToken,
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
// FOCUS SPACE — بيانات مساحة التركيز لكل مستخدم
// الهوية دائمًا من verifyToken (req.user.id) — لا نثق بـ userId من الواجهة
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

// تنقية الملاحظات — نصوص آمنة فقط، بلا أي HTML/Script
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

// تنقية المهام — حقول محددة فقط، قيم آمنة
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

// تنقية سجل جلسات التركيز — أرقام محصورة
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

// تنقية إعدادات مساحة التركيز
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
    // تحقق من الأنواع والقيم
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
    // strings آمنة ومحصورة الطول
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
    verifyToken,
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
    verifyToken,
    async(req, res) => {
        try {
            const clean = sanitizeFocusData(req.body || {});
            if (Object.keys(clean).length === 0) {
                return res.status(400).json({ error: "No valid focus fields" });
            }
            // دمج فوق الموجود — لا استبدال كامل
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

// المحتوى المحفوظ الحقيقي — يجمع المقالات والروايات والبوستات المحفوظة من قاعدة البيانات
app.get(
    "/focus-space/saved-content",
    verifyToken,
    async(req, res) => {
        try {
            const uid = req.user.id;
            // user_data/Profile/<uid>/savedContent يحتوي مفاتيح كل محتوى حفظه المستخدم
            // الشكل: { articles: {id1: true}, novels: {id2: true}, posts: {id3: true} }
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
                    } catch (e) { /* المحتوى محذوف — تخطَّ */ }
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
// READ LATER — حفظ/إزالة/تحديث تقدم أي محتوى (مقال/رواية/منشور)
// الشكل في قاعدة البيانات:
//   user_data/Profile/{uid}/savedContent/{type}/{contentId} =
//     { savedAt, readStatus: not_started|in_progress|completed,
//       readProgressPercent, lastReadAt, completedAt }
// الهوية دائمًا من verifyToken — لا يُثق بمعرف المستخدم من الواجهة.
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

// PUT /read-later — toggle / add / update progress
app.put(
    "/read-later",
    verifyToken,
    async(req, res) => {
        try {
            const clean = sanitizeReadLaterBody(req.body || {});
            if (!clean) return res.status(400).json({ status: "error", message: "Invalid read-later payload" });
            const uid = req.user.id;
            const base = `user_data/Profile/${uid}/savedContent/${clean.contentType}/${clean.contentId}`;
            const existingSnap = await get(ref(db, base));

            // Toggle: العنصر محفوظ بالفعل ولم يطلب المستخدم تحديث تقدم → إزالة
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

// GET /read-later/:contentType/:contentId — هل المحتوى محفوظ لهذا المستخدم؟
app.get(
    "/read-later/:contentType/:contentId",
    verifyToken,
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

// GET /read-later — كل المحتوى المحفوظ للمستخدم الحالي فقط (metadata للعرض)
app.get(
    "/read-later",
    verifyToken,
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

// GET /focus-space/saved-content/:contentType/:contentId/full — المحتوى الأصلي كاملًا
// للقراءة داخل Focus Space. متاح فقط إذا كان المحتوى محفوظًا فعليًا للمستخدم
// (Authorization: القائمة خاصة بمستخدمها — لا قراءة لمحتوى مستخدم آخر).
app.get(
    "/focus-space/saved-content/:contentType/:contentId/full",
    verifyToken,
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
// AUDIO HUB — نظام الاكتشاف والتشغيل الصوتي
// الهوية دائمًا من verifyToken — تخزين بيانات المستخدم في Firebase
// البحث الخارجي عبر Openverse (CC-licensed) مع Cache + Rate-limit خادمي
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

// تنقية بيانات المقطع — نصوص آمنة، أطوال محصورة
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

// تنقية سجل الاستماع — قواعد الاستماع الفعلي (وليس كل ضغطة Play)
function sanitizeListenEvent(e) {
    if (!e || typeof e !== "object") return null;
    const track = sanitizeTrack(e.track);
    if (!track) return null;
    const playedSec = Math.min(Math.max(Number(e.playedSec) || 0, 0), 86400);
    const durationSec = Math.min(Math.max(Number(e.durationSec) || 0, 0), 86400);
    // استماع فعلي: ≥30 ثانية أو ≥50% من المدة (أيهما أقل)
    const listenedFully = (durationSec > 0 && playedSec >= Math.min(30, durationSec * 0.5)) || playedSec >= 30;
    return {
        track,
        playedSec: Math.round(playedSec * 10) / 10,
        durationSec,
        listened: listenedFully,
        at: String(e.at || new Date().toISOString()).slice(0, 30),
    };
}

// بحث موسيقى CC عبر Openverse — محمي بالكاش وrate-limit خادمي
app.get(
    "/audio-hub/search",
    verifyToken,
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

// بحث الموسيقى الحقيقي: iTunes (فنان/ألبوم/غلاف + معاينة 30 ث قانونية)
// + Openverse (تشغيل كامل CC). source=itunes|openverse لاختيار المزود.
app.get(
    "/audio-hub/search-music",
    verifyToken,
    async(req, res) => {
        try {
            const { q, page, limit, source } = req.query;
            // jamendo — كتالوج Jamendo الكامل (CC، تشغيل كامل) عبر Openverse
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

// بيانات المستخدم: favorites + playlists + history
app.get(
    "/audio-hub/library",
    verifyToken,
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

// مزامنة بيانات المستخدم — المفضلة/القوائم/السجل (كتابة كاملة للحقول المرسلة)
app.put(
    "/audio-hub/library",
    verifyToken,
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
                // استكمال الاستماع — خريطة trackId -> positionSec
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

// الأكثر تشغيلًا على المنصة (عام) — تجميع من سجل الاستماع لكل المستخدمين
// بدون أي بيانات شخصية: فقط عدد مرات الاستماع لكل مقطع
app.get(
    "/audio-hub/trending",
    verifyToken,
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
// TRIVIA — Open Trivia DB (server-side proxy + cache + session answer key)
// الهوية دائمًا من verifyToken حيث تتطلب؛ حفظ النتائج في user_data/Profile/{uid}/triviaResults
// المصدر المجاني: https://opentdb.com — بلا مفتاح، احترام rate limits عبر الكاش
// ======================================================
const trivia = require("./service/trivia.service.js");
trivia.initTrivia({ cacheGet, cacheSet });

// in-memory session keys (short TTL via periodic cleanup — a session lives minutes)
const triviaSessions = new Map();

// ---- BOOKS — unified provider registry (Gutenberg, Open Library, Google
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

// book details — provider + providerBookId are explicit (no parsing of
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

// in-site reading content — Gutenberg HTML/text or Wikisource HTML, proxied
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

// PDF proxy — public-domain PDFs only (Gutenberg ebook / IA public scan).
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
// GET /books/:provider/:providerBookId/progress — restore reading progress
app.get(
    "/books/:provider/:providerBookId/progress",
    verifyToken,
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

// PUT /books/:provider/:providerBookId/progress — save reading position.
// Identity from verifyToken only; field sizes validated; owner can never
// touch another user's record because the path is derived from the token.
app.put(
    "/books/:provider/:providerBookId/progress",
    verifyToken,
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

// DELETE — remove a book from the user's saved list (same authorization)
app.delete(
    "/books/:provider/:providerBookId/progress",
    verifyToken,
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

// EPUB proxy — public-domain Gutenberg EPUBs only. The URL is resolved
// server-side from Gutendex metadata (never from user input → no SSRF).
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

// EPUB proxy — same-origin streaming for public-domain EPUBs only.
// Access + host are verified server-side (SSRF-safe, DRM never passes).
const { epubProxyHandler } = require("./service/books/epubProxy.js");
app.get(
    "/books/:provider/:providerBookId/epub",
    (req, res) => epubProxyHandler(req, res, booksRegistry)
);

// DOAB index status — honest loading state for the UI while the first
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
    verifyToken,
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
    verifyToken,
    async(req, res) => {
        try {
            const { sessionId, question, answer } = req.body || {};
            const session = triviaSessions.get(String(sessionId || ""));
            if (!session) return res.status(404).json({ status: "error", message: "SESSION_NOT_FOUND" });
            if (session.userId !== req.user.id) return res.status(403).json({ status: "error", message: "NOT_YOUR_SESSION" });
            // منع إرسال إجابة السؤال أكثر من مرة
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

// حفظ نتيجة مكتملة — السكور يُحسب من إجابات محققة مسبقًا على الخادم،
// لا يُثق بأي رقم قادم من العميل.
app.post(
    "/trivia/save-result",
    verifyToken,
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

// سجل اختبارات المستخدم — عزل كامل: uid من الـ JWT فقط
app.get(
    "/trivia/history",
    verifyToken,
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
// QURAN — AlQuran Cloud (proxy + cache؛ النص كما هو بلا أي تعديل)
// العامة (بلا توكن) — قراءة فقط، لا بيانات شخصية
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

// آخر موضع قراءة + إشارات مرجعية — نفس بنية المستخدم الحالية، uid من الـ JWT
app.get(
    "/quran/progress",
    verifyToken,
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
    verifyToken,
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
    verifyToken,
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
    verifyToken,
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
// BOOKS — Gutendex (Project Gutenberg) + Open Library proxy
// الكاش خادمي؛ لا مفاتيح؛ لا تكلفة. التصنيف القانوني صريح
// (full / borrow / readonline / metadata) — لا روابط وهمية.
// ======================================================

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
    }

    // SET INTERESTS
    socket.on("setInterests", async(idUser, interests) => {
        try {
            await DaoForDbUser.updateUserToInsertInteresting(idUser, interests);

            if (useRedis && redisClient) {
                await redisClient.del(`user:${idUser}`);
            } else {
                memoryCache.delete(`user:${idUser}`);
            }

            interests?.articles?.forEach((i) => socket.join(`room:${i}`));
            interests?.novels?.forEach((i) => socket.join(`room:${i}`));

            socket.emit("result", { status: "ok" });
        } catch (err) {
            console.log("❌ setInterests error:", err.message);
            socket.emit("result", { status: "error", message: "Failed to update interests" });
        }
    });

    // JOIN ROOMS
    socket.on("JOIN_ROOMS", async(userId) => {
        try {
            const user = await getUser(userId);
            if (!user) return;

            (user?.interesting?.articles || []).forEach((i) => socket.join(`room:${i}`));
            (user?.interesting?.novels || []).forEach((i) => socket.join(`room:${i}`));
        } catch (err) {
            console.log("JOIN_ROOMS error:", err.message);
        }
    });

// TRACK ENGAGEMENT
socket.on("ENGAGEMENT", async ({
  contentId,
  userId,
  type,
  contentType = "posts",
}) => {
  try {
    if (!contentId || !userId) {
      return socket.emit("ENGAGEMENT_ERROR", {
        contentId,
        message: "Missing contentId or userId",
      });
    }

    if (!["like", "unlike"].includes(type)) {
      return socket.emit("ENGAGEMENT_ERROR", {
        contentId,
        message: "Invalid engagement type",
      });
    }

    // حفظ التفاعل في قاعدة البيانات
    await trackEngagement(contentId, userId, type);

    // إبطال الكاش بعد نجاح التحديث
    await invalidateAllFeedCaches();

    // جلب البوست المحدّث
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
        return socket.emit("ENGAGEMENT_ERROR", {
          contentId,
          message: "Invalid content type",
        });
    }

    if (!dataContent) {
      return socket.emit("ENGAGEMENT_ERROR", {
        contentId,
        message: "Content not found after update",
      });
    }

    // إرسال البوست المحدّث لجميع العملاء المتصلين
    io.emit("LIKE_UPDATED", {
      contentType,
      post: dataContent,
    });

  } catch (error) {
    console.error("ENGAGEMENT error:", error);

    socket.emit("ENGAGEMENT_ERROR", {
      contentId,
      message: "Failed to update engagement",
    });
  }
});

    // MY CONTENT — unified profile feed (posts + replies + articles + novels)
    socket.on("MYCONTENT", async({ idUser, type = "all", cursor = 0, limit = 10 }) => {
        try {
            const result = await getProfileContent({ idUser, type, cursor, limit });
            socket.emit("CONTENT_RESULT", result);
        } catch (err) {
            console.log("MYCONTENT ERROR:", err.message);
            socket.emit("CONTENT_RESULT", { items: [], nextCursor: null, counts: {}, error: err.message });
        }
    });

socket.on("GET_FEED", async ({ userId, type = "posts", cursor = 0, limit = 20 }) => {
    try {

        console.log("User ID:", userId);

        const user = await getUser(userId);
        console.log("User:", user);

        if (!user) {
            // Guests (and unknown ids) get the general discovery feed — same
            // behavior the Home feed expects. Previously this branch emitted
            // NOTHING, so guest clients hung until timeout and showed an
            // error instead of content.
            let feed = await recommendFeed(null, type);
            feed = await enrichContent(feed);
            const result = paginate(feed, limit, cursor);
            return socket.emit("FEED_RESULT", result);
        }

        let feed = await recommendFeed(user, type);

        feed = await enrichContent(feed);

        // لا خلط (shuffle): يكسر الترتيب الزمني ويكرر/يفقد عناصر بين الصفحات.
        // الترتيب الآن: حسب الـ score ثم زمن الإنشاء داخل نفس الـ score تقريبًا.
        const result = paginate(feed, limit, cursor);


        socket.emit("FEED_RESULT", result);

    } catch (err) {
        console.log("GET_FEED error:", err);
    }
});

    // NEW POST LIVE
    socket.on("NEW_POST", async({ category, post }) => {
        try {
            io.to(`room:${category}`).emit("NEW_POST", post);
        } catch (err) {
            console.log("NEW_POST error:", err.message);
        }
    });

    // FOLLOW USER
    socket.on("followUser", async({ idUser, idFollowedUser }) => {
        try {
            await sign.IncreasingFollowing(idUser, idFollowedUser);
            await sign.IncreasingFollowers(idUser, idFollowedUser);

            const targetSocket = onlineUsers.get(idFollowedUser);
            if (targetSocket) io.to(targetSocket).emit("newFollower", { from: idUser });

            socket.emit("followSuccess", { userId: idFollowedUser });
        } catch (err) {
            console.log("followUser error:", err.message);
        }
    });

    // UNFOLLOW USER
    socket.on("unfollowUser", async({ idUser, idFollowedUser }) => {
        try {
            await sign.DecreaseFollowing(idUser, idFollowedUser);
            await sign.DecreaseFollower(idUser, idFollowedUser);

            const targetSocket = onlineUsers.get(idFollowedUser);
            if (targetSocket) io.to(targetSocket).emit("lostFollower", { from: idUser });

            socket.emit("unfollowSuccess", { userId: idFollowedUser });
        } catch (err) {
            console.log("unfollowUser error:", err.message);
        }
    });

    // DISCONNECT
    socket.on("disconnect", () => {
        console.log("🔴 Client disconnected:", socket.id);
        onlineUsers.delete(socket.userId);
    });
});

// ======================================================
// BAYAN CONTROL CENTER — admin namespace (/admin/api/*)
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
    console.log("🛡️  Control Center admin API mounted at /admin/api");
} catch (adminErr) {
    // Fail-safe: an admin module problem must never take the platform down.
    console.error("Control Center admin module failed to mount:", adminErr.message);
}

// ======================================================
// START SERVER
// ======================================================

httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Unified Server running on port ${PORT}`);
    console.log(`   REST API  → http://localhost:${PORT}`);
    console.log(`   Socket.IO → ws://localhost:${PORT}`);
});