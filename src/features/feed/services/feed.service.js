import { FEED_BATCH_SIZE } from "../../../constants/feedConfig";

export const requestFeed = (socket, { userId, type, cursor = 0, limit = FEED_BATCH_SIZE } = {}) => {
  if (!socket) return;
  socket.emit("GET_FEED", {
    userId: userId || "",
    type: type || "posts",
    cursor,
    limit,
  });
};

export const emitPostEngagement = (socket, { contentId, userId, type }) => {
  if (!socket) return;
  socket.emit("ENGAGEMENT", {
    contentId,
    userId,
    type,
  });
};
