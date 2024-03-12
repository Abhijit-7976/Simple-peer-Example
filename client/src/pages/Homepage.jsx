import { useCallback, useEffect, useRef, useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useNavigate } from "react-router-dom";
import Peer from "simple-peer/simplepeer.min.js";
import { useSocket } from "../contexts/Socket";

const Homepage = () => {
  const [mediaSetting, setMediaSetting] = useState({
    audio: true,
    video: true,
  });
  const [name, setName] = useState("");
  const [userName, setUserName] = useState("");
  const [stream, setStream] = useState(null);
  const [screenShareStream, setScreenShareStream] = useState(null);
  const [mySocketId, setMySocketId] = useState("");
  const [callTo, setCallTo] = useState("");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCallIncoming, setIsCallIncoming] = useState(false);
  const [isCallAccepted, setIsCallAccepted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);

  const myVideo = useRef();
  const userVideo = useRef();
  const myScreenShareVideo = useRef();
  const currentPeerConnection = useRef(null);
  const caller = useRef();
  const callerSignal = useRef();

  const socket = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    socket.on("connect", () => {
      setMySocketId(socket.id);
    });

    socket.on("call:incoming", ({ from, signal, name }) => {
      console.log("call incoming from ->", from, "and name ->", name);
      caller.current = from;
      callerSignal.current = signal;
      setIsCallIncoming(true);
      setUserName(name);
    });

    socket.on("call:ended", ({ from }) => {
      setIsCallAccepted(false);
    });

    return () => {
      socket.off("connect");
      socket.off("call:incoming");
      socket.off("call:ended");
    };
  }, [socket, navigate]);

  const getUserMedia = useCallback(async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia(mediaSetting);
    setStream(mediaStream);

    myVideo.current.srcObject = mediaStream;
  }, [mediaSetting]);

  useEffect(() => {
    getUserMedia();
  }, [getUserMedia]);

  const handleCall = useCallback(
    callTo => {
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream,
      });

      peer.on("signal", signal => {
        console.log("on call ->", isCallAccepted);
        console.log("calling ->", callTo, "and name ->", name);
        socket.emit("call:user", { to: callTo, signal, name });
      });

      socket.on("call:accepted", ({ from, signal, name }) => {
        console.log("call accepted by ->", from, "and name ->", name);
        peer.signal(signal);
        setUserName(name);
        setIsCallAccepted(true);
      });

      socket.on("call:rejected", ({ from }) => {
        console.log("call rejected by ->", from);
        peer.destroy();
      });

      peer.on("close", () => {
        socket.off("call:accepted");
        socket.off("call:rejected");
      });

      peer.on("stream", userStream => {
        console.log("user stream ->", userStream);

        userVideo.current.srcObject = userStream;
      });

      currentPeerConnection.current = peer;
    },
    [isCallAccepted, name, socket, stream]
  );

  const handleCallAccept = useCallback(() => {
    const peer = new Peer({
      initiator: false,
      tickle: false,
      stream,
    });

    peer.on("signal", signal => {
      console.log(
        "accepting call from ->",
        caller.current,
        "and name ->",
        name
      );
      socket.emit("call:accept", { from: caller.current, signal, name });
      setIsCallIncoming(false);
      setIsCallAccepted(true);
    });

    peer.on("stream", userStream => {
      console.log("user stream ->", userStream);
      userVideo.current.srcObject = userStream;
    });

    peer.signal(callerSignal.current);

    currentPeerConnection.current = peer;
  }, [name, socket, stream]);

  const handleCallReject = useCallback(() => {
    socket.emit("call:reject", { from: caller.current });
    setIsCallIncoming(false);
  }, [socket]);

  const handleCallEnd = useCallback(() => {
    if (callTo) {
      socket.emit("call:end", { to: callTo });
    }

    if (caller.current) {
      socket.emit("call:end", { to: caller.current });
    }

    currentPeerConnection.current.destroy();
    setIsCallAccepted(false);
  }, [callTo, socket]);

  const handleMicToggle = useCallback(() => {
    stream.getAudioTracks()[0].enabled = isMuted;
    mediaSetting.audio = !isMuted;

    setIsMuted(prev => !prev);
  }, [isMuted, mediaSetting, stream]);

  const handleVideoToggle = useCallback(() => {
    stream.getVideoTracks()[0].enabled = !isVideoOn;
    mediaSetting.video = isVideoOn;
    // setStream(stream);
    setIsVideoOn(prev => !prev);
  }, [isVideoOn, mediaSetting, stream]);

  const handleShareScreen = useCallback(async () => {
    const screenShareStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    const screenShareVideoTrack = screenShareStream.getVideoTracks()[0];

    console.log("screen share stream ->", screenShareStream);
    if (currentPeerConnection.current) {
      const streamVideoTrack = stream.getVideoTracks()[0];

      currentPeerConnection.current.replaceTrack(
        streamVideoTrack,
        screenShareVideoTrack,
        stream
      );
    }
    myScreenShareVideo.current.srcObject = screenShareStream;
    setScreenShareStream(screenShareStream);
    setIsScreenSharing(true);
  }, [stream]);

  const handleScreenShareEnd = useCallback(() => {
    if (currentPeerConnection.current) {
      const streamVideoTrack = stream.getVideoTracks()[0];
      const screenShareVideoTrack = screenShareStream.getVideoTracks()[0];

      currentPeerConnection.current.replaceTrack(
        screenShareVideoTrack,
        streamVideoTrack,
        stream
      );
    }

    myScreenShareVideo.current.srcObject
      .getTracks()
      .forEach(track => track.stop());

    myScreenShareVideo.current.srcObject = null;
    setScreenShareStream(null);
    setIsScreenSharing(false);
  }, [screenShareStream, stream]);

  return (
    <>
      <h1>Abyss</h1>
      <div>
        <div>
          <h2>{name || "me"}</h2>
          <video
            ref={myVideo}
            playsInline
            autoPlay
            muted
            style={{
              background: "black",
              height: "180px",
              width: "320px",
              marginRight: 10,
            }}
          />
          <video
            hidden={!isScreenSharing}
            ref={myScreenShareVideo}
            playsInline
            autoPlay
            // muted
            style={{ background: "black", height: "180px", width: "320px" }}
          />
          <div>
            <button
              onClick={handleMicToggle}
              style={{ marginRight: 10 }}>
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={handleVideoToggle}
              style={{ marginRight: 10 }}>
              {isVideoOn ? "Turn off camera" : "Turn on camera"}
            </button>
            {isCallAccepted ? (
              !isScreenSharing ? (
                <button
                  onClick={handleShareScreen}
                  style={{ marginRight: 10 }}>
                  Turn on screen sharing
                </button>
              ) : (
                <button
                  onClick={handleScreenShareEnd}
                  style={{ marginRight: 10 }}>
                  Turn off screen sharing
                </button>
              )
            ) : null}
          </div>
        </div>

        <div hidden={!isCallAccepted}>
          <h2>{userName || "user"}</h2>
          <video
            ref={userVideo}
            playsInline
            autoPlay
            style={{ background: "black", height: "180px", width: "320px" }}
          />
        </div>

        {isCallIncoming && (
          <div>
            <button onClick={handleCallAccept}>Accept</button>
            <button
              style={{ marginLeft: 10 }}
              onClick={handleCallReject}>
              Reject
            </button>
          </div>
        )}
        {isCallAccepted && (
          <div>
            <button onClick={handleCallEnd}>End</button>
          </div>
        )}
        <div>
          <h3>
            my id: {mySocketId}
            <CopyToClipboard text={mySocketId}>
              <button style={{ marginLeft: 10 }}>Copy</button>
            </CopyToClipboard>
          </h3>
          <input
            value={name}
            placeholder="Enter your name"
            onChange={e => setName(e.target.value)}
          />
          <input
            value={callTo}
            placeholder="Enter user id to call"
            style={{ marginLeft: 10 }}
            onChange={e => setCallTo(e.target.value)}
          />
          <button
            style={{ marginLeft: 10 }}
            onClick={() => {
              handleCall(callTo);
            }}>
            Call
          </button>
        </div>
      </div>
    </>
  );
};

export default Homepage;
