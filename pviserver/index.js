import {
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
} from '../pvicommon/index.js';

const fs = require("fs");

class Database {
    constructor(parent, databaseDir) {
        this.parent = parent;
        this.isReady = false;
        this.databaseDir = databaseDir;
        this.dbNameData = 'db_' + this.parent.appName;
    }
    
    start() {
    }

    openDataDB() {
    }

    initializeDataDB() {
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
        this.database = new Database(this, this.parent.serverConfig.DBDir);
    }

    start() {
    }

    receivedFromClient(messageIn, context) {
    }
    
    traverseMessageAtNode(messageIn, context, nodeCur, keyCur, modelPathPos) {
    }
    
    disposeOfMessageAtNode(messageIn, context, node, modelPathPos) {
    }
    
    ensureNodeWatched(node, messageIn, context, shouldAddQueueItem, modelArray) {
    }
    
}

class WebServer {
    constructor(parent) {
        this.parent = parent;
        this.keyFileDir = this.parent.serverConfig.KeyFileDir;
    }

    async start() {
    }

    startWebsocketListening(portNumber) {
    }

    onReceivedWebsocketMessage(wsIn, messageIn) {
    }

    onReceivedConnectionClosed(wsIn) {
    }

    startUploadListening(portNumber) {
    }

}

export class Server {
    constructor(appDir) {
        console.log("Server::constructor()");
        this.appDir = appDir;
        this.config = null;
        this.serverConfig = null;
        this.classes = {};
        this.useCases = {};
        this.users = {};
        this.entitlements = {};
        this.items = {};
        this.sessions = {};
        this.configure();
        this.model = new Model(this);
        this.webServer = new WebServer(this);
    }

    async start() {
        console.log("\nServer::start()");
        this.webServer.start();
    }
    
    async stop() {
        console.log("\nServer::stop()");
    }

    configure() {
        let appConfigFileName = this.appDir+'/config/app.json';
        this.config = JSON.parse(fs.readFileSync(appConfigFileName));
        this.serverConfig = this.config.Executables.find(cur => cur.Type === 'Server').ServerConfig;
    }

}
