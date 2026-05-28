const bcrypt = require('bcrypt');
const { db, ref, set, get, update, query, equalTo, orderByChild } = require('./firebase');

// تشفير كلمة المرور
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

// التحقق من كلمة المرور
async function verifyPassword(password, hash) {
    if (password === hash) {
        return true;
    }
    return await bcrypt.compare(password, hash);
}

// تسجيل الدخول

async function login_user(identifierUser, password) {
    try {
        // const db = getDatabase();

        // الاستعلام عن الحقول المختلفة
        const userQueryname = query(ref(db, 'user_data/Profile'), orderByChild('F_user'), equalTo(identifierUser));
        const userQueryname2 = query(ref(db, 'user_data/Profile'), orderByChild('S_user'), equalTo(identifierUser));
        const userQueryId = query(ref(db, 'user_data/Profile'), orderByChild('Id_user'), equalTo(identifierUser));

        // تنفيذ الاستعلامات
        const [snapshotName, snapshotId, snapshotName2] = await Promise.all([
            get(userQueryname),
            get(userQueryname2),
            get(userQueryId),
        ]);

        let userData = null;

        // التحقق من النتائج
        if (snapshotName.exists()) {
            userData = Object.values(snapshotName.val())[0];
        } else if (snapshotId.exists()) {
            userData = Object.values(snapshotId.val())[0];
        } else if (snapshotName2.exists()) {
            userData = Object.values(snapshotName2.val())[0];
        }

        if (!userData) {
            throw new Error("There seems to be a registration error. Please try again.");
        }
        if (password.length === 60) {
            if (userData.psw === password) {
                return userData;
            } else {
                throw new Error("There seems to be a registration error. Please try again.");
            }
        } else {
            // تحقق من كلمة المرور (التشفير)
            const passwordMatch = await verifyPassword(password, userData.psw);
            if (!passwordMatch) {
                throw new Error("There seems to be a registration error. Please try again.");
            }

            console.log("User data:", userData);
            return userData;
        }


    } catch (error) {
        console.error("Error during login:", error.message);
        throw error;
    }
}


// التحقق من الاسم الأول والثاني وكلمة المرور
async function logup_user_check_fsp(first_name, second_name, password) {
    try {
        const userQuery = query(ref(db, "user_data/Profile"), orderByChild('S_user'), equalTo(second_name));
        const snapshot = await get(userQuery);

        if (snapshot.exists()) {
            const userData = Object.values(snapshot.val())[0];
            const passwordMatch = await verifyPassword(password, userData.psw);
            return passwordMatch && userData.F_user === first_name;
        } else {
            return false;
        }
    } catch (error) {
        console.error("this err4" + error)
        throw error;
    }
}

// إدخال بيانات المستخدم
async function logup_user_Insert(first_name, second_name, email, uid, id_user, password) {
    try {
        const hashedPassword = await hashPassword(password);
        const newUser = {
            F_user: first_name,
            S_user: second_name,
            email: email,
            uid: uid,
            Id_user: id_user,
            psw: hashedPassword,
            Bio: "",
            followers: {},
            following: {},
            IdPoster: {}
        };

        await set(ref(db, `user_data/Profile/${id_user}`), newUser);
        return newUser;
    } catch (error) {
        console.error("This err3" + error)
        throw error;
    }
}


async function logup_user_Insert_Name(name, username, password) {
    try {
        const userQuery = query(ref(db, 'user_data/Profile'), orderByChild('S_user'), equalTo(username));
        const snapshot = await get(userQuery);

        if (!snapshot.exists()) throw new Error('User not found');

        const userId = Object.keys(snapshot.val())[0];
        const userData = snapshot.val()[userId];

        const passwordMatch = await verifyPassword(password, userData.psw);
        if (!passwordMatch) throw new Error('Invalid password');

        if (typeof(name) === "undefined") {
            return error;
        }
        // تحديث البيانات
        await update(ref(db, `user_data/Profile/${userId}`), { F_user: name });

        // جلب القيمه المحدثه بعد التحديث
        const updatedSnapshot = await get(ref(db, `user_data/Profile/${userId}`));
        const updatedData = updatedSnapshot.val();

        return updatedData // هنا ترجع البيانات بعد التحديث
        ;
    } catch (error) {
        console.error("Error updating bio:", error.message);
        throw error;
    }
}

async function logup_user_Insert_BIO(Bio, username, password) {
    try {
        const userQuery = query(ref(db, 'user_data/Profile'), orderByChild('S_user'), equalTo(username));
        const snapshot = await get(userQuery);

        if (!snapshot.exists()) throw new Error('User not found');

        const userId = Object.keys(snapshot.val())[0];
        const userData = snapshot.val()[userId];

        const passwordMatch = await verifyPassword(password, userData.psw);
        if (!passwordMatch) throw new Error('Invalid password');

        if (typeof(Bio) === "undefined") {
            return error;
        }

        // تحديث البيانات
        await update(ref(db, `user_data/Profile/${userId}`), { Bio });

        // جلب القيمه المحدثه بعد التحديث
        const updatedSnapshot = await get(ref(db, `user_data/Profile/${userId}`));
        const updatedData = updatedSnapshot.val();

        return updatedData // هنا ترجع البيانات بعد التحديث
        ;
    } catch (error) {
        console.error("Error updating bio:", error.message);
        throw error;
    }
}

async function logup_user_Insert_ImgProfile(imgProfile, username, password) {
    try {
        const userQuery = query(ref(db, 'user_data/Profile'), orderByChild('S_user'), equalTo(username));
        const snapshot = await get(userQuery);

        if (snapshot.exists()) {
            const userId = Object.keys(snapshot.val())[0]; // الحصول على معرف المستخدم
            const userData = snapshot.val()[userId];

            const passwordMatch = await verifyPassword(password, userData.psw);
            if (passwordMatch) {


                await update(ref(db, `user_data/Profile/${userId}`), { imgProfile });

                // جلب القيمه المحدثه بعد التحديث
                const updatedSnapshot = await get(ref(db, `user_data/Profile/${userId}`));
                const updatedData = updatedSnapshot.val();

                return updatedData // هنا ترجع البيانات بعد التحديث

            } else {
                throw new Error('Invalid password');
            }
        } else {
            throw new Error('User not found');
        }
    } catch (error) {
        throw error;
    }
}

async function updateUserToInsertInteresting(idUser, updates) {
    const articleRef = ref(db, `user_data/Profile/${idUser}`);
    try {
        const updatedUser = await findbyID(idUser);
        updatedUser.interesting = updates;

        await update(articleRef, updatedUser);
        console.log('Article updated successfully');
    } catch (error) {
        console.error('Error updating article:', error);
    }
}

async function findbyID(idN) {
    try {
        const userRef = ref(db, `user_data/Profile/${idN}`); // المسار بناءً على Id_user
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            return userData;
        } else {
            console.log('User not found');
        }
    } catch (error) {
        throw error;
    }
}


async function find_ContentUser_byID(type,idUser) {
    try {
        const userRef = ref(db, `user_data/Profile/${idUser}/${type}`); // المسار بناءً على Id_user
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            return userData;
        } else {
            console.log('User not found');
        }
    } catch (error) {
        throw error;
    }
}

async function findbyEmail(email) {
    try {
        const userQuery = query(ref(db, "user_data/Profile"), orderByChild('email'), equalTo(email));
        const snapshot = await get(userQuery);

        if (snapshot.exists()) {
            return userData = Object.values(snapshot.val())[0];
        } else {
            return false;
        }
    } catch (error) {
        console.error("this err4" + error)
        throw error;
    }
};

async function findUserByEmailAndUid(email, uid) {
    try {
        // Query على email أولاً
        const userQuery = query(ref(db, "user_data/Profile"), orderByChild("email"), equalTo(email));
        const snapshot = await get(userQuery);

        if (!snapshot.exists()) return false;

        // من النتائج، نلاقي اللي uid بتاعه متطابق
        const allUsers = Object.values(snapshot.val());
        const matchedUser = allUsers.find(user => user.uid === uid);

        if (matchedUser) {
            return matchedUser; // ترجع بيانات المستخدم
        } else {
            return false; // موجود email بس uid مختلف
        }
    } catch (error) {
        console.error("findUserByEmailAndUid error:", error);
        throw error;
    }
}

async function IncreasingFollowing(idUser, idFollowedUser) {
    try {
        const userSnap = await get(ref(db, `user_data/Profile/${idUser}`));

        if (!userSnap.exists()) throw new Error("User not found");

        const userData = userSnap.val();

        let following = userData.following || [];

        // 🔥 منع التكرار
        if (!following.includes(idFollowedUser)) {
            following.push(idFollowedUser);
        }

        await update(ref(db, `user_data/Profile/${idUser}`), { following });

        return userData;

    } catch (error) {
        console.error("Error updating following:", error);
        throw error;
    }
}
async function IncreasingFollowers(idUser, idFollowedUser) {
    try {
        const snap = await get(ref(db, `user_data/Profile/${idFollowedUser}`));

        if (!snap.exists()) throw new Error("User not found");

        const userData = snap.val();

        let followers = userData.followers || [];

        // 🔥 منع التكرار
        if (!followers.includes(idUser)) {
            followers.push(idUser);
        }

        await update(ref(db, `user_data/Profile/${idFollowedUser}`), {
            followers
        });

        return true;

    } catch (error) {
        console.error("Error updating followers:", error);
        throw error;
    }
}

async function DecreaseFollowing(idUser, idFollowedUser) {
    try {
        const snap = await get(ref(db, `user_data/Profile/${idUser}`));

        if (!snap.exists()) throw new Error("User not found");

        const userData = snap.val();

        let following = userData.following || [];

        following = following.filter(id => id !== idFollowedUser);

        await update(ref(db, `user_data/Profile/${idUser}`), { following });

        return userData;

    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function DecreaseFollower(idUser, idFollowedUser) {
    try {
        const snap = await get(ref(db, `user_data/Profile/${idFollowedUser}`));

        if (!snap.exists()) throw new Error("User not found");

        const userData = snap.val();

        let followers = userData.followers || [];

        followers = followers.filter(id => id !== idUser);

        await update(ref(db, `user_data/Profile/${idFollowedUser}`), {
            followers
        });

        return true;

    } catch (error) {
        console.error(error);
        throw error;
    }
}




async function addContentId_User(type,idUser, content_id) {
    try {
        findbyID(idUser).then((updatedUser) => {

            if(type == "posts"){

                let posts = updatedUser.posts || [];
                posts.push(content_id); // للإضافة
                update(ref(db, `user_data/Profile/${idUser}`), { posts });
            } else if(type =="articles"){
                let articles = updatedUser.articles || [];
                articles.push(content_id); // للإضافة    
                update(ref(db, `user_data/Profile/${idUser}`), { articles });
            }
            else if(type =="novels"){
                let novels = updatedUser.novels || [];
                novels.push(content_id); // للإضافة

                update(ref(db, `user_data/Profile/${idUser}`), { novels });
            }



            return "suc";
        }).catch((err) => {
            return err;
        });

    } catch (error) {
        throw error;
    }
}

async function deletePostsFrom_User(idUser, content_id) {
    try {
        // 1️⃣ جلب بيانات المستخدم الأساسي
        const snapshot = await get(ref(db, `user_data/Profile/${idUser}`));

        if (snapshot.exists()) {
            const userData = snapshot.val();

            posts = userData.posts.filter(id => id !== content_id); // للحذف

            // 4️⃣ تحديث البيانات في Firebase
            await update(ref(db, `user_data/Profile/${idUser}`), { posts });

            // 5️⃣ جلب القيم الجديدة بعد التحديث
            const updatedSnapshot = await get(ref(db, `user_data/Profile/${idUser}`));
            const updatedData = updatedSnapshot.val();

            console.log("Updated user data:", updatedData);
            return updatedData;
        } else {
            throw new Error("User not found");
        }
    } catch (error) {
        console.error("Error decreasing following:", error);
        throw error;
    }
}



module.exports = {
    login_user,
    logup_user_Insert,
    logup_user_check_fsp,
    logup_user_Insert_Name,
    logup_user_Insert_BIO,
    logup_user_Insert_ImgProfile,
    updateUserToInsertInteresting,
    IncreasingFollowing,
    IncreasingFollowers,
    DecreaseFollowing,
    DecreaseFollower,
    findbyID,
    find_ContentUser_byID,
    findbyEmail,
    findUserByEmailAndUid,
    addContentId_User,
    deletePostsFrom_User
};