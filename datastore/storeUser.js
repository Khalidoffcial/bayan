const { db, ref, set, get, update, remove, child, query, equalTo, orderByChild } = require('./firebase');

// الحصول على بيانات المستخدم
async function getFriendsUser(id) {
  try {
    const snapshot = await get(child(ref(db), `user_data/friends/${id}`));
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return ""; // إذا لم يكن هناك أصدقاء
    }
  } catch (error) {
    throw new Error("Error fetching user data: " + error.message);
  }
}

// الحصول على بيانات المستخدم مع الاسم
async function get_data_id_name(id) {
  try {
    const snapshot = await get(child(ref(db), `user_data/friends/${id}`));
    if (snapshot.exists()) {
      return snapshot.val(); // يعيد جميع بيانات المستخدم
    } else {
      throw new Error("User not found");
    }
  } catch (error) {
    throw new Error("Error fetching user data: " + error.message);
  }
}

// إضافة مستخدم جديد
async function set_user_main(id) {
  try {
    await set(ref(db, `user_data/friends/${id}`), {
      friends: {}
    });
    return "User inserted successfully";
  } catch (error) {
    throw new Error("Error inserting user: " + error.message);
  }
}

// إضافة أو تحديث صديق
async function set_friend(id, friendId, data) {
  try {
    const userRef = ref(db, `user_data/friends/${id}/${friendId}`);
    await set(userRef, data);
    return "Friend added/updated successfully";
  } catch (error) {
    throw new Error("Error adding/updating friend: " + error.message);
  }
}

// حذف مستخدم بالكامل
async function delete_user_main(id) {
  try {
    const userRef = ref(db, `user_data/friends/${id}`);
    await remove(userRef);
    return "User deleted successfully";
  } catch (error) {
    throw new Error("Error deleting user: " + error.message);
  }
}

// حذف صديق
async function delete_friend(id, friendId) {
  try {
    const friendRef = ref(db, `user_data/friends/${id}/${friendId}`);
    await remove(friendRef);
    return "Friend deleted successfully";
  } catch (error) {
    throw new Error("Error deleting friend: " + error.message);
  }
}

module.exports = {
    getFriendsUser,
  get_data_id_name,
  set_user_main,
  set_friend,
  delete_user_main,
  delete_friend,
};
