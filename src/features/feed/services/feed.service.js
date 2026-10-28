import { FEED_BATCH_SIZE } from "../../../constants/feedConfig";

export const FEED_EVENTS = {
  GET_FEED: "GET_FEED",
  FEED_RESULT: "FEED_RESULT",
  ENGAGEMENT: "ENGAGEMENT",
  LIKE_UPDATED: "LIKE_UPDATED",
};

export const requestFeed = (
  socket,
  {
    userId,
    type = "posts",
    cursor = 0,
    limit = FEED_BATCH_SIZE,
  } = {}
) => {
  if (!socket) return;

  socket.emit(FEED_EVENTS.GET_FEED, {
    userId: userId || "",
    type,
    cursor,
    limit,
  });
};

export const emitPostEngagement = (
  socket,
  { contentId, userId, type, contentType = "posts" } = {}
) => {
  if (!socket?.connected || !contentId || !userId) return false;

  if (!["like", "unlike"].includes(type)) return false;

  socket.emit(FEED_EVENTS.ENGAGEMENT, {
    contentId: String(contentId),
    userId: String(userId),
    type,
    contentType,
  });

  return true;
};