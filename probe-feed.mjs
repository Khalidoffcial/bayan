// Probe: raw socket GET_FEED as guest to inspect server payload
import { io } from "socket.io-client";
const socket = io("http://localhost:4000", { transports: ["websocket", "polling"], reconnection: false });
socket.on("connect", () => {
  console.log("connected", socket.id);
  socket.once("FEED_RESULT", (res) => {
    console.log("RESULT keys:", res && Object.keys(res));
    const items = res?.items ?? res?.posts ?? res?.content ?? res?.data ?? res?.feed;
    console.log("isArray(items):", Array.isArray(items), "len:", Array.isArray(items) ? items.length : "n/a");
    console.log("nextCursor:", res?.nextCursor, "cursor:", res?.cursor);
    if (Array.isArray(items) && items[0]) console.log("first item keys:", Object.keys(items[0]).slice(0, 20).join(","));
    process.exit(0);
  });
  socket.emit("GET_FEED", { userId: "", type: "all", cursor: 0, limit: 20 });
});
socket.on("connect_error", (e) => { console.log("connect_error", e.message); process.exit(1); });
setTimeout(() => { console.log("TIMEOUT waiting FEED_RESULT"); process.exit(2); }, 20000);
