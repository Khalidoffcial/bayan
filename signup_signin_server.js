/*const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
const sign = require("./datastore/signin_signupDao_firebase.js");
const dao = require("./datastore/Dao.js");
const DaoForDbUser = require("./datastore/signin_signupDao_firebase.js");
const storeUser = require("./datastore/storeUser.js");
const storeChats = require("./datastore/storeChats.js");
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const { translate } = require('@vitalets/google-translate-api');
const fs = require("fs");
const { saveContent_Article_Novels,saveContent_Posts } = require("./service/saveContent.js");
const { log } = require("console");

const categories = JSON.parse(fs.readFileSync("./categories.json", "utf8"));
const novel_categories = JSON.parse(fs.readFileSync('novel_categories.json', 'utf8'));


const PORT = process.env.PORT || 4000;
app.use(cors({ origin: "*" }));

// ✅ استخدم cors بدلاً من الهيدر اليدوي (أبسط وآمن)
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ ميدلوير واحد فقط للـ bodyParser مع رفع الحد
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));


// eslint-disable-next-line no-dupe-class-members


// =========================
// 🔹 Helper Functions
// =========================
function generateUniqueId() {
    return Math.floor(Math.random() * 999999999).toString().padStart(9, "1");
}

function generateToken(payload) {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "720h", // صلاحية 12 ساعة
    });
}

// =========================
// 🔹 Auth APIs
// =========================

// ✅ تسجيل الدخول
app.post("/signin", async(req, res) => {
    const { identifierUser, password } = req.body;

    if (!identifierUser || !password) {
        return res.status(400).json({ message: "Please enter all fields" });
    }

    try {
        const user = await sign.login_user(identifierUser, password);

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const payload = {
            id: user.Id_user,
            name: user.F_user,
            username: user.S_user,
            pass: user.psw,
        };

        const userData = {
            imgProfile: user.imgProfile,
            id: user.Id_user,
            name: user.F_user,
            username: user.S_user,
            Bio: user.Bio,
            followers: user.followers,
            following: user.following,
            IdPoster: user.Posters,
        };


        const accessToken = generateToken(payload);

        res.json({
            message: "Login successful",
            accessToken,
            userData
        });
    } catch (err) {
        console.error("Signin error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});
// ✅ تسجيل الدخول بجوجل
app.post("/auth/google", async(req, res) => {
    const { email, uid } = req.body; // لازم تيجي من الـ frontend
    if (!email || !uid) {
        return res.status(400).json({ message: "Please enter all fields" });
    }

    try {
        console.log("email:", email);
        console.log("uid:", uid);

        // التأكد إذا المستخدم موجود عن طريق البريد والـ UID
        const existingUser = await sign.findUserByEmailAndUid(email, uid);

        if (existingUser) {
            // المستخدم موجود وجوجل UID مطابق
            const payload = {
                id: existingUser.Id_user,
                name: existingUser.F_user,
                username: existingUser.S_user,
                pass: existingUser.psw,
            };

            const userData = {
                imgProfile: existingUser.imgProfile,
                id: existingUser.Id_user,
                name: existingUser.F_user,
                username: existingUser.S_user,
                Bio: existingUser.Bio,
                followers: existingUser.followers,
                following: existingUser.following,
                IdPoster: existingUser.Posters,
            };

            const accessToken = generateToken(payload);

            return res.json({
                message: "Login successful",
                accessToken,
                userData,
            });
        } else {
            // المستخدم غير موجود أو UID مختلف
            return res.status(404).json({
                message: "Invalid login credentials.",
                email,
                uid,
            });
        }
    } catch (err) {
        console.error("Google login error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});


// ✅ تسجيل حساب جديد
app.post("/signup", async(req, res) => {
    const { fullName, username, email, uid, password } = req.body;

    if (!fullName || !username || !password) {
        return res.status(400).json({ message: "Please enter all fields" });
    }

    try {
        // التأكد من عدم وجود username مسبقًا
        const existsName = await sign.logup_user_check_fsp(fullName, username, password);
        if (existsName) {
            return res.status(409).json({ message: "Username already exists" });
        }

        console.log("email: ", email);
        console.log("uid: ", uid);

        // التأكد إذا المستخدم موجود عن طريق البريد
        const existingUser = await sign.findbyEmail(email);

        if (existingUser) {
            const payload = {
                id: existingUser.Id_user,
                name: existingUser.F_user,
                username: existingUser.S_user,
                pass: existingUser.psw,
            };

            const userData = {
                imgProfile: existingUser.imgProfile,
                id: existingUser.Id_user,
                name: existingUser.F_user,
                username: existingUser.S_user,
                Bio: existingUser.Bio,
                followers: existingUser.followers,
                following: existingUser.following,
                IdPoster: existingUser.Posters,
            };

            const accessToken = generateToken(payload);

            return res.json({
                message: "Login successful",
                accessToken,
                userData,
            });
        } else {
            // تسجيل مستخدم جديد
            const uniqueId = generateUniqueId();
            const user = await sign.logup_user_Insert(fullName, username, email, uid, uniqueId, password);

            const payload = {
                id: uniqueId,
                username,
                pass: password,
            };

            const token = generateToken(payload);

            const userData = {
                imgProfile: user.imgProfile,
                id: user.Id_user,
                name: user.F_user,
                username: user.S_user,
                Bio: user.Bio,
                followers: user.followers,
                following: user.following,
                IdPoster: user.Posters,
            };

            return res.status(201).json({
                message: "Signup successful",
                token,
                userData,
            });
        }
    } catch (err) {
        console.error("Signup error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// ✅ تحقق من الـ Token
app.post("/auth", (req, res) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = req.headers.authorization.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async(err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid token" });

        try {
            const user = await sign.login_user(decoded.id, decoded.pass);

            const userData = {
                imgProfile: user.imgProfile,
                id: user.Id_user,
                name: user.F_user,
                username: user.S_user,
                Bio: user.Bio,
                followers: user.followers,
                following: user.following,
                IdPoster: user.Posters,
            };
            console.log(userData);
            res.json({ valid: true, userData });
        } catch (err) {
            res.status(500).json({ message: "Error fetching user data" });
        }
    });
});



// =========================
// 🔹 Profile APIs
// =========================

// تعديل الملف الشخصي
app.post("/editProfile", async(req, res) => {
    const { Updatable, status } = req.body;

    if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = req.headers.authorization.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async(err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid token" });

        try {
            if (status === "img") {
                sign.logup_user_Insert_ImgProfile(Updatable, decoded.username, decoded.pass).then((updatedUser) => {


                    const userData = {
                        imgProfile: updatedUser.imgProfile,
                        id: updatedUser.Id_user,
                        name: updatedUser.F_user,
                        username: updatedUser.S_user,
                        Bio: updatedUser.Bio,
                        followers: updatedUser.followers,
                        following: updatedUser.following,
                        IdPoster: updatedUser.Posters,
                    };
                    console.log("In image", userData);

                    res.json({ message: "Profile updated", userData });

                }).catch((e) => {
                    console.error("error in upload img", e);
                    res.status(404);
                })


            } else if (status === "name") {
                sign.logup_user_Insert_Name(Updatable, decoded.username, decoded.pass).then((updatedUser) => {
                    const userData = {
                        imgProfile: updatedUser.imgProfile,
                        id: updatedUser.Id_user,
                        name: updatedUser.F_user,
                        username: updatedUser.S_user,
                        Bio: updatedUser.Bio,
                        followers: updatedUser.followers,
                        following: updatedUser.following,
                        IdPoster: updatedUser.Posters,
                    };
                    console.log(userData);

                    res.json({ message: "Profile updated", userData });
                }).catch((e) => {
                    console.error("error in upload name", e);
                    res.status(404);
                })
            } else if (status === "bio") {
                console.log(status, Updatable);
                sign.logup_user_Insert_BIO(Updatable, decoded.username, decoded.pass).then((updatedUser) => {
                    const userData = {
                        imgProfile: updatedUser.img,
                        id: updatedUser.Id_user,
                        name: updatedUser.F_user,
                        username: updatedUser.S_user,
                        Bio: updatedUser.Bio,
                        followers: user.followers,
                        following: user.following,
                        IdPoster: user.Posters,
                    };
                    res.json({ message: "Profile updated", userData });

                }).catch((e) => {
                    console.error("error in upload Bio", e);
                    res.status(404);
                })
            } else {
                console.error("error");
                res.status(404);
            }


        } catch (err) {
            console.error("Profile update error:", err);
            res.status(500).json({ message: "Error updating profile" });
        }
    });
});




// 🔸 دالة الترجمة إلى الإنجليزية
async function translateToEnglish(text) {
    try {
        // 1. ترجمة النص للإنجليزية (أو اللغة اللي الموديل بتفهمها)
        const translated = await translate(text, { to: 'en' });
        const englishText = translated.text;

        console.log('🔹 النص الأصلي:', text);
        console.log('🔹 النص المترجم:', englishText);

        // 2. تمرير النص المترجم للتصنيف
        return englishText;
    } catch (err) {
        console.error(err);
    }
}

//classify Article
function classifyMultipleCategories(text, threshold = 0.05) {

    if (!text || typeof text !== "string") return [];

    text = text.toLowerCase();

    let scores = {};
    let totalWords = text.split(/\s+/).length || 1;

    // نحسب الوزن لكل تصنيف بناءً على الكلمات المفتاحية
    for (const [category, keywords] of Object.entries(categories)) {
        let weightedScore = 0;

        for (const word of keywords) {
            // وزن الكلمة حسب طولها (الكلمات الأطول أكثر دلالة)
            const weight = word.length >= 6 ? 1.5 : 1;
            const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, "g");
            const matches = text.match(regex);
            if (matches) weightedScore += matches.length * weight;
        }

        // تحويل النتيجة إلى نسبة مئوية من إجمالي الكلمات
        const score = weightedScore / totalWords;
        scores[category] = score;
    }

    // الحصول على أعلى قيمة (أكثر تصنيف واضح)
    const maxScore = Math.max(...Object.values(scores));

    // ترتيب التصنيفات حسب النتيجة تنازليًا
    const sortedCategories = Object.entries(scores)
        .sort((a, b) => b[1] - a[1]);

    // اختيار التصنيفات اللي نتيجتها قريبة من الأعلى بنسبة معينة
    const selectedCategories = sortedCategories
        .filter(([_, score]) => score >= Math.max(threshold, maxScore * 0.6))
        .map(([cat]) => cat);

    // لو مفيش تصنيف واضح، نختار الأعلى
    if (selectedCategories.length === 0 && sortedCategories.length > 0) {
        selectedCategories.push(sortedCategories[0][0]);
    }

    // إظهار التصنيفات مع نسبها (اختياري للتجريب)
    console.log("Category scores:", scores);
    console.log("Selected categories:", selectedCategories);

    return selectedCategories;
}


//classify novels

function classifyNovel(text, threshold = 2) {
    text = text.toLowerCase();

    const result = {};

    // دالة مساعدة لحساب المطابقة لكل جانب
    function matchCategory(categoryObj) {
        if (!categoryObj || typeof categoryObj !== 'object') {
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

        // اللي عدت العتبة
        let selected = Object.keys(scores).filter(cat => scores[cat] >= threshold);

        // لو مفيش حد وصل للعتبة، خد الأعلى أو أكثر من تصنيف متساوي
        if (selected.length === 0) {
            const maxScore = Math.max(...Object.values(scores));
            selected = Object.keys(scores).filter(cat => scores[cat] === maxScore);
        }

        return selected;
    }

    // تطبيق التصنيف على كل جانب من الرواية
    result.Genres = matchCategory(novel_categories.Genres);
    result.Themes = matchCategory(novel_categories.Themes);
    result.Tone = matchCategory(novel_categories.Tone);
    result.Purpose = matchCategory(novel_categories.Purpose);

    return result;
}


// 🗓️ تاريخ اليوم
function getTodayDate() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const monthName = months[today.getMonth()];
    const year = today.getFullYear();
    return `${day} ${monthName} ${year}`; // مثال: 29 Oct 2025
}

// ⏰ الوقت الحالي
function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// 📝 حفظ مقال أو قصة
app.post("/saveArticle_novels", async(req, res) => {
    await saveContent_Article_Novels(req.body)
});

// 📱 حفظ بوست
app.post("/saveposts", async(req, res) => {
    await saveContent_Posts(req.body);
    console.log(req.body)
});



// البحث عن صديق
app.post("/getuser", async(req, res) => {
    const { idOtherUser } = req.body;
    try {
        console.log(idOtherUser);
        sign.findbyID(idOtherUser).then((updatedUser) => {
            const userData = {
                imgProfile: updatedUser.imgProfile,
                id: updatedUser.Id_user,
                name: updatedUser.F_user,
                username: updatedUser.S_user,
                Bio: updatedUser.Bio,
                followers: updatedUser.followers,
                following: updatedUser.following,
                IdPoster: updatedUser.Posters,
            };
            console.log(userData);
            res.json({ userData })
        }).catch(() => {
            res.status(404).json({ message: "User not found" });
        })
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ message: "Error searching user" });
    }
});

// متابعه مستخدم
app.post("/followingUser", async(req, res) => {
    const { IdUser, idFollowedUser } = req.body;
    try {
        //mainUser
        sign.IncreasingFollowing(IdUser, idFollowedUser).then((updatedUser) => {
            //otherUser
            console.log(updatedUser);
            const otherUser = sign.IncreasingFollowers(IdUser, idFollowedUser);
            if (otherUser) {
                const userData = {
                    imgProfile: updatedUser.imgProfile,
                    id: updatedUser.Id_user,
                    name: updatedUser.F_user,
                    username: updatedUser.S_user,
                    Bio: updatedUser.Bio,
                    followers: updatedUser.followers,
                    following: updatedUser.following,
                    IdPoster: updatedUser.Posters,
                };
                res.json({ userData })
            }
        }).catch(() => {
            res.status(404).json({ message: "User not found" });
        });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ message: "Error searching user" });
    }
});

// الغاءمتابعه مستخدم
app.post("/unfollowingUser", async(req, res) => {
    const { IdUser, idFollowedUser } = req.body;

    try {
        //mainUser
        sign.DecreaseFollowing(IdUser, idFollowedUser).then((updatedUser) => {
            //otherUser
            console.log(updatedUser);
            const otherUser = sign.DecreaseFollower(IdUser, idFollowedUser);
            if (otherUser) {
                res.status(200);
                const userData = {
                    imgProfile: updatedUser.imgProfile,
                    id: updatedUser.Id_user,
                    name: updatedUser.F_user,
                    username: updatedUser.S_user,
                    Bio: updatedUser.Bio,
                    followers: updatedUser.followers,
                    following: updatedUser.following,
                    IdPoster: updatedUser.Posters,
                };
                res.json({ userData })
            }
        }).catch(() => {
            res.status(404).json({ message: "User not found" });
        });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ message: "Error searching user" });
    }
});

// =========================
// 🔹 Start server
// =========================
app.listen(PORT,"0.0.0.0", () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});*/