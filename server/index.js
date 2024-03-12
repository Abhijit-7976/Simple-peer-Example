import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const roomsToUsersMap = new Map();

app.use(cors({ credentials: true, origin: "http://localhost:5173" }));

// const server = app.listen(8000, () => {
//   console.log("listening on 8000");
// });

app.get("/", (req, res) => {
  res.send("Server is up and running.");
});

app;

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

io.on("connection", socket => {
  console.log("connected ->", socket.id);

  socket.on("call:user", ({ to, signal, name }) => {
    console.log("calling ->", to, "and name ->", name);
    socket.to(to).emit("call:incoming", { from: socket.id, signal, name });
  });

  socket.on("call:accept", ({ from, signal, name }) => {
    console.log("accepting call from ->", from, "and name ->", name);
    socket.to(from).emit("call:accepted", { from: socket.id, signal, name });
  });

  socket.on("call:reject", ({ from }) => {
    console.log("rejecting call from ->", from);
    socket.to(from).emit("call:rejected", { from: socket.id });
  });

  socket.on("call:end", ({ to }) => {
    console.log("ending call with ->", to);
    socket.to(to).emit("call:ended", { from: socket.id });
  });
});

server.listen(8000, () => {
  console.log("listening on 8000");
});
