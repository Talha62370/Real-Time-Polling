// listener.js
import { io } from "socket.io-client";

// connect to our running backend
const socket = io("http://localhost:5000");

// when connected
socket.on("connect", () => {
  console.log("Connected to WebSocket server with id:", socket.id);
  // no joinPoll emitted; we just stay in default connection
  console.log("Listening for all pollUpdated events…");
});

// listen for broadcasts from server (every pollUpdated event)
socket.on("pollUpdated", (poll) => {
  console.log("Poll updated broadcast received:");
  console.log(`Poll ID: ${poll.id}`);
  console.log(JSON.stringify(poll, null, 2));
});

// handle disconnect
socket.on("disconnect", () => {
  console.log("Disconnected from server");
});
