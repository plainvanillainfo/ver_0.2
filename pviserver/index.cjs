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
        console.log("\nWebServer::start()");
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

class Server {
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
        console.log("Server::start()");
        let databaseOpenedResult  = await this.model.database.openDataDB();
        console.log(databaseOpenedResult);
        this.webServer.start();
    }
    
    async stop() {
        console.log("Server::stop()");
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
