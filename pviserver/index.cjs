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
    TrackServer,
    User
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
        this.nextItemkey = null;
    }
    
    openDataDB() {
        let options = {};
        return new Promise(resolve => {
            levelup(leveldown(this.databaseDir + '/'), options, (err, dbHandle) => {
                if (err) throw err;
                this.dbHandle = dbHandle;
                this.dbHandle.get('NextItemKey', (err, value) => {
                    if (err) {
                        if (err.notFound != null) {
                            this.initializeDataDB(resolve);
                        } else {
                           resolve("Database::openDataDB() - NextItemKey - error: " + err);
                        }
                    } else {
                        this.nextItemkey = parseInt(value, 16);
                        this.dbHandle.get('0000000000000001', (err1, value1) => {
                            if (err1) {
                                resolve("Database::openDataDB() - 1 - error: " + err1);
                            } else {
                                let parsedData = JSON.parse(value1);
                                this.parent.itemSeed.dbId = parsedData.DBId;
                                this.parent.itemSeed.id = parsedData.Id;
                                this.parent.itemSeed.ext = parsedData.Ext;
                                this.parent.itemSeed.attrs = parsedData.Attrs;
                                this.parent.itemSeed.childItems = parsedData.ChildItems;
                                resolve("Database::openDataDB() - 1: " + value1);
                            }
                        });
                    }
                });
            });
        });
    }

    initializeDataDB(resolve) {
        console.log('Database::initializeDataDB(): ', this.databaseDir  + '/');
        this.nextItemkey = 1;
        this.parent.itemSeedRaw = {
            DBId: this.nextItemkey.toString(16),
            Id: '1',
            Ext: '',
            Attrs: {},
            ChildItems: {}
        };
        let ops = [];
        ops.push({
            type: 'put', 
            key: this.parent.itemSeedRaw.DBId, 
            value: JSON.stringify(this.parent.itemSeedRaw)
        });
        this.nextItemkey++;
        ops.push({type: 'put', key: 'NextItemKey', 
            value: this.nextItemkey.toString(16)
        });
        this.dbHandle.batch(ops, (err) => {
            if (err) {
                resolve("Database::initializeDataDB - dbData.batch: " + err);
            } else {
                resolve("Database::initializeDataDB - dbData.batch loaded ");
            }
        });
    }
    
}

class Session {
    constructor(parent, id, ws) {
        this.parent = parent;
        this.id = id;
        this.ws = ws;
        this.user = null;
        this.model = this.parent.model;
        this.schemaSent = false;
        this.nodesWatched = {};
        this.trackMain = new TrackServer(this, '1');
        this.tracks = {};
        this.receiveMessage = this.receiveMessage.bind(this);
        this.forwardMessage = this.forwardMessage.bind(this);
    }
    
    receiveMessage(message) {
        if (message.AppId != null && message.Action != null) {
            console.log("Session::receiveMessage: ", message);
            switch (message.Action) {
                case 'SendViewerSpec':
                    let viewerSpecCur = this.parent.config.Executables.find(cur => cur.Name === message.AppId && cur.Type === 'Viewer');
                    if (viewerSpecCur != null) {
                        this.forwardMessage({Action: 'ReceiveViewerSpec', ViewerSpec: viewerSpecCur});
                    }
                    break;
                case 'SendEntitlement':
                    if (message.UserId != null && message.TrackId != null) {
                        if (this.model.users[message.UserId] != null) {
                            let entitlementCur = this.model.users[message.UserId].entitlements[0];
                            this.trackMain.setUseCase(this.model.useCases[entitlementCur.UseCase]);
                            this.trackMain.setItem(this.model.getItem(entitlementCur.ItemPath));
                            this.forwardMessage({
                                Action: 'ReceiveEntitlement',
                                TrackId: message.TrackId,
                                //UseCase: this.model.useCases[entitlementCur.UseCase].spec,
                                //Item: this.model.getItem(entitlementCur.ItemPath)
                                Template: this.trackMain.template.getSpec()
                            });
                        }
                    }
                    break;
                case 'UpdateItem':
                    this.model.putItem(message.ItemPath, message.Item);
                    break;
                case 'WatchItem':
                    break;
                case 'UnWatchItem':
                    break;
                default:
                    break;        

            }
        }
    }
    
    forwardMessage(messageIn) {
        //console.log("Session::forwardMessage ");
        if (this.ws != null) {
            let messageOut = {
                SessionId: this.id,
                ...messageIn
            };
            this.ws.send(JSON.stringify(messageOut));
        }
    }
    
    close() {
        console.log("Session::close: ", this.id);
        for (let nodeCur in this.nodesWatched) {
            let nodeDetail = this.nodesWatched[nodeCur];
            delete nodeDetail.SessionsWatching[this.id];
        }
    }
    
}

class Model {
    constructor(parent) {
        this.parent = parent;
        this.appName = this.parent.config.AppName;
        this.classes = {};
        this.useCases = {};
        this.users = {};
        this.itemSeed = new Item(this, '0000000000000001', '1');
        this.initializeClasses();
        this.initializeUseCases();
        this.initializeUsers();
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

    initializeUsers() {
        let usersDir = this.parent.appDir + '/' + this.parent.config.ModelUsers.Dir;
        let usersFiles = this.parent.config.ModelUseCases.Files;
        usersFiles.forEach(fileCur => {
            let filePathCur = usersDir + '/' + fileCur;
            let usersFileCurContent = JSON.parse(fs.readFileSync(filePathCur));
            console.log("Model::initializeUsers - file: ", usersFileCurContent.Name);
            usersFileCurContent.Users.forEach(userCur => {
                console.log("    ", userCur.UserId);
                this.users[userCur.UserId] = new User(this, userCur);
            });
        });
    }    

    getItem(path) {
        
    }

    putItem(path, item) {
        let ops = [];
        if (item.ChildItems != null && item.Attrs != null) {
            this.buildPutBatch(ops, this.itemSeed, item);
        }
        this.database.dbHandle.batch(ops, (err) => {
            if (err) {
                console.log("Model::putItem: ", err);
            } else {
                // Push to watchers
            }
        });
    }

    buildPutBatch(ops, itemBase, itemIn) {
        console.log("Model::buildPutBatch");
        let isChanged = false;
        for (let childAttrInCur in itemIn.ChildItems) {
            console.log("Model::buildPutBatch: childAttrInCur: ", childAttrInCur);
            let childAttrInDetail = itemIn.ChildItems[childAttrInCur];
            childAttrInDetail.forEach(childAttrInSubItem =>{
                console.log("Model::buildPutBatch: childAttrInSubItem.Id: ", childAttrInSubItem.Id);
                console.log(childAttrInSubItem);
                if (itemBase.childItems[childAttrInCur] == null) {
                    itemBase.childItems[childAttrInCur] = {
                        List: [],
                        ListDBIds: []
                    };
                }
                let childListItem = itemBase.childItems[childAttrInCur].List.find(cur => cur.Id === childAttrInSubItem.Id);
                if (childListItem == null) {
                    let dbKey = this.database.nextItemkey.toString(16).padStart(16, '0')
                    this.database.nextItemkey++;
                    childListItem = new Item(this, dbKey, childAttrInSubItem.Id);
                    itemBase.childItems[childAttrInCur].List.push(childListItem);
                    itemBase.childItems[childAttrInCur].ListDBIds.push(dbKey);
                }
                // Recurse
                if (childAttrInSubItem.ChildItems != null && childAttrInSubItem.Attrs != null) {
                    this.buildPutBatch(ops, childListItem, childAttrInSubItem);
                }
            });
            if (itemBase.childItems[childAttrInCur] != null) {
                ops.push({
                    type: 'put', 
                    key: itemBase.dbId + childAttrInCur, 
                    value:  JSON.stringify(itemBase.childItems[childAttrInCur].ListDBIds)
                });
            }
        }
        for (let attrInCur in itemIn.Attrs) {
            isChanged = true;
            itemBase.attrs[attrInCur] = itemIn.Attrs[attrInCur];
        }
        if (itemIn.Ext != null && itemIn.Ext != itemBase.Ext) {
            isChanged = true;
            itemBase.ext = itemIn.Ext;
        }
        if (isChanged) {
            let itemBaseRaw = {
                DBId: itemBase.dbId,
                Id: itemBase.id,
                Ext: itemBase.ext,
                Attrs: itemBase.attrs,
                ChildItems: {}
            };
            ops.push({
                type: 'put', 
                key: itemBaseRaw.DBId, 
                value: JSON.stringify(itemBaseRaw)
            });
        }
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
        console.log("WebServer::start()");
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
        let sessionId;
        let sessionCur = null;
        let wsConnection = this.wsConnections.find( ({ ws }) => ws === wsIn );
        if (wsConnection === undefined) {
            var dateISO = new Date().toISOString();
            var dateString = dateISO[2]+dateISO[3] + dateISO[5]+dateISO[6] + dateISO[8]+dateISO[9] +
                dateISO[11]+dateISO[12] + dateISO[14]+dateISO[15] + dateISO[17]+dateISO[18];
            do {
                sessionId = dateString + randomstring.generate({length:20});
            } while (this.parent.sessions[sessionId] != null);
            sessionCur = new Session(this.parent, sessionId, wsIn);
            this.parent.sessions[sessionId] = sessionCur
            this.wsConnections.push({ws: wsIn, sessionId: sessionId});
        } else {
            if (this.parent.sessions[wsConnection.sessionId] != null) {
                sessionCur = this.parent.sessions[wsConnection.sessionId];
            }
        }
        if (sessionCur != null) {
            sessionCur.receiveMessage(messageIn);
        }
    }

    onReceivedConnectionClosed(wsIn) {
        let sessionCur = null;
        for (sessionCur in this.parent.sessions) {
            let sessionDetail = this.parent.sessions[sessionCur];
            if (sessionDetail != null && sessionDetail.ws === wsIn) {
                sessionDetail.close();
                break;
            }
        }
        if (sessionCur != null) {
            delete this.parent.sessions[sessionCur];
        }
    }

    startUploadListening(portNumber) {
        console.log("WebServer - startUploadListening: ", portNumber);
        this.portUpload = {};
        this.portUpload.express = express();
        this.portUpload.express.use(bodyParser.urlencoded({extended: true}));
        this.portUpload.express.use(fileUpload({useTempFiles: true, tempFileDir: '/tmp/'}));
        try {
            let privKeyFile = this.keyFileDir + 'privkey.pem';
            let certFile = this.keyFileDir + 'fullchain.pem';
            if (fs.existsSync(privKeyFile)) {
                this.portUpload.listener = https.createServer({
                    key: fs.readFileSync(privKeyFile),
                    cert: fs.readFileSync(certFile)
                }, this.portUpload.express);
            } else {
                this.portUpload.listener = http.createServer({}, this.portUpload.express);
            }                
            this.portUpload.listener.listen(portNumber);          
            console.log('listening on port: ', portNumber);
        } catch (err) {
            console.error("WebServer - startUploadListening - cert file exists: "+ err);
        }
            
        /* Types of REST endpoints, as specified in ServerConfig (like ClientConfig) Server.models[].app:
         * - File Upload to store
         * - File Dowload with session token
         * - File Dowload without session token - for public static file content
         *   SSE server side events to push updates to engine
         * - REST Endpoint:
         *   .. Generic service 
         *   .. QB Desktop - uses SSE to notify engine client that a QB desktop has connected
         * - WebRTC Signaling 
         * - WebRTC STUN
         * - WebRTC TURN
        */
        
        /* Post data and/or files */
        this.portUpload.express.post('/', (req, res) => {
            console.log("app.post /: ", req.body)
            for (var fileCur in req.files) {
                var fileDetail = req.files[fileCur];
                console.log("app.post / fileDetail: ", fileDetail);
                console.log("File: ", this.parent.serverConfig.UploadDir + fileDetail.name);
                fileDetail.mv(this.parent.serverConfig.UploadDir + fileDetail.name, (err) => {
                    if (err) {
                        console.log("fileDetail.mv err: ", err);
                        //return res.status(500).send(err);
                    }
                });                    
            }
        });
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
