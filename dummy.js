

const express = require("express");

const cors = require("cors");
const { Server } = require("socket.io");
const app = express()
const PORT = 6600;
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


let clients = {}

io.on("connection", (socket) => {

    socket.on('setNickname', token => {
        
        const user = jwt.decode(token, "egtb5hcgMxzPSPdT")

        if (!!clients?.[user?.user_id]) {
        } else {
            clients[user?.user_id] = socket
            socket["nickname"] = user?.user_id
            socket["users"] = user
        }
        io.emit("user_connected", Object.keys(clients))
    });
    socket.on('joinRoom', (room) => {
        socket.join(room);
        socket.emit('roomJoined', room);
    });
    socket.on('leaveRoom', (room) => {
        socket.leave(room);
    });
    socket.on("disconnect", (data) => {
        if (socket.nickname) {
            delete clients[socket.nickname];
            io.emit("user_disconnected", Object.keys(clients))

        }
    });
    socket.on('live-call', (data) => {
        const recipientSocket = clients[data?.sender];
        if (recipientSocket) {
            recipientSocket.emit('live-call', data);
        }
    })
    socket.on("accept", (data) => {
        const recipientSocket = clients[data?.use_data?.user_id];
        if (recipientSocket) {
            recipientSocket.emit('accept', data);
        }
    });
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId)
        socket.broadcast.to(roomId).emit('user-connected', userId)

        // socket.on('disconnect', () => {
        //     socket.broadcast.to(roomId).emit('user-disconnected', userId)
        // })
    })
    socket.on('end_call', ({ user, peer_id, room_id, type }) => {
        console.log(peer_id, room_id, 'peer_id , room_id')
        socket.broadcast.to(room_id).emit('user-disconnected', { peer_id, user, type })
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
