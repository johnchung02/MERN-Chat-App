import { useContext, useEffect, useRef, useState } from "react"
import Avatar from "./Avatar";
import { UserContext } from "./UserContext";
import _ from "lodash";
import axios from "axios";

export default function Chat() {
    const [ws, setWs] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const {username, id} = useContext(UserContext);
    const uniqueMessages = _.uniqBy(messages, '_id');
    const messagesContainerRef = useRef(null);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:4040');
        setWs(ws);
        ws.addEventListener('message', onMessage);

        axios.get('/users').then(res => {
            setAllUsers(res.data);
        })
        
        // Clean up the WebSocket connection when the component unmounts
        return () => {
            ws.close();
        };
    }, []);

    useEffect(() => {
        // Scroll to the bottom whenever messages or selected user change
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [uniqueMessages]);

    useEffect(() => {
        if (selectedUserId) {
            axios.get('/messages/' + selectedUserId).then(res => {
                setMessages(res.data)
            })
        }
    }, [selectedUserId]);

    function showUsersOnline(users) {
        const uniqueUsersSet = new Set(users.map(user => user.userid));
        const uniqueUsers = Array.from(uniqueUsersSet, userid => users.find(user => user.userid === userid));

        setOnlineUsers(uniqueUsers);
    }

    function onMessage(event) {
        const messageData = JSON.parse(event.data);

        if ('usersOnline' in messageData) {
            showUsersOnline(messageData.usersOnline);
        } else if ('text' in messageData) {
            setMessages(prev => [...prev, {...messageData}]);
        }
    }

    function sendMessage(event) {
        event.preventDefault();
        ws.send(JSON.stringify({
            receiver: selectedUserId,
            text: messageText,
        }));
        setMessageText('');
        setMessages(prev => ([...prev, { 
            sender: id, 
            receiver: selectedUserId,
            text: messageText,
            id: Date.now()
        }]));
    }
    
    return (
        <div className="flex h-screen">
            <div className="bg-black w-1/5 p-2 border-r flex flex-col">
                <div className="flex-grow">
                    <div className="text-white border-b">
                        Users Online
                    </div>
                    {allUsers.map(user => (
                        <div onClick={() => setSelectedUserId(user._id)} key={user._id} className={`border-b border-white py-2 px-2 flex items-center gap-2 cursor-pointer ${user._id === selectedUserId ? 'bg-white' : 'text-white'}`}>
                            <Avatar username={user.username} online={onlineUsers.some(onlineUser => onlineUser.userid === user._id)} />
                            <span>{user.username}</span>
                        </div>
                    ))}
                </div>
                <div className="bg-white">
                    <button>log out</button>
                </div>
            </div>
            <div className="flex flex-col w-4/5 p-2 bg-black text-white">
                <div className="flex-grow">
                    {!selectedUserId && (
                        <div className="flex h-full flex-grow items-center justify-center">
                            <div>Welcome {username}</div>
                        </div>
                    )}
                    {!!selectedUserId && (
                        <div className="relative h-full">
                            <div ref={messagesContainerRef} className="absolute overflow-y-scroll inset-0">
                                {uniqueMessages.map((message, index) => (
                                    <div className={`p-1 ${message.sender === id ? 'text-right' : 'text-left'}`}>
                                        <div key={index} className="text-black text-left inline-block p-2 mx-2 bg-white">
                                            sender:{message.sender}<br />
                                            my id: {id}<br />
                                            {message.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                {!!selectedUserId && (
                    <div className="pt-2">
                        <form className="flex text-black" onSubmit={sendMessage}>
                            <input  type="text"
                                    value={messageText}
                                    onChange={ev => setMessageText(ev.target.value)}
                                    className="bg-white border flex-grow p-2" 
                                    placeholder="Type message"/>
                            <button type="submit" className="bg-white border p-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                </svg>
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}