const {
    Client
} = require('../pviclient/index.cjs');
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

export class Engine {
    constructor(id) {
        console.log("Engine::constructor()");
    }

    async start() {

    }

    async stop() {
    }

    exitHandler(err) {
    }

    receivedFromServer(message) {
    }

    forwardToServer(messageIn) {
    }    

    setViewerSpec(viewerSpec) {
    }
}
