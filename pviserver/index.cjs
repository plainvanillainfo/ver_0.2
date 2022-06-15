const {
    Attribute,
    AttributeComponent,
    AttributeComponentPrimitive,
    AttributeComponentEmbedded,
    AttributeReference,
    AttributeChild,
    AttributeExtension,
    PVIClass,
    UseCase,
    UseCaseElem,
    ItemAttr,
    ItemAttrComponent,
    ItemAttrComponentPrimitive,
    ItemAttrComponentEmbedded,
    ItemAttrReference,
    ItemAttrChild,
    ItemAttrExtension,
    Item,
    Template,
    TemplateList,
    TemplateElem,
    Track
} = require('../pvicommon/index.cjs');

const fs = require("fs");
const express = require('express');
const https = require('https');
const http = require('http');
const WebSocket = require('ws');
const randomstring = require("randomstring");
const bodyParser = require('body-parser')
const fileUpload = require('express-fileupload');
const levelup = require('levelup');
const leveldown = require('leveldown');

class Database {
    constructor(parent, databaseDir) {
        this.parent = parent;
        this.databaseDir = databaseDir;
        this.dbNameData = 'db_' + this.parent.appName;
        this.dbHandle = null;
    }
    
    openDataDB() {
        let options = {};
        return new Promise(resolve => {
            levelup(leveldown(this.databaseDir + '/'), options, (err, dbHandle) => {
                if (err) throw err;
                this.dbHandle = dbHandle;
                this.dbHandle.get('DataExists', (err, value) => {
                    if (err) {
                        if (err.notFound != null) {
                            this.initializeDataDB(resolve);
                        } else {
                           resolve("Database::openDataDB() - DataExists - error: " + err);
                        }
                    } else {
                        this.dbHandleIdNext = true;
                        this.dbHandle.get('R', (err1, value1) => {
                            if (err1) {
                                resolve("Database::openDataDB() - nodeRoot.Key - error: " + err1);
                            } else {
                                let parsedData = JSON.parse(value1);
                                resolve("Database::openDataDB() - nodeRoot.Key: " + value1);
                            }
                        });
                    }
                });
            });
        });
    }

    initializeDataDB(resolve) {
        console.log('Database::initializeDataDB(): ', this.databaseDir  + '/');
        var ops = [];
        ops.push({type: 'put', key: 'DataExists', value: '1'});
        ops.push({type: 'put', key: 'R', 
            value: JSON.stringify({})
        });
        this.dbHandle.batch(ops, (err) => {
            if (err) {
                resolve("Database::initializeDataDB - dbData.batch: " + err);
            } else {
                resolve("Database::initializeDataDB - dbData.batch loaded ");
            }
        });
}
    
    loadUsers() {
    }

    insertKeyAndValue(key, value, artifactNode, callbackName) {
    }

    retrieveKeyValue(key, artifactNode, schemaNode, modelPathPos, message, context, callbackName) {
    }
    
    retrieveKeyValueRange(keyLo, keyHi, artifactNode, schemaNode, modelPathPos, message, context, callbackName) {
    }

    deleteKeyValue(key, artifactNode, callbackName) {
    }
    
    insertKeysAndValues(ops, callbackName, artifactNode, message, context) {
    }

}

class Session {
    constructor(parent, id) {
        this.parent = parent;
        this.id = id;
    }
    
    receiveMessage(messageIn) {
    }
    
    forwardMessage(messageIn) {
    }
    
    close() {
    }
    
}

class Model {
    constructor(parent) {
        this.parent = parent;
        this.appName = this.parent.config.AppName;
        this.classes = {};
        this.useCases = {};
        this.initializeClasses();
        this.initializeUseCases();
        this.database = new Database(this, this.parent.serverConfig.DBDir);
    }

    receivedFromClient(messageIn, context) {
    }

    initializeClasses() {
        let classesDir = this.parent.appDir + '/' + this.parent.config.ModelClasses.Dir;
        let classesFiles = this.parent.config.ModelClasses.Files;
        classesFiles.forEach(fileCur => {
            let filePathCur = classesDir + '/' + fileCur;
            let classesFileCurContent = JSON.parse(fs.readFileSync(filePathCur));
            console.log("Model::initializeClasses - file: ", classesFileCurContent.Name);
            classesFileCurContent.Classes.forEach(classCur => {
                console.log("    ", classCur.Name);
                this.classes[classCur.Name] = new PVIClass(this, classCur.Attributes, false);
            });
        });
    }    

    initializeUseCases() {
        let useCasesDir = this.parent.appDir + '/' + this.parent.config.ModelUseCases.Dir;
        let useCasesFiles = this.parent.config.ModelUseCases.Files;
        useCasesFiles.forEach(fileCur => {
            let filePathCur = useCasesDir + '/' + fileCur;
            let useCasesFileCurContent = JSON.parse(fs.readFileSync(filePathCur));
            console.log("Model::initializeUseCases - file: ", useCasesFileCurContent.Name);
            useCasesFileCurContent.UseCases.forEach(useCaseCur => {
                console.log("    ", useCaseCur.Name);
                this.useCases[useCaseCur.Name] = new UseCase(this, useCaseCur);
            });
        });
    }    

}

class WebServer {
    constructor(parent) {
        this.parent = parent;
        this.keyFileDir = this.parent.serverConfig.KeyFileDir;
        this.wsConnections = [];
        this.startupTimeBufferMillisec = 1;
    }

    async start() {
        console.log("\nWebServer::start()");
        setTimeout(() => { 
            this.startWebsocketListening(this.parent.serverConfig.WebsocketListenPort);
        }, this.startupTimeBufferMillisec);
        setTimeout(() => { 
            this.startUploadListening(this.parent.serverConfig.UploadListenPort);
        }, this.startupTimeBufferMillisec);
    }

    startWebsocketListening(portNumber) {
        console.log("WebServer - startWebsocketListening: ", portNumber);
        this.port = {};
        this.port.express = express();
        this.port.express.use(bodyParser.urlencoded({extended: true}));
        try {
            let privKeyFile = this.keyFileDir + 'privkey.pem';
            let certFile = this.keyFileDir + 'fullchain.pem';
            if (fs.existsSync(privKeyFile)) {
                this.port.listener = https.createServer({
                    key: fs.readFileSync(privKeyFile),
                    cert: fs.readFileSync(certFile)
                }, this.port.express);
            } else {
                this.port.listener = http.createServer({}, this.port.express);
            }                
            if (portNumber != null) {
                console.log("listening on port websocket: ", portNumber);        
                this.port.wss = new WebSocket.Server({ server: this.port.listener });
                this.port.wss.on(
                    'connection',
                    (ws) => {
                        console.log("WS connection started.");
                        ws.isAlive = true;
                        ws.on('pong', 
                            () => {
                                ws.isAlive = true;
                            }
                        );
                        ws.on('message',
                            (message) => {
                                var messageIn = JSON.parse(message);
                                this.onReceivedWebsocketMessage(ws, messageIn);
                                //console.log("WS message in: " + JSON.stringify(message).substr(0,30));
                            }
                        );
                        ws.on('close',
                            (e) => {
                                console.log("WS connection closed. " + JSON.stringify(e));
                                this.onReceivedConnectionClosed(ws);
                            }
                        );
                        ws.send(JSON.stringify({
                            Action: 'StartSession'
                        }));
                    }        
                );
                const intervalPing = setInterval(() => {
                    this.port.wss.clients.forEach((ws) => {
                        if (ws.isAlive === false) return ws.terminate();
                        ws.isAlive = false;
                        ws.ping(() => {});
                    });
                }, 30000);
                this.port.wss.on('close', () => {
                    clearInterval(intervalPing);
                });
            }
            this.port.listener.listen(portNumber);          
            console.log('listening on port: ', portNumber);
        } catch (err) {
            console.error("WebServer - startWebsocketListening - cert file exists: "+ err);
        }
    }

    onReceivedWebsocketMessage(wsIn, messageIn) {
    }

    onReceivedConnectionClosed(wsIn) {
    }

    startUploadListening(portNumber) {
    }

}

class Server {
    constructor(appDir) {
        console.log("Server::constructor()");
        this.appDir = appDir;
        this.config = null;
        this.serverConfig = null;
        this.users = {};
        this.entitlements = {};
        this.items = {};
        this.sessions = {};

        process.on('exit', this.exitHandler);
        process.on('SIGTERM', this.exitHandler);
        process.on('SIGINT', this.exitHandler);     // catches ctrl+c event
        process.on('SIGUSR1', this.exitHandler);    // catches "kill pid" (for example: nodemon restart)
        process.on('SIGUSR2', this.exitHandler);
        process.on('uncaughtException', this.exitHandler);

        this.configure();
        this.model = new Model(this);
        this.webServer = new WebServer(this);
    }

    async start() {
        console.log("Server::start()");
        let databaseOpenedResult  = await this.model.database.openDataDB();
        console.log(databaseOpenedResult);
        this.webServer.start();
    }
    
    async stop() {
        console.log("Server::stop()");
    }

    exitHandler(err) {
    }

    configure() {
        let appConfigFileName = this.appDir+'/config/app.json';
        this.config = JSON.parse(fs.readFileSync(appConfigFileName));
        this.serverConfig = this.config.Executables.find(cur => cur.Type === 'Server').ServerConfig;
    }

}

module.exports = {
    Server: Server
}
