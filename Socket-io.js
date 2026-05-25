// const { generateKey } = require('crypto');
const { Socket } = require('socket.io');
const express = require("express");
const app = express();
const cors = require("cors")
app.use(cors());
const storeUser = require("./datastore/storeUser.js");
const storeChats = require("./datastore/storeChats.js");

const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: 'http://localhost:5000',
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000, // زمن الانتظار الذي يمكن تحمله لاستجابة العميل
    pingInterval: 25000, // مدة بين إرسال رسائل ping للتحقق من استمرار الاتصال


});

io.on('connection', (client) => {

    console.log("open socket.io")

    console.log(client.id);
    //UserID => other id
    //MainID => my id
    function isClientConnected(clientid){
        return !!io.sockets.sockets.get(clientid)
    }

    client.on("broadcastMessage", (UserID, MainID,messageID, dt) => {
        //
        client.id = MainID;
        console.log(client.id);
        console.log(UserID);
        console.log(messageID);
        console.log("open..." + MainID + "  ...");
        console.log("This is : " + JSON.stringify(dt));
        //
        const chatID =Number(MainID) + Number(UserID) ;
                // store in ChatStore
                function StoreChats(data){
                    storeChats.sendMessage(chatID , messageID , data)
                }

        storeChats.getMessages(chatID).then((val)=>{
            console.log("This is "+val)
            if("0x1001" === val){
                io.emit(`${UserID}`,MainID);
                sending()
            }else{
                sending()
            }
        })

        function sending() {
                    // if online
        if(isClientConnected(UserID)){
            dt.status = "delivered";
            // StoreChats(dt);
            io.emit(`${UserID + MainID}-${UserID}`, JSON.stringify(dt), MainID);

        }else{//offline
            dt.status = "sent";
            // StoreChats(dt);
            io.emit(`${MainID + UserID}-${MainID}`, `Client ${UserID} in not connected.`);
        }
          }

    })

    //created_at	timestamp	 	current_timestamp()

    client.once('disconnect', () => {
        console.log("close");
    });
});

server.listen(2000);