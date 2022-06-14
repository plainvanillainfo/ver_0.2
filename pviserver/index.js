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

class Database {
    constructor(parent, id, dataDir, users) {
        this.parent = parent;
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
    constructor(parent, appDetail, dataDir) {
        this.parent = parent;
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
        let config = {};
        let classes = {};
        let useCases = {};
        let users = {};
        let entitlements = {};
        let items = {};
    }

    async start() {
    }
    
    async stop() {
    }

}
