const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Message = require('./models/Message');
const ws = require('ws');

dotenv.config();
mongoose.connect(process.env.MONGO_URL);
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();

app.use(express.json());

app.use(cookieParser());

app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}));

async function getUserData(req) {
    return new Promise((resolve, reject) => {
        const token = req.cookies?.token;
        if (token) {
            jwt.verify(token, jwtSecret, {}, (err, userData) => {
                if (err) throw err;
                resolve(userData);
            });
        } else {
            reject('Token not found')
        }
    });
}

app.get('/test', (req, res) => {
    res.json('test ok');
});

app.get('/profile', (req, res) => {
    const token = req.cookies?.token;
    if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) throw err;
            res.json(userData);
        });
    }
});

app.get('/messages/:userId', async (req, res) => {
    const otherUserId = req.params.userId;
    const userData = await getUserData(req);
    const myUserId = userData.userId;

    const messages = await Message.find({
    $or: [
        { sender: otherUserId, receiver: myUserId },
        { sender: myUserId, receiver: otherUserId }
    ]
    }).sort({createdAt: 1}); // Sort by the 'createdAt' field in decending order

    res.json(messages);
});

app.get('/users', async (req, res) => {
    const userData = await getUserData(req);
    const myUserId = userData.userId;

    const users = await User.find({ _id: { $ne: myUserId } });

    res.json(users);
});

app.post('/login', async (req, res) => {
    const {username, password} = req.body;
    const foundUser = await User.findOne({username});
    if (foundUser) {
        const passOk = bcrypt.compareSync(password, foundUser.password);
        if (passOk) {
            jwt.sign({userId:foundUser._id, username}, jwtSecret, {}, (err, token) => {
                res.cookie('token', token, {sameSite:'none', secure:true}).status(201).json({
                    id: foundUser._id,
                });
            });
        }
    }
});

app.post('/logout', async (req, res) => {
    res.cookie('token', '', {sameSite:'none', secure:true}).json('logging out');
});

app.post('/register', async (req, res) => {
    const {username, password} = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
        const createdUser = await User.create({
            username: username, 
            password: hashedPassword,
        });
        jwt.sign({userId:createdUser._id, username}, jwtSecret, {}, (err, token) => {
            if (err) throw err;
            res.cookie('token', token, {sameSite:'none', secure:true}).status(201).json({
                id: createdUser._id,
            });
        });
    } catch (err) {
        if (err) throw err;
        res.status(500).json('error')
    }
});

const server = app.listen(4040);

const wss = new ws.WebSocketServer({server});

//old version
// wss.on('connection', (connection, req) => {

//     function updateUserStatus() {
//         [...wss.clients].forEach(client => {
//             client.send(JSON.stringify({
//                 usersOnline: [...wss.clients].map(client => ({userid: client.userId, username: client.username}))
//             }));
//         });
//     }

//     connection.isAlive = true;

//     connection.timer = setInterval(() => {
//         connection.ping();
//         connection.death = setTimeout(() => {
//             connection.isAlive = false;
//             connection.terminate();
//             updateUserStatus();
//             console.log('disconntect');
//         }, 1000);
//     }, 5000);

//     connection.on('pong', () => {
//         clearTimeout(connection.death);
//     });

//     connection.on('close', () => {
//         clearInterval(connection.timer); // Clear the interval when the connection is closed
//         updateUserStatus();
//     });

//     const cookies = req.headers.cookie;
//     if (cookies) {
//         const cookieToken = cookies.split(';').find(str => str.startsWith('token='));
//         if (cookieToken) {
//             const token = cookieToken.split('=')[1];
//             if (token) {
//                 jwt.verify(token, jwtSecret, {}, (err, userData) => {
//                     if (err) throw err;
//                     const {userId, username} = userData;
//                     connection.userId = userId;
//                     connection.username = username;
//                 });
//             }
//         }
//     }

//     connection.on('message', async (message) => {
//         const messageData = JSON.parse(message.toString());
//         const {receiver, text} = messageData;

//         if (receiver && text) {
//             const messageDocument = await Message.create({
//                 sender: connection.userId,
//                 receiver: receiver,
//                 text: text
//             });
//             [...wss.clients]
//             .filter(client => client.userId === receiver)
//             .forEach(client => client.send(JSON.stringify({
//                 text, 
//                 sender:connection.userId,
//                 receiver,
//                 _id: messageDocument._id,
//             })));
//         }
//     });

//     updateUserStatus();
// });

wss.on('connection', (connection, req) => {
    function updateUserStatus() {
        const usersOnline = [...wss.clients].map(client => ({ userid: client.userId, username: client.username }));
        broadcastUsersOnline(usersOnline);
    }

    function broadcastUsersOnline(usersOnline) {
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify({ usersOnline }));
        });
    }

    function verifyAndSetUserData(token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) {
                console.error('JWT verification error:', err);
                // Optionally, close the connection or take other appropriate actions
                return;
            }
            const { userId, username } = userData;
            connection.userId = userId;
            connection.username = username;
        });
    }

    connection.isAlive = true;

    connection.timer = setInterval(() => {
        connection.ping();
        connection.death = setTimeout(() => {
            connection.isAlive = false;
            clearInterval(connection.timer);
            connection.terminate();
            console.log('disconnect');
            updateUserStatus();
        }, 1000);
    }, 5000);

    connection.on('pong', () => {
        clearTimeout(connection.death);
    });

    connection.on('close', () => {
        clearInterval(connection.timer);
        updateUserStatus();
    });

    const cookies = req.headers.cookie;
    if (cookies) {
        const cookieToken = cookies.split(';').find(str => str.startsWith('token='));
        if (cookieToken) {
            const token = cookieToken.split('=')[1];
            if (token) {
                verifyAndSetUserData(token);
            }
        }
    }

    connection.on('message', async (message) => {
        const messageData = JSON.parse(message.toString());
        const { receiver, text } = messageData;

        if (receiver && text) {
            const messageDocument = await Message.create({
                sender: connection.userId,
                receiver: receiver,
                text: text
            });
            const usersToNotify = [...wss.clients].filter(client => client.userId === receiver);
            broadcastUsersOnline(usersToNotify.map(client => ({ userid: client.userId, username: client.username })));

            usersToNotify.forEach(client => client.send(JSON.stringify({
                text,
                sender: connection.userId,
                receiver,
                _id: messageDocument._id,
            })));
        }
    });

    updateUserStatus();
});
