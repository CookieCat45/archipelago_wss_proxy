const WSServer = require("ws").WebSocketServer;
const prompt = require("prompt-sync")();
const { Client, ClientPacket } = require("archipelago.js");
const { EventEmitter } = require("ws");


let client= new Client();

async function main() {
    let initialRoomInfo;
    let initialConnected;
    client.addListener("RoomInfo", packet => initialRoomInfo = packet);
    client.addListener("Connected", packet => initialConnected = packet);
    
    while (true) {
        try {
            const hostname = prompt("Enter the server hostname (e.g. 'archipelgo.gg'): ");
            const port = parseInt(prompt("Enter the server port (e.g. '38281'): "));
            const name = prompt("Enter your slot name: ");
            const password = prompt("Enter the server password (if any, otherwise leave blank): ");
            
            await client.connect({
                hostname,
                port,
                name,
                password,
                uuid: "",
                version: {
                    major: 0,
                    minor: 4,
                    build: 2,
                },
                game: "A Hat in Time",
                tags: ["Proxy"],
                items_handling: 7,
            });
            
            break;
        } catch {
            console.error("Unable to connect... try again!\n");
        }
    }
    
    const localServer = new WSServer({ port: 0 });
    const localServerPort = localServer.address().port;
    console.log(`Connected to Archipelago server. Connect your client to 'localhost:${localServerPort}'`);
    
    localServer.on("connection", (socket) => {
        console.log("Client connected...\n");
        socket.send(JSON.stringify([initialRoomInfo]));
        
        client.removeListener("PacketReceieved", onPacket);
        client.addListener("PacketReceived", onPacket);
        
        function onPacket(packet) {
            socket.send(JSON.stringify([packet]));
        }
        
        // client.removeListener doesn't work with PrintJSON for some reason, which leads to a memory leak + message spam
        /*
        function onPrint(packet, message)
        {
            let string = "";
            if (packet.type === "Chat") {
                string = `${client.players.alias(packet.slot)}: ${message}`;
            } else if (packet.type === "ServerChat") {
                string = `[Server]: ${message}`;
            } else {
                string = message;
            }
            
            console.log(string);
        }
        */
        
        socket.on("message", (message) => {
            let packets = JSON.parse(message);
            
            for (let i = 0; i < packets.length; i++) {
                if (packets[i].cmd == "Connect") {
                    socket.send(JSON.stringify([initialConnected]));
                } else if (packets[i].cmd === "ConnectUpdate" && !packets.includes("Proxy")) {
                    packets[i].tags.push("Proxy");
                }
            }
            
            packets = packets.filter(function( packet ) {
                return packet.cmd !== "Connect";
            });
            
            client.send(...packets);
        })
    });
}

void main();
