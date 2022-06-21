const { ClientEngine } = require('../pviclient/index.cjs');
const fs = require("fs");
const WebSocket = require('ws');

class Transmitter {
    constructor(parent) {
        this.parent = parent;
        this.websocketBE = null;
        this.websocketBEIsActive = false;
        this.sessionId = null;
    }
    
    startSessionServer(url) {
        this.websocketBE = new WebSocket(url, [], {rejectUnauthorized: false});
        this.websocketBE.on('open', () => {
            this.websocketBEIsActive = true;
            console.log("Websocket opened");
            setTimeout(() => { this.keepAlive(); }, 30000);
        });
        this.websocketBE.on('ping', () => {
            clearTimeout(this.pingTimeout);
            setTimeout(() => { this.keepAlive(); }, 30000);
        });
        this.websocketBE.on('close', (e) => {
            this.websocketBEIsActive = false;
            console.log("Websocket closed: ", e);
            clearTimeout(this.pingTimeout);
        });
        this.websocketBE.on('message', (data) => {
            //console.log("Transmitter::websocketBE - data: ", data.toString());
            var messageInParsed = JSON.parse(data);
            if (messageInParsed.SessionId != null) {
                if (this.sessionId == null) {
                    this.sessionId = messageInParsed.SessionId;
                        this.parent.receivedFromServer(messageInParsed);
                } else {
                    if (messageInParsed.SessionId === this.sessionId) {
                        this.parent.receivedFromServer(messageInParsed);
                    }
                }
            } else {
                this.parent.receivedFromServer(messageInParsed);
            }
        });
        this.websocketBE.on('error', (e) => {
            console.log("Websocket open error: " + e);
        });
    }
    
    sendMessageToBE(message) {
        if (this.websocketBEIsActive === true) {
            this.websocketBE.send(message);
        } else {
            // TBD: Restart session if necessary
            console.log("Transmitter::sendMessageToBE - this.websocketBEIsActive !== true");
        }
    }
    
    keepAlive() {
        this.websocketBE.send('{}');
        this.pingTimeout = setTimeout(() => { this.keepAlive(); }, 30000 + 1000);
    }    
}

class Engine {
    constructor(engineConfig, appDir, engineName) {
        console.log("Engine::constructor()");
        this.appId = engineConfig.Name;
        this.engineConfig = engineConfig;
        this.appDir = appDir;
        this.websocketProtocol = 'wss';
        this.websocketPort = this.engineConfig.WebsocketListenPort.toString();
        this.hostname = this.engineConfig.HostName;
        this.receivedFromServer = this.receivedFromServer.bind(this);
        this.forwardToServer = this.forwardToServer.bind(this);
        this.client = new ClientEngine(this, this.appId);
        this.transmitter = new Transmitter(this);
    }

    async start() {
        console.log("Engine - starting");
        process.on('exit', this.exitHandler);
        process.on('SIGTERM', this.exitHandler);
        process.on('SIGINT', this.exitHandler);     // catches ctrl+c event
        process.on('SIGUSR1', this.exitHandler);    // catches "kill pid" (for example: nodemon restart)
        process.on('SIGUSR2', this.exitHandler);
        process.on('uncaughtException', this.exitHandler);
        this.transmitter.startSessionServer(this.websocketProtocol+ '://' + this.hostname + ':' + this.websocketPort);
    }

    async stop() {
        console.log("Engine - stopped");
    }

    exitHandler(err) {
        console.log("Engine - exitHandler():\n ", err);
        process.exit(2);
    }

    receivedFromServer(message) {
        this.client.fromServer(message);
    }

    forwardToServer(messageIn) {
        let messageOut = {
            AppId: this.appId,
            ...messageIn
        };
        this.transmitter.sendMessageToBE(JSON.stringify(messageOut));
    }
}

module.exports = {
    Engine: Engine
}
