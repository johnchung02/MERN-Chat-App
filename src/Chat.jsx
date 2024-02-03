import { useContext, useEffect, useState } from "react"
import Avatar from "./Avatar";
import { UserContext } from "./UserContext";

export default function Chat() {
    const [ws, setWs] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const {username, id} = useContext(UserContext);
    useEffect(() => {
        const ws = new WebSocket('ws://localhost:4040');
        setWs(ws);
        ws.addEventListener('message', onMessage);
    }, []);

    function showUsersOnline(users) {
        const uniqueUsersSet = new Set(users.map(user => user.userid));
        const uniqueUsers = Array.from(uniqueUsersSet, userid => users.find(user => user.userid === userid));

        setOnlineUsers(uniqueUsers);
    }

    function onMessage(event) {
        const messageData = JSON.parse(event.data);

        if ('usersOnline' in messageData) {
            showUsersOnline(messageData.usersOnline);
        } else {
            setMessages(prev => [...prev, {isOur:false, text:messageData.text}]);
        }
    }

    function sendMessage(ev) {
        ev.preventDefault();
        ws.send(JSON.stringify({
                reciever: selectedUserId,
                text: messageText,
        }));
        setMessages(prev => ([...prev, { text: messageText }]));
        setMessageText('');
    }

    const otherUsersOnline = onlineUsers.filter(user => user.userid !== id);

    return (
        <div className="flex h-screen">
            <div className="bg-black w-1/3 p-2 border-r">
                <div className="text-white border-b">
                    Users Online
                </div>
                {otherUsersOnline.map(user => (
                    <div onClick={() => setSelectedUserId(user.userid)} key={user.userid} className={`border-b border-white py-2 flex items-center gap-2 cursor-pointer ${user.userid === selectedUserId ? 'bg-white' : 'text-white'}`}>
                        <Avatar username={user.username} userid={user.userid}/>
                        <span>{user.username}</span>
                    </div>
                ))}
            </div>
            <div className=" flex flex-col w-2/3 p-2 bg-black text-white">
                <div className="flex-grow">
                    {!selectedUserId && (
                        <div className="flex h-full flex-grow items-center justify-center">
                            <div>Welcome {username}</div>
                        </div>
                    )}
                    <div>
                        {messages.map((message, index) => (
                        <div key={index} className="text-white">
                            {message.text}
                        </div>
                        ))}
                    </div>
                </div>
                {!!selectedUserId && (
                    <form className="flex gap-1 text-black" onSubmit={sendMessage}>
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
                )}
            </div>
        </div>
    )
}