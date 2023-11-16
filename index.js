

const express = require("express");

const cors = require("cors");
const { Server } = require("socket.io");
const app = express()
const PORT = 8080;
const jwt = require("jsonwebtoken")


const server = app.listen(PORT, () => {
    try {
        console.log(`server listing on ${PORT}`)
    }
    catch (err) {
        console.log(err)
    }
})

const io = new Server(server, {
    cors: {
        origin: '*',
        credentials: true,
    },
});


let clients = {};

let current_live_active_user = [];


io.on("connection", (socket) => {

    socket.on('users', ({is_security=false,token,is_tenant=false}) => {
        
        const user = jwt.decode(token, "JKOGzYNqgFx7GLTu");

        if (!!clients?.[user?.userProfile?.[0]?.id]) {
        } else {
            clients[user?.userProfile?.[0]?.id] = socket
            socket["user_profile"] = user?.userProfile?.[0];
            socket["is_security"] = is_security;
            socket["is_tenant"]=is_tenant;
        }

        io.emit("user_connected", Object.keys(clients))
    });

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId)
        socket.broadcast.to(roomId).emit('user-connected', userId)
    })
    socket.on('end_call', ({ user, peer_id, room_id, type }) => {
        console.log(peer_id, room_id, 'peer_id , room_id')
        socket.broadcast.to(room_id).emit('user-disconnected', { peer_id, user, type })
    })

    socket.on("disconnect", (data) => {
        if (socket.nickname) {
            delete clients[socket.nickname];
            io.emit("user_disconnected", Object.keys(clients))

        }
    });
    socket.on('live-call', (data) => {
        const recipientSocket = clients[data?.sender];

        if (recipientSocket) {
            console.log(recipientSocket,"recipientSocket")
            recipientSocket.emit('live-call', data);
        }

    })


    socket.on("accept", (data) => {
        const recipientSocket = clients[data?.use_data?.user_id];
        if (recipientSocket) {
            recipientSocket.emit('accept', data);
        }
    });

    socket.on('end_call', ({ user, peer_id, room_id, type }) => {
        console.log(peer_id, room_id, 'peer_id , room_id')
        socket.broadcast.to(room_id).emit('user-disconnected', { peer_id, user, type })
    })

    socket.on('accpet-resident', (userId) => {
        const recipientSocket = clients[userId];
       
        if (recipientSocket) {
            console.log(userId,"skslks")
            recipientSocket.emit('accpet-resident', userId);
        }
    })



});

app.get('/', async (req, res) => {
    const status = {
        uptime: process.uptime(),
        message: "Server is running...",
        process_id: process.pid,
        date: new Date()
    };

    res.status(200).send(status)
})


app.use(express.urlencoded({ extended: false }))
app.use(express.json({ limit: "20mb", extended: true }));
app.use(cors());
