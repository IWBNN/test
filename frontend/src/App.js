import React, { useRef, useEffect, useState } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

const SERVER_URL = 'https://3.38.151.63/';
const STREAM_START = '/app/stream/start';
const STREAM_CALL = '/app/stream/call';
const STREAM_RECEIVE = '/topic/stream/receive';
const STREAM_ANSWER = '/topic/stream/answer';

function App() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [stompClient, setStompClient] = useState(null);

  useEffect(() => {
    const sock = new SockJS(SERVER_URL + 'ws');
    const stomp = Stomp.over(sock);

    stomp.connect({}, () => {
      stomp.subscribe(STREAM_RECEIVE, onReceiveStream);
      stomp.subscribe(STREAM_ANSWER, onReceiveAnswer);
    });

    setStompClient(stomp);

    return () => {
      if (stompClient) {
        stompClient.disconnect();
      }
    };
  }, []);

  const onReceiveStream = (message) => {
    const data = JSON.parse(message.body);
    const description = new RTCSessionDescription(data.sdp);
    peerConnection.setRemoteDescription(description);

    peerConnection.createAnswer()
        .then(answer => {
          peerConnection.setLocalDescription(answer);
          stompClient.send(STREAM_CALL, {}, JSON.stringify({ sdp: answer }));
        });
  };

  const onReceiveAnswer = (message) => {
    const data = JSON.parse(message.body);
    const description = new RTCSessionDescription(data.sdp);
    peerConnection.setRemoteDescription(description);
  };

  const startLocalStream = () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          localVideoRef.current.srcObject = stream;

          const pc = new RTCPeerConnection();
          stream.getTracks().forEach(track => pc.addTrack(track, stream));

          pc.onicecandidate = event => {
            if (event.candidate) {
              stompClient.send(STREAM_START, {}, JSON.stringify({ candidate: event.candidate }));
            }
          };

          pc.ontrack = event => {
            remoteVideoRef.current.srcObject = event.streams[0];
          };

          pc.createOffer()
              .then(offer => {
                pc.setLocalDescription(offer);
                stompClient.send(STREAM_START, {}, JSON.stringify({ sdp: offer }));
              });

          setPeerConnection(pc);
        });
  };

  return (
      <div>
        <h1>WebRTC Streaming App</h1>
        <button onClick={startLocalStream}>Local Stream Start</button>
        <button onClick={() => stompClient.send(STREAM_CALL, {}, {})}>Call</button>
        <div>
          <video ref={localVideoRef} autoPlay playsInline></video>
          <video ref={remoteVideoRef} autoPlay playsInline></video>
        </div>
      </div>
  );
}

export default App;
