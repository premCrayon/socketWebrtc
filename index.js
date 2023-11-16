

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

let current_active_user = [];


io.on("connection", (socket) => {

    socket.on('users', ({ is_security = false, token, is_tenant = false }) => {

        const user = jwt.decode(token, "JKOGzYNqgFx7GLTu");

        if (!!clients?.[user?.userProfile?.[0]?.id]) {
        } else {
            clients[user?.userProfile?.[0]?.id] = socket
            socket["user_profile"] = user?.userProfile?.[0];
            socket["is_security"] = is_security;
            socket["is_tenant"] = is_tenant;
        }

        io.emit("user_connected", { connected_users: Object.keys(clients), current_active_user })
    });

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId)
        socket.broadcast.to(roomId).emit('user-connected', userId)
    })

    socket.on('accpet-resident', (userId, tenant_id) => {

        current_active_user?.push(userId, tenant_id)

        const recipientSocket = clients[userId];

        if (recipientSocket) {
            recipientSocket.emit('accpet-resident', userId);
        }
    })

    socket.on('delete_session', (user_id) => {

        if (clients[user_id]) {
            delete (clients[user_id])
        }

        io.emit("user_connected", Object.keys(clients))


    })

    socket.on('disconnect_trigger', (current_user, sender) => {

        let current_user_detail = clients[current_user]?.user_profile;


        if (clients[current_user]) {
            delete (clients[current_user])
        }

        if(sender){
        const recipientSocket = clients[sender];

        if (recipientSocket) {

            recipientSocket.emit('disconnect_trigger', current_user_detail);
        }
    }
        const isSubset = [current_user, sender].every(value => current_active_user?.includes(value));


        if (isSubset) {

            let user_index = current_active_user.indexOf(current_user);
            let sender_index = current_active_user.indexOf(sender);

            if (user_index !== -1 && sender_index != -1) {
                current_active_user.splice(user_index, 1);
                current_active_user.splice(sender_index, 1)
            }
        }

        console.log("total_connect", Object.keys(clients), current_active_user)


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
