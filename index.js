const Steam = require("steam-user");
const fetch = require("node-fetch");

let servers = {};
const app = require("express")();

class ConnectionManager {
    constructor(server){
        this.disconnecting = false;
        this.server = server;
        this.steam = new Steam({ autoRelogin: false, webCompatibilityMode: (this instanceof WebsocketConnectionManager) });
        this.ok = false;
        this.reason = "logging on...";

        this.steam._connectTimeout = 2000;

        this.fixCMs();

        this.steam.on("loggedOn", res => {
            if( ! res.eresult || res.eresult != Steam.EResult.OK ){
                this.ok = false;
                this.reason = res.eresult.toString();
            }
            else {
                this.ok = true;
                this.reason = "OK";
            }
        });


        this.steam.on("disconnected", (res, msg) => {
            console.log("Disconnect " + this.server + ": " + this.reason);
            if( this.disconnecting ) return;

            this.fixCMs();

            this.ok = false;
            this.reason = res.ToString() + ": " + msg;

            setTimeout(() => this.steam.logOn(), 5000);
        });

        this.steam.on("error", err => {
            this.fixCMs();

            this.ok = false;
            this.reason = err;
            console.log("Disconnect " + this.server + ": " + this.reason);

            this.steam.logOn();
        });
    }

    connect(){
        this.steam.logOn();
    }

    disconnect(){
        this.steam.logOff();
    }
}

class TCPConnectionManager extends ConnectionManager {
    fixCMs(){
        this.steam._cmList = {
            time: Date.now(),
            tcp_servers: [ this.server ],
            websocket_servers: []
        }
    }
}

class WebsocketConnectionManager extends ConnectionManager {
    fixCMs(){
        this.steam._cmList = {
            time: Date.now(),
            tcp_servers: [],
            websocket_servers: [ this.server ]
        }
    }
}

async function start(){
    servers = {};

    let cms = await (await fetch("https://api.steampowered.com/ISteamDirectory/GetCMList/v1/?cellID=0&maxcount=99999999")).json();
    let tcp = cms.response.serverlist;
    let websocket = cms.response.serverlist_websockets;

    for( let server of tcp ) {
        servers[server] = new TCPConnectionManager(server);
        servers[server].connect();
    }

    for( let server of websocket ){
        servers[server] = new WebsocketConnectionManager(server);
        servers[server].connect();
    }
}

function stop(){
    for( let server of Object.keys(servers) ){
        servers[server].disconnecting = true;
        servers[server].disconnect();
    }

    servers = {};
}

(async () => {
    setInterval(() => {
        let okServers = Object.keys(servers).filter(i => servers[i].ok).length;
        let totalServers = Object.keys(servers).length;

        process.stdout.write("Connected to " + okServers + "/" + totalServers + " CMs (" + (Math.floor((okServers/totalServers)*1000)/10) + "%)                       \r");
    }, 100);

    setInterval((() => {
        let f = () => {
            stop();
            start();
        }

        f();

        return f;
    })(), 3600000);

    app.get("/", (req, res) => {
        let healthy = Object.keys(servers).filter(i => servers[i].ok).length;
        let total = Object.keys(servers).length;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ healthy, total }));
    });

    app.listen(process.env.PORT || 3200);
})();