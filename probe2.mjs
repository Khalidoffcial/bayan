import { io } from "socket.io-client";
const socket = io("http://localhost:4000", { transports: ["websocket", "polling"], reconnection: false });
socket.on("connect", () => {
  console.log("connected", socket.id);
  socket.onAny((ev, ...args) => console.log("EVENT:", ev, typeof args[0] === "object" ? "obj" : args[0]));
  socket.emit("GET_FEED", { userId: "", type: "all", cursor: 0, limit: 20 });
  setTimeout(() => { console.log("done waiting"); process.exit(0); }, 25000);
});
socket.on("connect_error", (e) => { console.log("connect_error", e.message); process.exit(1); });
