import { useCallback, useEffect, useState } from "react";
import ReactPlayer from "react-player";
import { useParams } from "react-router-dom";
import { useSocket } from "../contexts/Socket";

const Room = () => {
  const [messages, setMessages] = useState(["start chatting here"]);
  const [myStream, setMyStream] = useState(null);
  const [message, setMessage] = useState("");
  const { roomId } = useParams();
  const socket = useSocket();

  useEffect(() => {
    socket.on("new-message", ({ message: msg }) => {
      console.log("new user message ->", msg);
      setMessages([...messages, msg]);
    });

    return () => {
      socket.off("new-message");
    };
  }, [socket, messages]);

  const handleCall = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(stream);
  }, []);

  return (
    <>
      <h1>Joined room: {roomId}</h1>
      <div>
        <button
          type="button"
          onClick={handleCall}>
          Call
        </button>
        <div>
          <h2>My stream</h2>
          <ReactPlayer
            url={myStream}
            playing
            muted
            height="100px"
            width="150px"
          />
        </div>
      </div>

      <div>
        <input
          id="user-message"
          type="text"
          value={message}
          placeholder="Type your message here."
          onChange={e => setMessage(e.target.value)}
        />
        <button
          onClick={() => {
            socket.emit("user-message", { roomId, message });
            setMessage("");
          }}>
          Send 🕊️
        </button>
      </div>

      <div>
        {messages.map(message => (
          <p key={Math.random()}>{message}</p>
        ))}
      </div>
    </>
  );
};

export default Room;
