const Steam = require("steam-user");
const fetch = require("node-fetch");

module.exports = class ConnectionMonitor {
    constructor(){
        this.servers = {};

        setInterval((() => {
            let f = () => {
                this.stop();
                this.start();
            }
    
            f();
    
            return f;
        })(), 3600000);
    }

    async start(){
        this.servers = {};
    
        let cms = await (await fetch("https://api.steampowered.com/ISteamDirectory/GetCMList/v1/?cellID=0&maxcount=99999999")).json();
        let tcp = cms.response.serverlist;
        let websocket = cms.response.serverlist_websockets;
    
        for( let server of tcp ) {
            this.servers[server] = new TCPConnectionManager(server);
            this.servers[server].connect();
        }
    
        for( let server of websocket ){
            this.servers[server] = new WebsocketConnectionManager(server);
            this.servers[server].connect();
        }
    }
    
    stop(){
        for( let server of Object.keys(this.servers) ){
            this.servers[server].disconnecting = true;
            this.servers[server].disconnect();
        }

        this.servers = {};
    }

    restart(){
        this.stop();
        this.start();
    }
}

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

            setTimeout(() => {
                try {
                    this.steam.logOn()
                } catch(e) {
                    this.ok = false;
                    console.log("Error " + this.server + ": " + e); // TODO: something better with this
                    this.steam._disconnect();
                    this.connect();
                }
            }, 5000);
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
        try {
            this.steam.logOn();
        } catch(e){
            if( e.toString().indexOf("Already logged on") > -1 ){
                this.ok = true;
                console.log("Warning " + this.server + ": steam-user reports logged on, marking as OK and swallowing")
                return;
            }
        }
    }

    disconnect(){
        this.steam._disconnect();
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