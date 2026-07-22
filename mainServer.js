const { createServer } = require("http");
const express = require("express");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const fetch = require("node-fetch");
const { translate } = require("@vitalets/google-translate-api");
const { log } = require("console");

const sign = require("./datastore/signin_signupDao_firebase.js");
const dao = require("./datastore/Dao.js");
const DaoForDbUser = require("./datastore/signin_signupDao_firebase.js");
const { saveContent_Article_Novels, saveContent_Posts } = require("./service/saveContent.js");

require("dotenv").config();

const categories = JSON.parse(fs.readFileSync("./categories.json", "utf8"));
const novel_categories = JSON.parse(fs.readFileSync("novel_categories.json", "utf8"));

// ======================================================
// APP + HTTP SERVER + SOCKET.IO
// ======================================================

const allowedOrigins = [
    "https://bayan-space.vercel.app",
    "https://bayan-production-9dd3.up.railway.app",
    "http://localhost:3000",
];


const app = express();
const httpServer = createServer(app); // ✅ Express فوق نفس الـ httpServer
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

function paginate(data, limit = 10, cursor = 0) {
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
        if (useRedis && redisClient) {
            const data = await redisClient.get(key);
            return data ? JSON.parse(data) : null;
        }
        return memoryCache.get(key) || null;
    } catch (err) {
        console.log("cacheGet error:", err.message);
        return null;
    }
}

async function cacheSet(key, value, ttl = 60) {
    try {
        if (useRedis && redisClient) {
            await redisClient.setEx(key, ttl, JSON.stringify(value));
        } else {
            memoryCache.set(key, value);
        }
    } catch (err) {
        console.log("cacheSet error:", err.message);
    }
}

// ======================================================
// USER CACHE
// ======================================================

async function getUser(userId) {
    try {
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
    const path = `posts/post${postId}`;
    await dao.incrementFieldTransaction(path, "likes", 1);
    await dao.likeContent("posts", postId, userId);
}

async function decreaseLike(postId, userId) {
    const path = `posts/post${postId}`;
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

        // استخراج الاهتمامات حسب نوع المحتوى
        const interests =
            type === "novels"
                ? (user?.interesting?.novels || [])
                : (user?.interesting?.articles || []);

        let allContent = [];

        // =====================================
        // Personalized Feed
        // =====================================
        if (interests.length > 0) {

            for (const category of interests) {

                const cacheKey = `${type}:${category}`;

                let results = await cacheGet(cacheKey);

                if (!results) {
                    results = await dao.getContentByCategory(type, category, 20);

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

            console.log("No personalized feed found. Loading random content...");

            allContent = await dao.getAllContent(type, 20);
            console.log("All content: ",allContent);

        }

        // =====================================
        // إزالة المحتويات المكررة
        // =====================================
        allContent = allContent.filter(
            (item, index, self) =>
                index === self.findIndex(
                    (t) => t.id === item.id || t.Id === item.Id
                )
        );

        // =====================================
        // حساب الـ Score لكل محتوى
        // =====================================
        const scored = await Promise.all(
            allContent.map(async (item) => ({
                ...item,
                score: await getScore(item)
            }))
        );

        // =====================================
        // ترتيب حسب الـ Score
        // =====================================
        scored.sort((a, b) => b.score - a.score);

        return scored;

    } catch (err) {

        console.error("recommendFeed error:", err);

        return [];
    }
}

async function enrichContent(contentArray) {
    return Promise.all(
        contentArray.map(async(item) => {
            try {
                const profile = await getUser(item.autherID);
                return {...item, userData: profile || {} };
            } catch {
                return item;
            }
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
            if (status === "img") {
                updatedUser = await sign.logup_user_Insert_ImgProfile(Updatable, decoded.username, decoded.pass);
            } else if (status === "name") {
                updatedUser = await sign.logup_user_Insert_Name(Updatable, decoded.username, decoded.pass);
            } else if (status === "bio") {
                updatedUser = await sign.logup_user_Insert_BIO(Updatable, decoded.username, decoded.pass);
            } else {
                return res.status(400).json({ message: "Invalid status" });
            }

            res.json({ message: "Profile updated", userData: buildUserData(updatedUser) });
        } catch (err) {
            console.error("Profile update error:", err);
            res.status(500).json({ message: "Error updating profile" });
        }
    });
});

// ✅ حفظ مقال أو رواية
app.post("/saveArticle_novels", async(req, res) => {
    await saveContent_Article_Novels(req.body);
});

// ✅ حفظ بوست
app.post("/saveposts", async(req, res) => {
    await saveContent_Posts(req.body);
    console.log(req.body);
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
    socket.on("ENGAGEMENT", async({ contentId, userId, type }) => {
        await trackEngagement(contentId, userId, type);
    });

    // MY CONTENT
    socket.on("MYCONTENT", async({ idUser, type }) => {
        try {
            const contentIds = await DaoForDbUser.find_ContentUser_byID(type, idUser);
            const userData = await DaoForDbUser.findbyID(idUser);
            let content = [];

            if (type === "posts") {
                const posts = await Promise.all(contentIds.map((id) => dao.getPostID(id)));
                content = posts.map((post) => ({ userData, ...post }));
            } else if (type === "articles") {
                const articles = await Promise.all(contentIds.map((id) => dao.getArticleID(id)));
                content = articles.map((article) => ({ userData, ...article }));
            } else if (type === "novels") {
                const novels = await Promise.all(contentIds.map((id) => dao.getnovelsID(id)));
                content = novels.map((novel) => ({ userData, ...novel }));
            }

            socket.emit("CONTENT_RESULT", content);
        } catch (err) {
            console.log("MYCONTENT ERROR:", err.message);
            socket.emit("CONTENT_RESULT", []);
        }
    });

socket.on("GET_FEED", async ({ userId, type = "posts", cursor = 0, limit = 10 }) => {
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
        console.log("Recommend Feed:", feed);

        feed = await enrichContent(feed);
        console.log("Enriched Feed:", feed);

        const result = paginate(shuffle(feed), limit, cursor);
        console.log("Final Result:", result);

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