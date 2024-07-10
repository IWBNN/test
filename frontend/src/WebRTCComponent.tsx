import React, { useRef, useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const SERVER_URL = 'https://3.38.151.63/ws';

const WebRTCComponent = () => {
    const [stompClient, setStompClient] = useState<Client | null>(null);
    const [isLocalStreamStarted, setIsLocalStreamStarted] = useState(false);
    const [isRemoteStreamStarted, setIsRemoteStreamStarted] = useState(false);
    const [canStartRemoteStream, setCanStartRemoteStream] = useState(false);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const remoteStream = useRef<MediaStream | null>(new MediaStream());
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const iceCandidatesQueue = useRef<any[]>([]);

    useEffect(() => {
        const socket = new SockJS(SERVER_URL);
        const client = new Client({
            webSocketFactory: () => socket,
            debug: (str) => console.log(str),
            onConnect: () => {
                console.log('Connected to WebSocket');
                client.subscribe('/topic/offer', (message) => {
                    console.log('Received offer:', message.body);
                    const offer = JSON.parse(message.body);
                    handleOffer(offer);
                });
                client.subscribe('/topic/answer', (message) => {
                    console.log('Received answer:', message.body);
                    const answer = JSON.parse(message.body);
                    handleAnswer(answer);
                });
                client.subscribe('/topic/ice', (message) => {
                    console.log('Received ICE candidate:', message.body);
                    const candidate = JSON.parse(message.body);
                    handleNewICECandidateMsg(candidate);
                });
                client.subscribe('/topic/start', () => {
                    console.log('Received start signal');
                    setCanStartRemoteStream(true);
                });
            },
        });

        client.activate();
        setStompClient(client);

        return () => {
            client.deactivate();
        };
    }, []);

    const handleOffer = async (offer: any) => {
        console.log('Handling offer:', offer);
        if (!peerConnection.current) {
            peerConnection.current = createPeerConnection();
        }

        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        stompClient?.publish({ destination: '/app/stream/answer', body: JSON.stringify(answer) });

        // ICE 후보가 대기 중인 경우 처리
        while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };

    const handleAnswer = async (answer: any) => {
        console.log('Handling answer:', answer);
        if (!peerConnection.current) return;
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));

        // ICE 후보가 대기 중인 경우 처리
        while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };

    const handleNewICECandidateMsg = async (candidate: any) => {
        console.log('Handling new ICE candidate:', candidate);
        if (!peerConnection.current || !peerConnection.current.remoteDescription) {
            console.log('Remote description not set yet. Queueing candidate.');
            iceCandidatesQueue.current.push(candidate);
            return;
        }
        try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.error('Error adding received ICE candidate', e);
        }
    };

    const createPeerConnection = () => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
            ],
        });

        localStream.current?.getTracks().forEach(track => {
            pc.addTrack(track, localStream.current!);
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate:', event.candidate);
                stompClient?.publish({
                    destination: '/app/stream/ice',
                    body: JSON.stringify(event.candidate),
                });
            }
        };

        pc.ontrack = (event) => {
            console.log('Received remote track:', event.streams[0]);
            remoteStream.current = event.streams[0];
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream.current;
            }
        };

        return pc;
    };

    const startLocalStream = async () => {
        console.log('Starting local stream');
        localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream.current;
        }

        peerConnection.current = createPeerConnection();

        setIsLocalStreamStarted(true);
        stompClient?.publish({ destination: '/app/stream/start' });

        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        stompClient?.publish({ destination: '/app/stream/offer', body: JSON.stringify(offer) });
    };

    const startRemoteStream = async () => {
        console.log('Starting remote stream');
        setIsRemoteStreamStarted(true);
        if (remoteVideoRef.current && remoteStream.current) {
            remoteVideoRef.current.srcObject = remoteStream.current;
        }
    };

    return (
        <div>
            <div>
                <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '300px', height: '200px' }} />
                <button onClick={startLocalStream} disabled={isLocalStreamStarted}>Local Stream Start</button>
            </div>
            <div>
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '300px', height: '200px' }} />
                <button onClick={startRemoteStream} disabled={!canStartRemoteStream || isRemoteStreamStarted}>Remote Stream Start</button>
            </div>
        </div>
    );
};

export default WebRTCComponent;