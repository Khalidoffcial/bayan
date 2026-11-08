import { io } from "socket.io-client";
const socket = io("http://localhost:4000", { transports: ["websocket", "polling"], reconnection: false });
socket.on("connect", () => {
  // 3 sequential requests like Flow prefetch: cursor 0, 20, 40
  const cursors = [0, 20, 40];
  let i = 0;
  const next = () => {
    if (i >= cursors.length) { console.log("ALL OK"); process.exit(0); }
    const c = cursors[i++];
    const t0 = Date.now();
    socket.once("FEED_RESULT", (res) => {
      console.log(`cursor=${c} ms=${Date.now()-t0} items=${(res?.items||[]).length} nextCursor=${res?.nextCursor}`);
      setTimeout(next, 100);
    });
    socket.emit("GET_FEED", { userId: "", type: "all", cursor: c, limit: 20 });
    setTimeout(() => { console.log(`cursor=${c} NO RESPONSE after 20s`); process.exit(2); }, 20000);
  };
  next();
});
socket.on("connect_error", (e) => { console.log("connect_error", e.message); process.exit(1); });
setTimeout(() => { console.log("hard timeout"); process.exit(2); }, 70000);
