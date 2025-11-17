import { ref, set, get, update, remove, child } from "firebase/database";
import { database } from './firebase.js';

class ArticleDAO {
    constructor() {
        this.dbRef = ref(database);
    }

    // حفظ بوست جديد
    async savePost(post) {
        const articleRef = ref(database, `posts/post${post.id}`);
        try {
            await set(articleRef, post);
            console.log('post saved successfully');
        } catch (error) {
            console.error('Error saving post:', error);
        }
    }
    // حفظ قصه جديد
    // eslint-disable-next-line no-dupe-class-members
    async saveStory(story) {
        const articleRef = ref(database, `stories/story${story.id}`);
        try {
            await set(articleRef, story);
            console.log('story saved successfully');
        } catch (error) {
            console.error('Error saving story:', error);
        }
    }
    // حفظ مقال جديد
    // eslint-disable-next-line no-dupe-class-members
    async saveArticle(article) {
        const articleRef = ref(database, `articles/article${article.id}`);
        try {
            await set(articleRef, article);
            console.log('Article saved successfully');
        } catch (error) {
            console.error('Error saving article:', error);
        }
    }





    // تحديث مقال
    async updateArticle(id, updates) {
        const articleRef = ref(database, `articles/article${id}`);
        try {
            await update(articleRef, updates);
            console.log('Article updated successfully');
        } catch (error) {
            console.error('Error updating article:', error);
        }
    }




    // جلب بوست بناءً على ID
    async getPostID(id) {
        const articleRef = ref(database, `posts/post${id}`);
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
    async getStoryID(id) {
        const articleRef = ref(database, `stories/story${id}`);
        try {
            const snapshot = await get(articleRef);
            if (snapshot.exists()) {
                return snapshot.val();
            } else {
                console.log('No story found');
            }
        } catch (error) {
            console.error('Error fetching story:', error);
        }
    }
    // جلب مقال بناءً على ID
    async getArticleID(id) {
        const articleRef = ref(database, `articles/article${id}`);
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



    // جلب مقالات
    async getArticle() {
        const articleRef = ref(database, `articles`);
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
    async deletePost(id) {
        const articleRef = ref(database, `posts/post${id}`);
        try {
            await remove(articleRef);
            console.log('Post deleted successfully');
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    }
    // حذف قصه
    async deleteStory(id) {
        const articleRef = ref(database, `stories/story${id}`);
        try {
            await remove(articleRef);
            console.log('Story deleted successfully');
        } catch (error) {
            console.error('Error deleting story:', error);
        }
    }

    // حذف مقال
    async deleteArticle(id) {
        const articleRef = ref(database, `articles/article${id}`);
        try {
            await remove(articleRef);
            console.log('Article deleted successfully');
        } catch (error) {
            console.error('Error deleting article:', error);
        }
    }
}

export default ArticleDAO;
