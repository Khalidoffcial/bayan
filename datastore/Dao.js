const { db, ref, set, get, update, query, equalTo, orderByChild, limitToLast, limitToFirst,runTransaction } = require('./firebaseArticle.js');

// حفظ بوست جديد
// async function savePost(post) {
//     const articleRef = ref(db, `posts/post${post.id}`);
//     try {
//         await addContentCategory("posts", post);
//         await set(articleRef, post);
//         console.log('post saved successfully');
//     } catch (error) {
//         console.error('Error saving post:', error);
//     }
// }

// حفظ قصه جديد
// eslint-disable-next-line no-dupe-class-members
// async function savenovels(novels) {
//     const articleRef = ref(db, `novels/novel${novels.id}`);
//     try {
//         await addContentCategory("novels", novels);
//         await set(articleRef, novels);
//         console.log('novels saved successfully');
//     } catch (error) {
//         console.error('Error saving novels:', error);
//     }
// }
// حفظ مقال جديد
// eslint-disable-next-line no-dupe-class-members
// async function saveArticle(article) {
//     const articleRef = ref(db, `articles/article${article.id}`);
//     try {
//         await addContentCategory("articles", article);
//         await set(articleRef, article);
//         console.log('Article saved successfully');
//     } catch (error) {
//         console.error('Error saving article:', error);
//     }
// }




// تحديث مقال
async function updateArticle(id, updates) {
    const articleRef = ref(db, `articles/article${id}`);
    try {
        await update(articleRef, updates);
        console.log('Article updated successfully');
    } catch (error) {
        console.error('Error updating article:', error);
    }
}




// جلب بوست بناءً على ID
async function getPostID(id) {
    console.log(id)
    const articleRef = ref(db, `posts/posts${id}`);
    try {
        const snapshot = await get(articleRef);
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.log('No post found');
        }
    } catch (error) {
        console.error('Error fetching post:', error);
    }





}
// جلب قصه بناءً على ID
async function getnovelsID(id) {
    const articleRef = ref(db, `novels/novels${id}`);
    try {
        const snapshot = await get(articleRef);
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.log('No novels found');
        }
    } catch (error) {
        console.error('Error fetching novels:', error);
    }
}
// جلب مقال بناءً على ID
async function getArticleID(id) {
    const articleRef = ref(db, `articles/articles${id}`);
    try {
        const snapshot = await get(articleRef);
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.log('No article found');
        }
    } catch (error) {
        console.error('Error fetching article:', error);
    }
}

// جلب بوست بناءً على category
async function getPostsByCategory(category, limit) {
    try {
        console.log(category);
        // البحث مباشرة حسب الكائن
        const q = query(ref(db, 'posts'), orderByChild(`category/${category}`), equalTo(true), limitToFirst(limit));
        const snapshot = await get(q);

        if (!snapshot.exists()) return [];

        return Object.values(snapshot.val());
    } catch (error) {
        console.error('Error fetching posts by category:', error);
        return [];
    }
}
// جلب قصه بناءً على category
async function getNovelsByCategory(category, limit) {
    try {
        // البحث مباشرة حسب الكائن
        const q = query(ref(db, 'novels'), orderByChild(`category/${category}`), equalTo(true), limitToFirst(limit));
        const snapshot = await get(q);

        if (!snapshot.exists()) return [];

        return Object.values(snapshot.val());
    } catch (error) {
        console.error('Error fetching posts by category:', error);
        return [];
    }
}
// جلب قصه بناءً على category
async function getArticlesByCategory(category, limit) {
    try {
        // البحث مباشرة حسب الكائن
        const q = query(ref(db, 'articles'), orderByChild(`category/${category}`), equalTo(true), limitToFirst(limit));
        const snapshot = await get(q);

        if (!snapshot.exists()) return [];

        return Object.values(snapshot.val());
    } catch (error) {
        console.error('Error fetching posts by category:', error);
        return [];
    }
}

async function getLatestPosts(limit) {
    try {
        const postsRef = ref(db, 'posts');
        const q = query(postsRef, orderByChild('timestamp'), limitToLast(limit));
        const snapshot = await get(q);
        if (!snapshot.exists()) return [];

        const data = Object.values(snapshot.val());
        // Firebase بترجع العناصر من الأقدم للأحدث بعد limitToLast، فنعكسهم:
        return data.reverse();
    } catch (error) {
        console.error("Error fetching latest posts:", error);
        return [];
    }
}
async function getLatestArticles(limit) {
    try {
        const postsRef = ref(db, 'articles');
        const q = query(postsRef, orderByChild('timestamp'), limitToLast(limit));
        const snapshot = await get(q);
        if (!snapshot.exists()) return [];

        const data = Object.values(snapshot.val());
        // Firebase بترجع العناصر من الأقدم للأحدث بعد limitToLast، فنعكسهم:
        return data.reverse();
    } catch (error) {
        console.error("Error fetching latest posts:", error);
        return [];
    }
}
async function getLatestNovels(limit) {
    try {
        const postsRef = ref(db, 'novels');
        const q = query(postsRef, orderByChild('timestamp'), limitToLast(limit));
        const snapshot = await get(q);
        if (!snapshot.exists()) return [];

        const data = Object.values(snapshot.val());
        // Firebase بترجع العناصر من الأقدم للأحدث بعد limitToLast، فنعكسهم:
        return data.reverse();
    } catch (error) {
        console.error("Error fetching latest posts:", error);
        return [];
    }
}


// جلب مقالات
async function getArticle() {
    const articleRef = ref(db, `articles`);
    try {
        const snapshot = await get(articleRef);
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.log('No article found');
        }
    } catch (error) {
        console.error('Error fetching article:', error);
    }
}




// حذف بوست
async function deletePost(id) {
    const articleRef = ref(db, `posts/post${id}`);
    try {
        await remove(articleRef);
        console.log('Post deleted successfully');
    } catch (error) {
        console.error('Error deleting post:', error);
    }
}
// حذف قصه
async function deletenovels(id) {
    const articleRef = ref(db, `novels/novels${id}`);
    try {
        await remove(articleRef);
        console.log('novels deleted successfully');
    } catch (error) {
        console.error('Error deleting novels:', error);
    }
}

// حذف مقال
async function deleteArticle(id) {
    const articleRef = ref(db, `articles/article${id}`);
    try {
        await remove(articleRef);
        console.log('Article deleted successfully');
    } catch (error) {
        console.error('Error deleting article:', error);
    }
}


// add, updata, get, delete category

//ADD

async function addContentCategory(type, contentObj) {
    const { id, category } = contentObj;

    try {
        // أضف المحتوى نفسه
        const contentRef = ref(db, `${type}/${type}${id}`);
        await set(contentRef, contentObj);

        const categories = Object.keys(category);
        console.log("Cat :", categories);
        // حدث الـ categories
        for (const cat of categories) {
            console.log("Cat :", cat);

            const catRef = ref(db, `categories/${type}/${cat}`);
            const snapshot = await get(catRef);
            let ids = snapshot.exists() ? snapshot.val() : [];
            if (!ids.includes(id)) ids.push(id);
            await set(catRef, ids);
        }

        console.log("Content added successfully!");
    } catch (err) {
        console.error("Error adding content:", err);
    }
}

//GET 
async function getContentByCategory(type, category, limit) {
    try {
        const catRef = ref(db, `categories/${type}/${category}`);
        const snapshot = await get(catRef);

        if (!snapshot.exists()) return [];

        const ids = snapshot.val().slice(0, limit); // آخر الـ limit محتويات
        const contents = [];

        for (const id of ids) {
            const contentSnap = await get(ref(db, `${type}/${type}${id}`));
            if (contentSnap.exists()) contents.push(contentSnap.val());
        }

        return contents;
    } catch (err) {
        console.error("Error fetching content by category:", err);
        return [];
    }
}

//UPDATE
async function updateContent(type, id, updatedFields) {
    try {
        const contentRef = ref(db, `${type}/${type}${id}`);
        await update(contentRef, updatedFields);

        // لو تم تحديث التصنيفات
        if (updatedFields.category) {
            const snapshot = await get(contentRef);
            const oldContent = snapshot.val();
            const oldCategories = oldContent.category || [];

            // إزالة ID من التصنيفات القديمة
            for (const cat of oldCategories) {
                const catRef = ref(db, `categories/${type}/${cat}`);
                const catSnap = await get(catRef);
                if (catSnap.exists()) {
                    const ids = catSnap.val().filter(cid => cid !== id);
                    await set(catRef, ids);
                }
            }

            // إضافة ID للتصنيفات الجديدة
            for (const cat of updatedFields.category) {
                const catRef = ref(db, `categories/${type}/${cat}`);
                const catSnap = await get(catRef);
                const ids = catSnap.exists() ? catSnap.val() : [];
                if (!ids.includes(id)) ids.push(id);
                await set(catRef, ids);
            }
        }

        console.log("Content updated successfully!");
    } catch (err) {
        console.error("Error updating content:", err);
    }
}

//DELETE
async function deleteContent(type, id) {
    try {
        const contentRef = ref(db, `${type}/${type}${id}`);
        const snapshot = await get(contentRef);

        if (!snapshot.exists()) return;

        const content = snapshot.val();

        // حذف من التصنيفات
        if (content.category) {
            for (const cat of content.category) {
                const catRef = ref(db, `categories/${type}/${cat}`);
                const catSnap = await get(catRef);
                if (catSnap.exists()) {
                    const ids = catSnap.val().filter(cid => cid !== id);
                    await set(catRef, ids);
                }
            }
        }

        // حذف المحتوى نفسه
        await set(contentRef, null);
        console.log("Content deleted successfully!");
    } catch (err) {
        console.error("Error deleting content:", err);
    }
}


//increase like comment

async function incrementFieldTransaction(path, field, amount = 1) {
    try {
        const targetRef = ref(db, path);

        await runTransaction(targetRef, (currentData) => {
            if (currentData === null) {
                currentData = {};
            }

            const currentValue = currentData[field] || 0;

            return {
                ...currentData,
                [field]: currentValue + amount
            };
        });

        console.log(`${field} updated successfully`);
    } catch (error) {
        console.error("Transaction error:", error);
    }
}


async function likeContent(type,postId, userId) {
    const postRef = ref(db, `${type}s/${type}${postId}`);

    try {
        await runTransaction(postRef, (content) => {
            if (!content) return content;

            if (!content.likesBy) {
                content.likesBy = {};
            }

            // لو المستخدم عمل لايك قبل كده → نوقف
            if (content.likesBy[userId]) {
                return content;
            }

            content.likesBy[userId] = true;
            content.likesCount = (content.likesCount || 0) + 1;

            return content;
        });

        console.log("Liked successfully");
    } catch (err) {
        console.error("Like error:", err);
    }
}


async function unlikeContent(type,postId, userId) {
    const postRef = ref(db, `${type}s/${type}${postId}`);

    try {
        await runTransaction(postRef, (content) => {
            if (!content || !content.likesBy) return content;

            if (!content.likesBy[userId]) {
                return content;
            }

            delete content.likesBy[userId];
            content.likesCount = Math.max((content.likesCount || 0) - 1, 0);

            return content;
        });

        console.log("Unliked successfully");
    } catch (err) {
        console.error("Unlike error:", err);
    }
}


async function hasUserLiked(postId, userId) {
    const snap = await get(ref(db, `posts/post${postId}/likesBy/${userId}`));
    return snap.exists();
}



// GET RANDOM CONTENT FROM CATEGORIES
async function getAllContent(type, limit = 20) {
    try {

        // categories/articles
        // categories/posts
        // categories/novels
        const categoriesRef = ref(db, `categories/${type}`);
        const categoriesSnapshot = await get(categoriesRef);

        if (!categoriesSnapshot.exists()) return [];

        const categories = categoriesSnapshot.val();

        let ids = [];

        // جمع جميع الـ IDs من كل Category
        for (const categoryName of Object.keys(categories)) {

            const categoryIds = categories[categoryName];

            if (Array.isArray(categoryIds)) {
                ids.push(...categoryIds);
            }

        }

        // إزالة التكرار
        ids = [...new Set(ids)];

        // ترتيب عشوائي
        ids.sort(() => Math.random() - 0.5);

        // تحديد العدد المطلوب
        ids = ids.slice(0, limit);

        const content = [];

        for (const id of ids) {

            const contentRef = ref(db, `${type}/${type}${id}`);
            const snapshot = await get(contentRef);

            if (snapshot.exists()) {
                content.push(snapshot.val());
            }

        }

        return content;

    } catch (err) {

        console.error("Error fetching random content:", err);
        return [];

    }
}

module.exports = {
    updateArticle,
    getPostID,
    getArticle,
    getnovelsID,
    getArticleID,
    getLatestPosts,
    getLatestArticles,
    getLatestNovels,
    addContentCategory,
    getContentByCategory,
    updateContent,
    deleteContent,
    deletePost,
    deletenovels,
    deleteArticle,

    deleteArticle,
    incrementFieldTransaction,
    likeContent,
    unlikeContent,
    hasUserLiked,
    getAllContent
}