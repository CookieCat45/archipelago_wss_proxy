const WSServer = require("ws").WebSocketServer;
const prompt = require("prompt-sync")();
const { Client, ClientPacket } = require("archipelago.js");


let client= new Client();

async function main() {
    let initialRoomInfo;
    client.addListener("RoomInfo", packet => initialRoomInfo = packet);

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
                game: "",
                tags: ["TextOnly", "Proxy"],
                items_handling: 7,
            });

            break;
        } catch {
            console.error("Unable to connect... try again!\n");
        }
    }

    const localServer = new WSServer({ port: 0 });
    const localServerPort = localServer.address().port;
    console.log(`Connected to Archipelago server. Connect your client to 'ws://localhost:${localServerPort}'`);

    localServer.on("connection", (socket) => {
        console.log("Client connected...\n");
        socket.send(JSON.stringify([initialRoomInfo]));
        client.addListener("PacketReceived", (packet) => {
            socket.send(JSON.stringify([packet]));
        });

        client.addListener("PrintJSON", (packet, message) => {
            let string = "";
            if (packet.type === "Chat") {
                string = `${client.players.alias(packet.slot)}: ${message}`;
            } else if (packet.type === "ServerChat") {
                string = `[Server]: ${message}`;
            } else {
                string = message;
            }

            console.log(string);
        });

        socket.on("message", (message) => {
            const packets = JSON.parse(message);
            for (let i = 0; i < packets.length; i++) {
                if ((packets[i].cmd === "Connect" || packets[i].cmd === "ConnectUpdate") && !packets.includes("Proxy")) {
                    packets[i].tags.push("Proxy");
                }
            }

            client.send(...packets);
        })
    });
}

void main();
