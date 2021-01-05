const fetch = require("node-fetch");

module.exports = class WebMonitor {
    constructor(){
        this.store = false;
        this.community = false;
        this.webapi = false;
    }

    start(){
        setInterval(async () => {
            this.store = await this.fetch({
                urls: [
                    "https://store.steampowered.com/",
                    "https://store.steampowered.com/app/439720",
                    "https://store.steampowered.com/app/440",
                    "https://store.steampowered.com/genre/Free%20to%20Play/"
                ],
                can302: false
            });

            this.community = await this.fetch({
                urls: [
                    "https://steamcommunity.com/",
                    "https://steamcommunity.com/app/439720",
                    "https://steamcommunity.com/app/440",
                    "https://steamcommunity.com/groups/reddit",
                    "https://steamcommunity.com/profiles/76561198043532513"  
                ],
                can302: true
            });

            this.webapi = await this.fetch({
                urls: [
                    "https://api.steampowered.com/ISteamDirectory/GetCMList/v1/?cellID=0",
                    "https://api.steampowered.com/ISteamApps/GetAppList/v2/"
                ],
                can302: false
            })
        }, 15000);
    }

    async fetch(obj){
        let can302 = obj.can302 || false;
        let urls = obj.urls;

        for( let url of urls ){
            try {
                let res = await fetch(url, { redirect: can302 ? "follow": "error" });
                if( ! res.ok ) throw "not OK";
            } catch(e) {
                console.log("Error fetching " + url + ": " + e);
                return false;
            }

            await new Promise(r => setInterval(r, 2000));
        }

        return true;
    }
}