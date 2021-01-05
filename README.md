# emily

A microservice that (should?) provide Steam CM and site status. I didn't really test it in scheduled maintenance yet, but the numbers it gives out make sense when Steam should otherwise be running fine. 

It should work for WebSocket and TCP CMs and updates the CM list once an hour. Also probably uses quite a bit of RAM, will work on that.

## Install
```bash
git clone git@github.com:antigravities/emily.git
cd emily
npm install
npm start
#PORT=3000 npm start # to specify custom port
```

Docker Soon&trade;.

## License

GNU AGPL v3. See LICENSE for details.