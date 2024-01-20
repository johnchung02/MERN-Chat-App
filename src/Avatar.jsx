import React from 'react';
import QRCode from 'qrcode.react'


export default function Avatar({username}) {
    return (
        <div>
            <QRCode value={username} size={32} />
        </div>
    );
}