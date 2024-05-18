export default function Contact() {
    return (
        {otherUsersOnline.map(user => (
            <div onClick={() => setSelectedUserId(user.userid)} key={user.userid} className={`border-b border-white py-2 px-2 flex items-center gap-2 cursor-pointer ${user.userid === selectedUserId ? 'bg-white' : 'text-white'}`}>
                <Avatar username={user.username} online={true}/>
                <span>{user.username}</span>
            </div>
        ))}        
    );
}