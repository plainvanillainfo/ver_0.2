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

class SignInUp {
    constructor(parent) {
        this.parent = parent;
    }

    start() {
    }

    checkUserAuthentication() {
    }

}

class Client {
    constructor(parent) {
        this.parent = parent;
        this.signInUp = new SignInUp(this);
    }

    fromServer(message) {
        /*
        if (message.Ax != null) {
            switch (message.Ax) {
                case 'Co':
                    break;
                default:
                    break;
            }
        }
        */
    }

    forwardToServer(messageIn) {
        let messageOut;
        this.parent.forwardToServer(messageOut);
    }

}

module.exports = {
    Client
}