// services/contentService.js

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
        try {
            if (!autherID || !id || !title || !content)
                return res.status(400).json({ message: "Missing required fields" });
    
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
                res.status(200).json({ message: "Article saved successfully" });
    
            } else if (type === "novels") {
                const translate = await translateToEnglish(`${title} ${descrip} ${content}`);
                console.log(translate);
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
                res.status(200).json({ message: "Article saved successfully" });
    
            }
    
        } catch (err) {
            console.error("Save error:", err);
            res.status(500).json({ message: "Error saving article" });
        }
}
async function saveContent_Posts({
    autherID,
    id,
    img,
    content,
    type
}) {
try {
        const { autherID, id, img, content, type } = req.body;
        if (!autherID || !id || !content)
            return res.status(400).json({ message: "Missing required fields" });

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
            time: getCurrentTime(),
            date: getTodayDate(),
            timestamp: Date.now(),
            category: categoryObj,
        };

        await dao.addContentCategory("posts", newPost);
        res.status(200).json({ message: "Post saved successfully" });

    } catch (err) {
        console.error("Save error:", err);
        res.status(500).json({ message: "Error saving post" });
    }
}

module.exports = {
    saveContent_Article_Novels,
    saveContent_Posts
};