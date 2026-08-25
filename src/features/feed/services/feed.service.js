export const requestFeed = (socket, { userId, type, cursor = 0, limit = 10 }) => {
  if (!socket) return;
  socket.emit("GET_FEED", {
    userId,
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
