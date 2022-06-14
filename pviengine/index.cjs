const {
    Client
} = require('../pviclient/index.cjs');

const WebSocket = require('ws');

class Transmitter {
    constructor(parent) {
        this.parent = parent;
        this.websocketBE = null;
        this.websocketBEIsActive = false;
        this.sessionId = null;
    }
    
    startSessionServer(objectController, callbackController, url) {
        this.objectController = objectController;
        this.callbackController = callbackController;
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
            console.log("Transmitter::websocketBE - data: ", data.toString());
            var messageInParsed = JSON.parse(data);
            if (messageInParsed.SessionId != null) {
                if (this.sessionId == null) {
                    this.sessionId = messageInParsed.SessionId;
                        this.objectController[this.callbackController](messageInParsed);
                } else {
                    if (messageInParsed.SessionId === this.sessionId) {
                        this.objectController[this.callbackController](messageInParsed);
                    }
                }
            } else {
                this.objectController[this.callbackController](messageInParsed);
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
    constructor(appDir, engineName) {
        console.log("Engine::constructor()");
        this.appDir = appDir;
        this.engineName = engineName;
        this.engineConfig = null;
        this.websocketProtocol = 'wss';
        this.configure();
    }

    configure() {
        let appConfigFileName = this.appDir+'/config/app.json';
        this.config = JSON.parse(fs.readFileSync(appConfigFileName));
        this.engineConfig = this.config.Executables.find(cur => cur.Type === 'Viewer' && cur.Name === this.engineName).ViewerConfig;
    }

    async start() {
        console.log("Engine - starting");
        process.on('exit', this.exitHandler);
        process.on('SIGTERM', this.exitHandler);
        process.on('SIGINT', this.exitHandler);     // catches ctrl+c event
        process.on('SIGUSR1', this.exitHandler);    // catches "kill pid" (for example: nodemon restart)
        process.on('SIGUSR2', this.exitHandler);
        process.on('uncaughtException', this.exitHandler);
        this.websocketPort = this.engineConfig.WebsocketListenPort.toString();
        this.hostname = this.engineConfig.HostName;
        this.transmitter = new Transmitter(this);
        this.transmitter.startSessionServer(this, 'receivedFromServer', this.websocketProtocol+ '://' + this.hostname + ':' + this.websocketPort);
    }

    async stop() {
        console.log("Engine - stopped\n");
    }

    exitHandler(err) {
        console.log("Engine - exitHandler():\n ", err);
        process.exit(2);
    }

    receivedFromServer(message) {
    }

    forwardToServer(messageIn) {
    }    

    setViewerSpec(viewerSpec) {
    }
}

module.exports = {
    Engine: Engine
}
