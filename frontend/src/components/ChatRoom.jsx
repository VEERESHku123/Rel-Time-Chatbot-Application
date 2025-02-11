import React, { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import ChatBox from './ChatBox';
import MemberList from './Member';
import ChatContent from './ChatContent';
import RegistrationForm from './RegisterForm';

const ChatRoom = () => {
    const [privateChats, setPrivateChats] = useState(new Map());
    const [publicChats, setPublicChats] = useState([]);
    const [tab, setTab] = useState("CHATROOM");
    const [stompClient, setStompClient] = useState(null);
    const [userData, setUserData] = useState({
        username: '',
        receivername: '',
        connected: false,
        message: ''
    });

    useEffect(() => {
        return () => {
            if (stompClient) {
                stompClient.deactivate();
            }
        };
    }, [stompClient]);

    const onMessageReceived = (payload) => {
        const payloadData = JSON.parse(payload.body);
        setPublicChats(prevChats => [...prevChats, payloadData]);
    };

    const onPrivateMessage = (payload) => {
        const payloadData = JSON.parse(payload.body);
        setPrivateChats(prevChats => {
            const newChats = new Map(prevChats);
            if (!newChats.has(payloadData.senderName)) {
                newChats.set(payloadData.senderName, []);
            }
            newChats.get(payloadData.senderName).push(payloadData);
            return newChats;
        });
    };

    const onError = (err) => {
        console.error("STOMP Connection Error:", err);
    };

    const registerUser = () => {
        connect();
    };

    const connect = () => {
        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            onConnect: () => onConnected(client),
            onStompError: onError,
        });
        setStompClient(client);
        client.activate();
    };

    const onConnected = (client) => {
        setUserData(prevData => ({ ...prevData, connected: true }));
        client.subscribe('/chatroom/public', onMessageReceived);
        client.subscribe(`/user/${userData.username}/private`, onPrivateMessage);
        userJoin(client);
    };

    const userJoin = (client) => {
        const chatMessage = { senderName: userData.username, status: "JOIN" };
        client.publish({ destination: "/app/message", body: JSON.stringify(chatMessage) });
    };

    const sendValue = () => {
        if (stompClient && userData.message.trim() !== '') {
            const chatMessage = {
                senderName: userData.username,
                message: userData.message,
                status: "MESSAGE"
            };
            stompClient.publish({ destination: "/app/message", body: JSON.stringify(chatMessage) });
            setUserData(prevData => ({ ...prevData, message: "" }));
        }
    };

    const sendPrivateValue = () => {
        if (stompClient && userData.message.trim() !== '') {
            const chatMessage = {
                senderName: userData.username,
                receiverName: tab,
                message: userData.message,
                status: "MESSAGE"
            };
            setPrivateChats(prevChats => {
                const newChats = new Map(prevChats);
                if (!newChats.has(tab)) {
                    newChats.set(tab, []);
                }
                newChats.get(tab).push(chatMessage);
                return newChats;
            });
            stompClient.publish({ destination: "/app/private-message", body: JSON.stringify(chatMessage) });
            setUserData(prevData => ({ ...prevData, message: "" }));
        }
    };

    const handleUsername = (event) => {
        setUserData(prevData => ({ ...prevData, username: event.target.value }));
    };

    const handleMessage = (event) => {
        setUserData(prevData => ({ ...prevData, message: event.target.value }));
    };

    return (
        <div className="container">
            {userData.connected ? (
                <ChatBox>
                    <MemberList tab={tab} privateChats={privateChats} setTab={setTab} />
                    <ChatContent
                        tab={tab}
                        publicChats={publicChats}
                        privateChats={privateChats}
                        userData={userData}
                        handleMessage={handleMessage}
                        sendValue={sendValue}
                        sendPrivateValue={sendPrivateValue}
                    />
                </ChatBox>
            ) : (
                <RegistrationForm userData={userData} handleUsername={handleUsername} registerUser={registerUser} />
            )}
        </div>
    );
};

export default ChatRoom;
