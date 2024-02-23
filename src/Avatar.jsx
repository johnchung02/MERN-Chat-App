import React from 'react';
import QRCode from 'qrcode.react'


export default function Avatar({username, online}) {
    const dotColor = online ? 'bg-green-500' : 'bg-gray-500';

    console.log(username, online);
    console.log(username, dotColor);

    return (
        <div style={{ position: 'relative' }}>
            <QRCode value={username} size={32} />
            <div className={`absolute ${dotColor} w-2.5 h-2.5 bottom-0 right-0 border border-white shadow-lg shadow-black`}></div>
        </div>
    );
}