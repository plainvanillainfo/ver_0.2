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
        this.isClosed = false;
        this.model = this.parent.model;
        //this.schemaSent = false;
        this.classes = {};
        this.useCases = {};
        //this.nodesWatched = {};
        this.trackMain = new TrackServer(this, '1');
        this.tracks = {'1': this.trackMain};
        this.receiveMessage = this.receiveMessage.bind(this);
        this.forwardMessage = this.forwardMessage.bind(this);
    }
    
    receiveMessage(message) {
        if (message.AppId != null && message.Action != null) {
            console.log("\nSession::receiveMessage: ", message);
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
                                Track: this.trackMain.getInitialMessage(),
                                ClassesFileContent: this.model.classesFileContent,
                                UseCasesFileContent: this.model.useCasesFileContent
                            });
                        }
                    }
                    break;
                case 'ContinueTrack':
                    if (message.TrackId != null && message.Track != null && this.tracks[message.TrackId] != null) {
                        this.tracks[message.TrackId].fromClient(message.Track);
                    }
                    break;
                case 'UpdateItem':
                    this.model.putItem([], message.Item);
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
        this.isClosed = true;
    }

    accessNode(nodePath) {
        console.log("Session::accessNode");
        let retVal = null;
        if (this.isClosed == false) {
            let trackCur = nodePath.shift();
            console.log("Session::accessNode - trackCur.id: ", trackCur.id);
            if (this.tracks[trackCur.id] != null) {
                retVal = trackCur.accessNode(nodePath);
            }
        }
        return retVal;
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
        this.classesFileContent = {Classes: []};
        this.useCasesFileContent = {UseCases: []};
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
            classesFileCurContent.Classes.forEach(classCur => {
                this.classesFileContent.Classes.push(classCur);
            });
        });
        this.classesFileContent.Classes.forEach(classCur => {
            //console.log("Model::initializeClasses(); ", classCur.Name);
            this.classes[classCur.Name] = new PVIClass(this, classCur.Attributes, false);
        });
    }

    initializeUseCases() {
        let useCasesDir = this.parent.appDir + '/' + this.parent.config.ModelUseCases.Dir;
        let useCasesFiles = this.parent.config.ModelUseCases.Files;
        useCasesFiles.forEach(fileCur => {
            let filePathCur = useCasesDir + '/' + fileCur;
            let useCasesFileCurContent = JSON.parse(fs.readFileSync(filePathCur));
            useCasesFileCurContent.UseCases.forEach(useCaseCur => {
                this.useCasesFileContent.UseCases.push(useCaseCur);
            });
        });
        this.useCasesFileContent.UseCases.forEach(useCaseCur => {
            //console.log("Model::initializeUseCases(); ", useCaseCur.Name);
            this.useCases[useCaseCur.Name] = new UseCase(this, useCaseCur);
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
        let retVal;
        if (path.length > 1) {
            retVal = this.getItemAtPath(this.itemSeed, [...path]);
        } else {
            retVal = this.itemSeed;
        }
        return retVal;
    }

    getItemAtPath(itemBase, path) {
        let retVal = null;
        let childAttrCur = path.shift();
        if (itemBase.childItems[childAttrCur] != null) {
            let childItemKey = path.shift();
            let itemChild = itemBase.childItems[pathHead].itemAttrChild.nodes[childItemKey];
            if (path > 1) {
                retVal = this.getItemAtPath(itemChild, [...path]);
            } else {
                retVal = itemChild;
            }
        }
        return retVal;
    }

    getChild(path, item, childAttrName) {
        let itemBase = item;
        itemBase = this.itemSeed; 
        let key = itemBase.dbId + childAttrName;
        return new Promise(resolve => {
            this.database.dbHandle.get(key, (err, value) => {
                if (err) {
                    resolve("Model::getChild - error: " + err);
                } else {
                    if (itemBase.childItems[childAttrName] == null) {
                        itemBase.childItems[childAttrName] = {};
                    }
                    itemBase.childItems[childAttrName].ListDBIds = JSON.parse(value);
                    console.log(itemBase.childItems[childAttrName].ListDBIds);
                    this.database.dbHandle.getMany(itemBase.childItems[childAttrName].ListDBIds, (err1, value1) => {
                        if (err1) {
                            resolve("Model::getChild Many - error: " + err1);
                        } else {
                            resolve(JSON.parse(value1));
                        }
                    });
                }
            });
        });
    }

    putItem(path, item) {
        let ops = [];
        let itemsUpdated = [];
        if (item.ChildItems != null && item.Attrs != null) {
            this.buildPutBatchItem(ops, itemsUpdated, this.itemSeed, item);
        }
        console.log("Model::putItem - ops: ", ops);
        this.database.dbHandle.batch(ops, (err) => {
            if (err) {
                console.log("Model::putItem: ", err);
            } else {
                itemsUpdated.forEach(itemCur => {
                    itemCur.templatesWatchingPushOrPrune();
                });
            }
        });
    }

    buildPutBatchItem(ops, itemsUpdated, itemBase, itemDataIn) {
        console.log("Model::buildPutBatchItem: ", itemDataIn);
        this.buildPutBatchNode(ops, itemsUpdated, itemBase, itemDataIn);
        let itemBuiltRaw = {
            DBId: itemBase.dbId,
            Id: itemBase.id,
            Ext: itemBase.ext != null ? itemBase.ext : '',
            Attrs: itemBase.attrs,
            ChildItems: {}
        };
        ops.push({
            type: 'put',
            key: itemBuiltRaw.DBId,
            value: JSON.stringify(itemBuiltRaw)
        });
        itemsUpdated.push(itemBase);
    }

    buildPutBatchNode(ops, itemsUpdated, itemBase, itemDataIn) {
        itemBase.ext = itemDataIn.Ext != null ? itemDataIn.Ext : '';
        for (let attrInCur in itemDataIn.Attrs) {
            let attrInDetail = itemDataIn.Attrs[attrInCur];
            switch (attrInDetail.Type) {
                case 'P':
                    itemBase.attrs[attrInCur] = attrInDetail;
                    break;
                case 'E':
                    itemBase.attrs[attrInCur] = {Type: 'E', Value: this.buildPutBatchNode(ops, attrInDetail.Value)};
                    break;
                case 'R':
                    itemBase.attrs[attrInCur] = attrInDetail;
                    break;
                case 'X':
                    itemBase.attrs[attrInCur] = {Type: 'X', Value: this.buildPutBatchNode(ops, attrInDetail.Value)};
                    break;
                case 'C':
                    break;
                default:
                    break;
            }
        }
        for (let childAttrInCur in itemDataIn.ChildItems) {
            console.log("Model::buildPutBatchNode: childAttrInCur: ", childAttrInCur);
            /*
            // childAttrInCur has to be a concatenation, like:
            // vehicle - front left wheel assembly / tire - nuts
            // vehicle - front right wheel assembly / tire - nuts
            //
            // this is to disambiguate child lists that may have the same immediate name, but descend
            // from different ancestries
            */
            let childAttrInDetail = itemDataIn.ChildItems[childAttrInCur];
            childAttrInDetail.forEach(childAttrInSubItem =>{
                console.log("Model::buildPutBatchNode: childAttrInSubItem.Id: ", childAttrInSubItem.Id);
                console.log(childAttrInSubItem);
                if (itemBase.childItems[childAttrInCur] == null) {
                    itemBase.childItems[childAttrInCur] = {
                        ListItems: [],
                        ListDBIds: []
                    };
                }
                let childListItem = itemBase.childItems[childAttrInCur].ListItems.find(cur => cur.id === childAttrInSubItem.Id);
                if (childListItem == null) {
                    let dbKey = this.database.nextItemkey.toString(16).padStart(16, '0')
                    this.database.nextItemkey++;
                    //
                    // Create child item
                    //
                    childListItem = new Item(this, dbKey, childAttrInSubItem.Id);

                    itemBase.childItems[childAttrInCur].ListItems.push(childListItem);
                    itemBase.childItems[childAttrInCur].ListDBIds.push(dbKey);
                } else {
                    if (childAttrInSubItem.Ext != null) {
                        childListItem.ext = childAttrInSubItem.Ext;
                    }
                    if (childAttrInSubItem.Attrs != null) {
                        for (let attrCur in childAttrInSubItem.Attrs) {
                            let attrDetail = childAttrInSubItem.Attrs[attrCur];
                            childListItem.attrs[attrCur] = attrDetail;
                        }
                    }
                }
                //
                // Call recursively for child item
                //
                if (childAttrInSubItem.ChildItems != null && childAttrInSubItem.Attrs != null) {
                    this.buildPutBatchItem(ops, itemsUpdated, childListItem, childAttrInSubItem);
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
