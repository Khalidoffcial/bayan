const { createServer } = require("http");
const express = require("express");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const fetch = require("node-fetch");
const { translate } = require("@vitalets/google-translate-api");
require("dotenv").config();

const { v2: cloudinary } = require("cloudinary");
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const sign = require("./datastore/signin_signupDao_firebase.js");
const dao = require("./datastore/Dao.js");
const DaoForDbUser = require("./datastore/signin_signupDao_firebase.js");
const { saveContent_Article_Novels, saveContent_Posts, saveContent_Comment } = require("./service/saveContent.js");
const { getProfileContent } = require("./service/profileContentService.js");
const {
    MEDIA_LIMITS,
    isConfigured,
    buildSignedUpload,
    validateMediaManifest,
    deleteCloudinaryAssetsIfUnused,
} = require("./service/cloudinary.service.js");

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
        const collectionTypeById = new Map(); // id → المصدر الحقيقي للسجل

        for (const t of types) {
            // استخراج الاهتمامات حسب نوع المحتوى
            const interests =
                t === "novels"
                    ? (user?.interesting?.novels || [])
                    : (user?.interesting?.articles || []);

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
                        allContent.push(...results);
                    }
                }
            }

            // =====================================
            // إذا لم توجد اهتمامات أو لم ينتج عنها محتوى
            // =====================================
            if (allContent.length === 0) {
                console.log("No personalized feed found. Loading random content...", t);
                const fallback = await dao.getAllContent(t, 20);
                allContent.push(...fallback);
            }
        }

        // سجّل من أي مجموعة جاء كل id (للسجلات القديمة بلا حقل type)
        for (const t of types) {
            for (const item of allContent) {
                if (item && item.id != null && !collectionTypeById.has(String(item.id))) {
                    // تمييز تقريبي: المقالات/الروايات تحمل title + descrip، والبوستات لا
                    if (t !== "posts" && item.title != null) collectionTypeById.set(String(item.id), t);
                }
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

        // كل نوع يحمل نوعه الصريح — العميل يختار البطاقة المناسبة (PostCard vs ArticleCard).
        // `sourceCollection` يحدد المسار الحقيقي الذي جاء منه السجل لأن records
        // قد تفتقد حقل type (سجلات قديمة).
        allContent = allContent.map((item) => ({
            ...item,
            type: item.type || collectionTypeById.get(String(item.id)) || "posts",
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

async function translateToEnglish(text) {
    try {
        const translated = await translate(text, { to: "en" });
        console.log("🔹 Original:", text);
        console.log("🔹 Translated:", translated.text);
        return translated.text;
    } catch (err) {
        console.error(err);
    }
}

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

    const post = await dao.getPostID(String(postId));

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
                    req.id
                );

            res.json(settings);

        } catch (err) {

            res.status(500).json({
                error: err.message
            });

        }
    }
);

app.put(
    "/settings",
    verifyToken,
    async(req, res) => {
        try {
            console.log(req.user.id,
                req.body)
            const result =
                await sign.updateUserSettings(
                    req.id,
                    req.body
                );

            res.json(result);

        } catch (err) {

            res.status(500).json({
                error: err.message
            });

        }
    }
);

// ======================================================
// SOCKET.IO EVENTS
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
            console.log("User not found");
            return socket.emit("FEED_RESULT", {
                items: [],
                nextCursor: null
            });
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
// START SERVER
// ======================================================

httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Unified Server running on port ${PORT}`);
    console.log(`   REST API  → http://localhost:${PORT}`);
    console.log(`   Socket.IO → ws://localhost:${PORT}`);
});