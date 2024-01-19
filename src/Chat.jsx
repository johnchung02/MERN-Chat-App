import { useEffect, useState } from "react"

export default function Chat() {
    const [ws, setWs] = useState(null);
    useEffect(() => {
        const ws = new WebSocket('ws://localhost:4040');
        setWs(ws);
        ws.addEventListener('message', onMessage);
    }, []);

    function showUsersOnline(users) {
        console.log(users);
    }

    function onMessage(event) {
        const messageData = JSON.parse(event.data);
        if ('online' in messageData) {
            console.log(messageData.usersOnline)
            //showUsersOnline(messageData.usersOnline);
        }
    }

    return (
        <div className="flex h-screen">
            <div className="bg-white w-1/3">
                friends
            </div>
            <div className="bg-blue-300 flex flex-col w-2/3 p-2">
                <div className="flex-grow">
                    messages
                </div>
                <div className="flex gap-1">
                    <input  type="text" 
                            className="bg-white border flex-grow p-2" 
                            placeholder="Type message">
                    </input>
                    <button className="bg-white border p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                        </svg>
                    </button>
                </div>
            </div>

        </div>
    )
}