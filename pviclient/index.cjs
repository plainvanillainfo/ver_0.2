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
        this.forwardToServer = this.forwardToServer.bind(this);
    }

    fromServer(message) {
        console.log("Client::fromServer()");
        switch (message.Action) {
            case 'StartSession':
                this.forwardToServer({Action: 'SendViewerSpec'});
                break;
            case 'ReceiveViewerSpec':
                this.setViewerSpec(message.ViewerSpec);
                break;
            default:
                break;        
        }
    }

    forwardToServer(messageIn) {
        this.parent.forwardToServer(messageIn);
    }

    setViewerSpec(viewerSpec) {
        console.log("Client::setViewerSpec()");
    }

}

class ClientWeb extends Client {
    constructor(parent) {
        super(parent);
    }

    setViewerSpec(viewerSpec) {
        console.log("ClientWeb::setViewerSpec()");
        this.elementCaption = document.getElementById('id_caption');
        if (viewerSpec.Viewport != null) {
            if (viewerSpec.Viewport.Top != null) {
                if (viewerSpec.Viewport.Top.Caption != null) {
                    this.elementCaption.appendChild(document.createTextNode(viewerSpec.Viewport.Top.Caption));
                }
            }
        }
    }

}

module.exports = {
    Client,
    ClientWeb
}