// services/contentService.js
const dao = require("../datastore/Dao.js");
const sign = require("../datastore/signin_signupDao_firebase.js");
const categories = require("../categories.json");
const novel_categories = require("../novel_categories.json");

const { translate } = require('@vitalets/google-translate-api');

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


async function saveContent_Article_Novels({
    autherID,
    id,
    title,
    descrip,
    img,
    series,
    content,
    type
}) {
    console.log("سبف مقاله");
    
    try {
        if (!autherID || !id || !title || !content)
            console.log("في حاجه غلط");
    
            if (type === "article") {
                const translate = await translateToEnglish(`${title} ${descrip} ${content}`);
                console.log(translate);
                const classification = classifyMultipleCategories(translate);
                // تحويل المصفوفة لكائن category
                const categoryObj = {};
                classification.forEach(cat => {
                    categoryObj[cat] = true;
                });
                console.log(autherID, id, title, descrip, img, series, content, type);
    
                const newArticle_novels = {
                    autherID,
                    id,
                    title,
                    descrip,
                    img,
                    content,
                    series,
                    type,
                    time: getCurrentTime(),
                    date: getTodayDate(),
                    timestamp: Date.now(),
                    category: categoryObj,
                };
                console.log(newArticle_novels);
                await dao.addContentCategory("articles", newArticle_novels);
                await sign.addContentId_User("articles", autherID,id);
                
                
            } else if (type === "novels") {
                const translate = await translateToEnglish(`${title} ${descrip} ${content}`);
                const classification = classifyNovel(translate);
    
                const newArticle_novels = {
                    autherID,
                    id,
                    title,
                    descrip,
                    img,
                    content,
                    series,
                    type,
                    time: getCurrentTime(),
                    date: getTodayDate(),
                    timestamp: Date.now(),
                    category: classification,
                };
    
                console.log(newArticle_novels);
                await dao.addContentCategory("novels", newArticle_novels);
                await sign.addContentId_User("novels", autherID,id);
    
            }
    
        } catch (err) {
            console.error("Save error:", err);
        }
}

// 💬 حفظ رد (Twitter/X-style first-class reply)
// A reply IS a post: it lives in the canonical posts collection with its own
// id, likes, replies, and author — plus a parent reference (`comment_on` +
// `parentType`) linking it back to the conversation. Posts/articles/novels
// remain untouched; nested replies reference the reply's own id as parent.
// `parentUserData` — the DIRECT parent's author (a reply's author when the
// parent is itself a reply, otherwise the root post's author) — is resolved
// here so the frontend can render "ردًا على @username" without extra lookups.
async function saveContent_Comment({
    autherID,
    id,
    comment_on,
    img,
    content,
    type,
    userData,
    media
}) {
    if (!autherID || !id || !comment_on || !content)
        return { success: false, message: "Missing required fields" };

    if (content.length > 1000)
        return { success: false, message: "Comment is too long (max 1000 characters)" };

    const allowedTypes = ["posts", "articles", "novels"];
    const parentType = allowedTypes.includes(type) ? type : "posts";

    // Resolve the DIRECT parent's author.
    // Parent may be a reply (in posts with its own comment_on) or a root post.
    let parentUserData = undefined;
    try {
        const parentRecord = await dao.getPostID(String(comment_on));
        if (parentRecord) {
            const source = parentRecord.userData || parentRecord;
            parentUserData = {
                Id_user: String(source.Id_user ?? parentRecord.autherID ?? ""),
                F_user: source.F_user || "",
                S_user: source.S_user || "",
                imgProfile: source.imgProfile || "",
            };
        }
    } catch (err) {
        console.warn("parentUserData resolution failed:", err.message);
    }

    const classify = classifyMultipleCategories(
        await translateToEnglish(content)
    );
    const categoryObj = {};
    classify.forEach(cat => { categoryObj[cat] = true; });

    const replyRecord = {
        autherID: String(autherID),
        id: String(id),
        comment_on: String(comment_on),
        parentType,
        content,
        type: parentType, // keeps the reply in its parent's channel for reads
        img: Array.isArray(img) ? img : [],
        // Cloudinary media records — kept beside the legacy img field.
        media: Array.isArray(media) ? media : undefined,
        time: getCurrentTime(),
        date: getTodayDate(),
        timestamp: Date.now(),
        category: categoryObj, // required by the canonical posts schema
        // Display metadata only — never used for authorization.
        userData: userData
            ? {
                Id_user: String(userData.Id_user ?? autherID),
                F_user: userData.F_user || "",
                S_user: userData.S_user || "",
                imgProfile: userData.imgProfile || ""
            }
            : undefined,
        replyCount: 0,
        parentUserData,
    };

    try {
        // First-class: stored in the main posts collection so every normal
        // post reader/detail route works on replies unchanged.
        await dao.addReply(replyRecord);
        return { success: true, id: String(id), comment: replyRecord };
    } catch (err) {
        console.error("Reply save error:", err);
        return { success: false, message: "Failed to save reply" };
    }
}

async function saveContent_Posts({
    autherID,
    id,
    img,
    content,
    type,
    media
}) {
try {
        if (!autherID || !id || !content)
            return "Missing required fields";

        const translate = await translateToEnglish(content);
        console.log(translate);
        const classification = classifyMultipleCategories(translate);
        // تحويل المصفوفة لكائن category
        console.log("classification: ", classification);

        const categoryObj = {};
        classification.forEach(cat => {
            categoryObj[cat] = true;
        });
        const newPost = {
            autherID,
            id,
            content,
            type,
            img,
            media: Array.isArray(media) ? media : undefined,
            time: getCurrentTime(),
            date: getTodayDate(),
            timestamp: Date.now(),
            category: categoryObj,
        };
 
        await dao.addContentCategory("posts", newPost);
        await sign.addContentId_User("posts", autherID,id);
        
    } catch (err) {
        console.error("Save error:", err);
    }
}

module.exports = {
    saveContent_Article_Novels,
    saveContent_Posts,
    saveContent_Comment
};