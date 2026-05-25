const { db, ref, set, get, update, remove, push, child } = require('./firebase');

// إنشاء محادثة جديدة
async function createChat(chatId, idMAIN,UserId) {
    console.log(chatId + " " + idMAIN,UserId);
  try {
    await set(ref(db, `user_data/chats/${chatId}`), {
      participants:{idMAIN,UserId},
    //   messages: {}
    });
    return "Chat created successfully";
  } catch (error) {
    throw new Error("Error creating chat: " + error.message);
  }
}

// إرسال رسالة جديدة
async function sendMessage(chatId, messageID, messageContent) {
  try {
    const messageRef = ref(db, `user_data/chats/${chatId}/messages/${messageID}`);
    await set(messageRef,
        messageContent
      );
    return "Message sent successfully";
  } catch (error) {
    throw new Error("Error sending message: " + error.message);
  }
}

// الحصول على جميع الرسائل في محادثة
async function getMessages(chatId) {
  try {
    const messagesRef = ref(db, `user_data/chats/${chatId}/messages`);
    const snapshot = await get(messagesRef);
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return "0x1001";
    }
  } catch (error) {
    throw new Error("Error fetching messages: " + error.message);
  }
}

// حذف محادثة بالكامل
async function deleteChat(chatId) {
  try {
    await remove(ref(db, `user_data/chats/${chatId}`));
    return "Chat deleted successfully";
  } catch (error) {
    throw new Error("Error deleting chat: " + error.message);
  }
}

// حذف رسالة محددة
async function deleteMessage(chatId, messageId) {
  try {
    await remove(ref(db, `user_data/chats/${chatId}/messages/${messageId}`));
    return "Message deleted successfully";
  } catch (error) {
    throw new Error("Error deleting message: " + error.message);
  }
}

module.exports = {
  createChat,
  sendMessage,
  getMessages,
  deleteChat,
  deleteMessage
};
