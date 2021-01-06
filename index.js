const app = require("express")();

const ConnectionMonitor = require("./cm.js");
const WebMonitor = require("./web.js");

let monitor;
let web;

function updateStatus(){
    let healthy = Object.keys(monitor.servers).filter(i => monitor.servers[i].ok).length;
    let total = Object.keys(monitor.servers).length;

    process.stdout.write(healthy + "/" + total + " CMs (" + (Math.floor((healthy/total)*1000)/10) + "%) - Store " + (web.store ? "OK" : "Not OK") + " / Community " + (web.community ? "OK" : "Not OK") + " / API " + (web.webapi ? "OK" : "Not OK") + "         \r");
}

(async () => {
    monitor = new ConnectionMonitor();
    web = new WebMonitor();

    setInterval(updateStatus, 2000);
    
    monitor.start();
    setInterval(() => monitor.restart(), 3600000);

    web.start();

    app.get("/", (req, res) => {
        let healthy = Object.keys(monitor.servers).filter(i => monitor.servers[i].ok).length;
        let total = Object.keys(monitor.servers).length;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            cm: { healthy, total },
            web: { community: web.community, store: web.store, api: web.webapi }
        }));
    });

    app.listen(process.env.PORT || 3200);
})();