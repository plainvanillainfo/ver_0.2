const jsesc = require("jsesc")

class Attribute {
    constructor(parent) {
        this.parent = parent;
    }
}

class AttributeComponent extends Attribute {
    constructor(parent) {
        super(parent);
    }
}

class AttributeComponentPrimitive extends AttributeComponent {
    constructor() {
        super();
    }
}

class AttributeComponentEmbedded extends AttributeComponent {
    constructor(parent, pviClass) {
        super(parent);
        this.pviClass = pviClass;
    }
}

class AttributeReference extends Attribute {
    constructor(parent, pviClass) {
        super(parent);
        this.pviClass = pviClass;
    }
}

class AttributeChild extends Attribute {
    constructor(parent, pviClass) {
        super(parent);
        this.pviClass = pviClass;
    }
}

class AttributeExtension extends Attribute {
    constructor(parent, pviClass) {
        super(parent);
        this.pviClass = pviClass;
    }
}

class PVIClass {
    constructor(parent, attributes, isExtension) {
        this.parent = parent;
        this.attributes = attributes;
        this.isExtension = isExtension;
        this.extensions = {};
    }
}

class UseCase {
    constructor(parent, spec) {
        this.parent = parent;
        this.spec = spec;
        this.elems = {};
        if (this.parent.classes != null && this.parent.classes[this.spec.ClassPath] != null) {
            this.pviClass = this.parent.classes[this.spec.ClassPath];
        } else {
            this.pviClass = null;
        }
        this.spec.Elems.forEach(elemCur => {
            this.elems[elemCur.Name] = new UseCaseElem(this, elemCur);
        });
    }
}

class UseCaseElem {
    constructor(parent, spec) {
        this.parent = parent;
        this.spec = spec;
        this.path = [];
        this.attribute = null;
        if (this.parent.pviClass != null) {
            this.attribute = this.parent.pviClass.attributes.find(cur => cur.Name === this.spec.Path.Attribute);
        }
    }
}

/*
class ItemAttr {
    constructor(parent) {
        this.parent = parent;
    }
}

class ItemAttrComponent extends ItemAttr {
    constructor(parent) {
        super(parent);
    }
}

class ItemAttrComponentPrimitive extends ItemAttrComponent {
    constructor(parent) {
        super(parent);
    }
}

class ItemAttrComponentEmbedded extends ItemAttrComponent {
    constructor(parent) {
        super(parent);
    }
}

class ItemAttrReference extends ItemAttr {
    constructor(parent) {
        super(parent);
    }
}

class ItemAttrChild extends ItemAttr {
    constructor(parent) {
        super(parent);
        this.levels = 1;
        this.nodes = {};
    }
}

class ItemAttrExtension extends ItemAttr {
    constructor(parent) {
        super(parent);
    }
}
*/

class Item {
    constructor(parent, dbId, id) {
        this.parent = parent;
        this.dbId = dbId;
        this.id = id;
        this.rawData = null;
        this.attrs = {};
        this.ext = '';
        this.primitives = {};
        this.embededItems = {};
        this.referedItems = {};
        this.entensionItems = {};
        this.childItems = {};
        this.sessionsWatching = [];
    }

    getItemSpec() {
        let childItemsLocal = {};
        for (let childAttrCur in this.childItems) {
            childItemsLocal[childAttrCur] = this.childItems[childAttrCur].ListDBIds;
        }
        return {
            DBId: this.dbId,
            Id: this.id,
            Ext: this.ext,
            Attrs: this.attrs,
            ChildItems: childItemsLocal
        }
    }

    getChildItems(name) {
        let retVal;
        console.log("Item::getChildItems:", name, this.childItems[name]);
        if (this.childItems[name] != null) {
            retVal = this.childItems[name];
        } else {
            retVal = [];
        }
        return retVal;
    }

}

class Template {
    constructor(parent) {
        this.parent = parent;
        this.useCase = null;
        this.item = {};
        this.elems = {};
    }

    setUseCase(useCase) {
        console.log("Template::setUseCase: Name ", useCase.spec.Name);
        this.useCase = useCase;
    }

    setItem(item) {
        console.log("Template::setItem: ", item);
        this.item = item;
    }

    getElems() {
        let retval = {};
        for (let elemCur in this.useCase.elems) {
            let elemDetail = this.useCase.elems[elemCur];
            retval[elemCur] = this.getElemFromPath(this.item, elemDetail);
        }
        return retval;
    }

    getElemFromPath(item, useCaseElem) {
        let retVal = '';
        // .  ../..  ../Abc.
        if (useCaseElem.attribute != null) {
            switch (useCaseElem.attribute.Type) {
                case 'Component':
                    switch (useCaseElem.attribute.Subtype) {
                        case 'Primitive':
                            if (item.attrs[useCaseElem.attribute.Name] != null) {
                                retVal = item.attrs[useCaseElem.attribute.Name]
                            }
                            break;
                        case 'Embedded':
                            // Need recursive call
                            break;
                        default:
                            break;
                    }
                    break;
                case 'Reference':
                    if (item.attrs[useCaseElem.attribute.Name] != null) {
                        retVal = item.attrs[useCaseElem.attribute.Name]
                    }
                    break;
                case 'Child':
                    break;
                case 'Extension':
                    // Need recursive call
                    break;
                default:
                    break;
            }
        }
        return retVal;
    }

}

class TemplateServer extends Template {
    constructor(parent) {
        super(parent);
        this.model = this.parent.model;
        this.forwardToClient = this.forwardToClient.bind(this);
    }

    fromClient(message) {
        console.log("TemplateServer::fromClient(): ", message);
        if (message.Action != null) {
            switch (message.Action) {
                case 'StartTemplateElem':
                    if (message.TemplateElem != null && message.TemplateElem.UseCaseElemName != null) {
                        let templateElemNew = new TemplateElemServer(this, this.useCase.elems[message.TemplateElem.UseCaseElemName]);
                        this.elems[message.TemplateElem.UseCaseElemName] = templateElemNew;
                        templateElemNew.start();
                    }
                    break;
                default:
                    break;
            }
        }
    }

    forwardToClient(messageIn) {
        let messageOut = {
            Action: 'ContinueTemplate',
            Template: {
                UseCaseName: this.useCase.spec.Name,
                ItemId: this.item != null ? this.item.id : '1',
                ...messageIn
            }
        };
        this.parent.forwardToClient(messageOut);
    }

    setUseCase(useCase) {
        console.log("TemplateServer::setUseCase: ");
        super.setUseCase(useCase);
    }

    setItem(item) {
        console.log("TemplateServer::setItem: ", item.dbId, item.id);
        this.item = item;
    }

}

class TemplateClient extends Template {
    constructor(parent) {
        super(parent);
        this.client = this.parent.client;
        this.forwardToServer = this.forwardToServer.bind(this);
    }

    fromServer(message) {
        console.log("TemplateClient::fromServer(): ", message);
        if (message.Action != null) {
            switch (message.Action) {
                case 'ContinueTemplateElem':
                    if (message.TemplateElem != null && message.TemplateElem.UseCaseElemName != null) {
                        if (this.elems[message.TemplateElem.UseCaseElemName] != null) {
                            this.elems[message.TemplateElem.UseCaseElemName].fromServer(message.TemplateElem);
                        }
                    }
                    break;
                default:
                    break;
            }
        }
    }

    forwardToServer(messageIn) {
        let messageOut = {
            Action: 'ContinueTemplate',
            Template: {
                UseCaseName: this.useCase.spec.Name,
                ItemId: this.item != null ? this.item.id : '1',
                ...messageIn
            }
        };
        this.parent.forwardToServer(messageOut);
    }

    setUseCase(useCase) {
        console.log("TemplateClient::setUseCase: ");
        super.setUseCase(useCase);
    }

    setItem(item) {
        console.log("TemplateClient::setItem: ", item);
        this.item = item;
    }

}

class TemplateWeb extends TemplateClient {
    constructor(parent) {
        super(parent);
    }

    setUseCase(useCase) {
        super.setUseCase(useCase);

        this.nav = document.createElement('nav');
        this.parent.div.appendChild(this.nav);
        this.nav.className = 'navbar navbar-expand-md navbar-dark bg-primary';
        this.divNav = document.createElement('div');
        this.nav.appendChild(this.divNav);
        this.divNav.className = 'container-fluid';

        this.buttonCollapse = document.createElement('button');
        this.divNav.appendChild(this.buttonCollapse);
        this.buttonCollapse.className = 'navbar-toggler';
        this.buttonCollapse.setAttribute("type", "button");
        this.buttonCollapse.setAttribute("data-bs-toggle", "collapse");
        this.buttonCollapse.setAttribute("data-bs-target", "#menuContent");
        this.buttonCollapse.setAttribute("aria-controls", "menuContent");
        this.buttonCollapse.setAttribute("aria-expanded", "false");
        this.buttonCollapse.setAttribute("aria-label", "Toggle navigation");

        this.iconCollapse = document.createElement('span');
        this.buttonCollapse.appendChild(this.iconCollapse);
        this.buttonCollapse.className = 'navbar-toggler-icon';

        this.divMenu = document.createElement('div');
        this.divNav.appendChild(this.divMenu);
        this.divMenu.id = 'menuContent';
        this.divMenu.className = 'collapse navbar-collapse';

        this.ulMenu = document.createElement('ul');
        this.divMenu.appendChild(this.ulMenu);
        this.ulMenu.className = 'navbar-nav me-auto mb-2 mb-md-0';
        this.ulMenu.ItemLIs = [];
        useCase.spec.Elems.forEach( (menuItemCur, menuItemIndex) => {
            let itemLICur = document.createElement('li');
            this.ulMenu.appendChild(itemLICur);
            itemLICur.className = 'nav-item';
            this.ulMenu.ItemLIs.push(itemLICur);
            itemLICur.A = document.createElement('a');
            itemLICur.appendChild(itemLICur.A);
            itemLICur.A.className = 'nav-link';
            itemLICur.A.setAttribute("href", "#");
            itemLICur.A.appendChild(document.createTextNode(menuItemCur.Viewers[0].Label));
            itemLICur.A.addEventListener('click', (event) => {
                event.preventDefault();
                console.log("templateElemCur) - if - click on menu", menuItemCur);
                //alert(menuItemCur.Viewers[0].Label);
                let elemPicked = this.useCase.elems[menuItemCur.Name];
                if (this.elems[menuItemCur.Name] == null) {
                    this.elems[menuItemCur.Name] = new TemplateElemWeb(this, elemPicked);
                }
            });
        });

        this.divTarget = document.createElement('div');
        this.parent.div.appendChild(this.divTarget);


    }

}

class TemplateList {
    constructor(parent) {
        this.parent = parent;
        this.childItemList = [];
    }

    setUseCase(useCase) {
        console.log("TemplateList::setUseCase:", useCase.spec);
        this.useCase = useCase;
    }    

    setChildItemList(childItemList) {
        console.log("TemplateList::setChildItemList");
        this.childItemList = childItemList;
    }    

}

class TemplateListServer extends TemplateList {
    constructor(parent) {
        super(parent);
        this.model = this.parent.model;
        this.forwardToClient = this.forwardToClient.bind(this);
    }

    fromClient(message) {
        console.log("TemplateListServer::fromClient(): ", message);
    }

    forwardToClient(messageIn) {
        let messageOut = {
            Action: 'ContinueTemplateList',
            TemplateList: {
                //UseCaseElemName: this.useCaseElem.spec.Name,
                ...messageIn
            }
        };
        this.parent.forwardToClient(messageOut);
    }

    start() {
        console.log("TemplateListServer::start");
        let listItems = [];
        this.childItemList.ListItems.forEach(cur => {
            let listItemCur = {
                Id: cur.id,
                Ext: cur.ext,
                Attrs: cur.attrs,
                ChildItems: {}
            };
            listItems.push(listItemCur);
        });
        let messageOut = {
            Action: 'StartTemplateList',
            TemplateList: {
                //UseCaseSpec: this.useCase.spec
                ItemList: listItems // this.childItemList.ListDBIds
            }
        };
        this.parent.forwardToClient(messageOut);
    }

}

class TemplateListClient extends TemplateList {
    constructor(parent) {
        super(parent);
        this.client = this.parent.client;
        this.forwardToServer = this.forwardToServer.bind(this);
    }

    fromServer(message) {
        console.log("TemplateListClient::fromServer(): ", message);
    }

    forwardToServer(messageIn) {
        let messageOut = {
            Action: 'StartTemplateElem',
            TemplateList: {
                //UseCaseElemName: this.useCaseElem.spec.Name,
                ...messageIn
            }
        };
        this.parent.forwardToServer(messageOut);
    }

}

class TemplateListWeb extends TemplateListClient {
    constructor(parent) {
        super(parent);
        this.divTarget = this.parent.divTarget;
        this.forwardToServer = this.forwardToServer.bind(this);
    }

    start() {
        console.log("TemplateListWeb::start");
    }

    setListFromServer(listFromServer) {
        this.listFromServer = listFromServer;

        this.listFromServer.forEach(cur => {

            let divCur = document.createElement('div');
            this.divTarget.appendChild(divCur);

            divCur.appendChild(document.createTextNode(cur.Id + ' '));
            for (let attrCur in cur.Attrs) {
                let attrDetail = cur.Attrs[attrCur];
                divCur.appendChild(document.createTextNode(attrDetail.Value + ' '));

            }

        });

    }

}

class TemplateElem {
    constructor(parent, useCaseElem) {
        this.parent = parent;
        this.useCaseElem = useCaseElem;
        //this.itemAttr = {};
        if (this.useCaseElem.spec.Join != null && this.useCaseElem.spec.Join === 'Yes') {
            this.fJoin = true;
        } else {
            this.fJoin = false;
        }
    }

}

class TemplateElemServer extends TemplateElem {
    constructor(parent, useCaseElem) {
        super(parent, useCaseElem);
        this.model = this.parent.model;
        this.itemParent = parent.item;
        this.forwardToClient = this.forwardToClient.bind(this);
        if (this.fJoin) {
            if (useCaseElem.attribute.Type === 'Child') {
                this.templateList = new TemplateListServer(this);
                this.templateList.setUseCase(this.model.useCases[useCaseElem.spec.SubUseCase]);
                this.templateList.setChildItemList(this.itemParent.getChildItems(this.useCaseElem.attribute.Name));
            }
        }
    }

    fromClient(message) {
        console.log("TemplateElemServer::fromClient(): ", message);
    }

    start() {
        console.log("TemplateElemServer::start(): "); //, this.useCaseElem);
        if (this.useCaseElem.attribute.Type === 'Child') {
            if (this.templateList == null && this.useCaseElem.spec.Path.SubUseCase != null) {
                this.templateList = new TemplateListServer(this);
                this.templateList.setUseCase(this.model.useCases[this.useCaseElem.spec.Path.SubUseCase]);
                this.templateList.setChildItemList(this.itemParent.getChildItems(this.useCaseElem.attribute.Name));
                this.templateList.start();
            }
        }
    }

    forwardToClient(messageIn) {
        let messageOut = {
            Action: 'ContinueTemplateElem',
            TemplateElem: {
                UseCaseElemName: this.useCaseElem.spec.Name,
                ...messageIn
            }
        };
        this.parent.forwardToClient(messageOut);
    }

}

class TemplateElemClient extends TemplateElem{
    constructor(parent, useCaseElem) {
        super(parent, useCaseElem);
        this.client = this.parent.client;
        this.itemParent = parent.item;
        this.forwardToServer = this.forwardToServer.bind(this);
        this.forwardToServer({
            Action: 'StartTemplateElem',
            Name: this.useCaseElem.spec.Name
        });
    }

    fromServer(message) {
        console.log("TemplateElemClient::fromServer(): ", message);
        if (message.Action != null) {
            switch (message.Action) {
                case 'StartTemplateList':
                    /*
                    if (this.useCaseElem.attribute.Type === 'Child') {
                        if (this.templateList == null && this.useCaseElem.spec.Path.SubUseCase != null) {
                            this.templateList = new TemplateListCient(this);
                            this.templateList.setUseCase(this.client.useCases[this.useCaseElem.spec.Path.SubUseCase]);
                            this.templateList.start();
                        }
                    }
                    */
                    this.start(message.TemplateList.ItemList);
                    break;
                default:
                    break;
            }
        }
    }

    forwardToServer(messageIn) {
        let messageOut = {
            Action: 'StartTemplateElem',
            TemplateElem: {
                UseCaseElemName: this.useCaseElem.spec.Name,
                ...messageIn
            }
        };
        this.parent.forwardToServer(messageOut);
    }

}

class TemplateElemWeb extends TemplateElemClient{
    constructor(parent, useCaseElem) {
        super(parent, useCaseElem);
        this.divTarget = this.parent.divTarget;
    }

    start(itemList) {
        console.log("TemplateElemWeb::start(): ");
        if (this.useCaseElem.attribute.Type === 'Child') {
            if (this.templateList == null) {
                this.templateList = new TemplateListWeb(this);
                this.templateList.setUseCase(this.client.useCases[this.useCaseElem.spec.Path.SubUseCase]);
                //this.templateList.setChildItemList(this.itemParent.getChildItems(this.useCaseElem.attribute.Name));
                this.templateList.setListFromServer(itemList);
                this.templateList.start();
            }
        }
    }

}

class User {
    constructor(parent, userInfo) {
        this.parent = parent;
        this.userId = userInfo.UserId;
        this.entitlements = userInfo.Entitlements;
    }
}

class Track {
    constructor(parent, id) {
        console.log("Track::constructor - id: ", id);
        this.parent = parent;
        this.id = id;
    }

    setUseCase(useCase) {
        console.log("Track::setUseCase");
        this.template.setUseCase(useCase);
    }

    setItem(item) {
        console.log("Track::setItem");
        this.template.setItem(item);
    }

}

class TrackServer extends Track {
    constructor(parent, trackId) {
        super(parent, trackId);
        this.model = this.parent.model;
        this.template = new TemplateServer(this);
        this.forwardToClient = this.forwardToClient.bind(this);
    }

    fromClient(message) {
        console.log("TrackServer::fromClient(): ", message);
        if (message.Action != null && message.Template != null) {
            switch (message.Action) {
                case 'ContinueTemplate':
                    this.template.fromClient(message.Template);
                    break;
                default:
                    break;
            }
        }
    }

    forwardToClient(messageIn) {
        let messageOut = {
            Action: 'ContinueTrack',
            TrackId: this.id,
            Track: {
                ...messageIn
            }
        };
        this.parent.forwardMessage(messageOut);
    }

    getInitialMessage() {
        return({
            UseCaseSpec: this.template.useCase.spec,
            ItemSpec:  this.template.item.getItemSpec()
        })
    }

}

class TrackClient extends Track {
    constructor(parent, trackId) {
        super(parent, trackId);
        this.client = this.parent;
        this.forwardToServer = this.forwardToServer.bind(this);
    }

    fromServer(message) {
        console.log("TrackClient::fromServer(): ", message);
        if (message.Action != null && message.Template != null) {
            switch (message.Action) {
                case 'ContinueTemplate':
                    this.template.fromServer(message.Template);
                    break;
                default:
                    break;
            }
        }
    }

    forwardToServer(messageIn) {
        let messageOut = {
            TrackId: this.id,
            Action: 'ContinueTrack',
            Track :{
                ...messageIn
            }
        };
        this.parent.forwardToServer(messageOut);
    }

}

class TrackWeb extends TrackClient {
    constructor(parent, trackId, div) {
        super(parent, trackId);
        this.template = new TemplateWeb(this);
        this.div = div;
    }

    setUseCase(useCase) {
        console.log("TrackWeb::setUseCase()");
        super.setUseCase(useCase);
    }

}

class TrackEngine extends TrackClient {
    constructor(parent, trackId, script) {
        super(parent, trackId);
        this.script = script;
        this.template = new Template(this);
        this.batchLoaded = this.batchLoaded.bind(this);
    }

    setUseCase(useCase) {
        super.setUseCase(useCase);
        console.log("TrackEngine::setUseCase - ViewerSpec: ", useCase.spec.Viewers[0].ViewerSpec);
        if (useCase.spec.Viewers[0].ViewerSpec.Format === 'BatchLoader' && this.parent.parent.engineConfig.batchLoader != null) {
            let retData = {};
            this.parent.parent.engineConfig.batchLoader(retData, this.batchLoaded);
        }
    }

    batchLoaded(batchData) {
        let itemSeed = {ChildItems: {}, Attrs: {}, Ext: ''};
        for (let tableCur in batchData) {
            let tableDetail = batchData[tableCur];
            console.log("Table: ", tableCur);
            itemSeed.ChildItems[tableCur] = [];
            tableDetail.forEach(rowCur => {
                console.log("    Row: ", rowCur);
                let itemCur = {Id: rowCur.Id, Attrs: {}, ChildItems: rowCur.ChildItems};
                for (let rowAttrCur in rowCur.Attrs) {
                    let rowAttrDetail = rowCur.Attrs[rowAttrCur];
                    itemCur.Attrs[rowAttrCur] = {Type: 'P', Value: jsesc(rowAttrDetail.Value, {'quotes': 'double'})};
                }
                itemSeed.ChildItems[tableCur].push(itemCur);
            });            


        }

        this.parent.forwardToServer({
            Action: 'UpdateItem',
            TrackId: this.id,
            ItemPath: [],
            Item: itemSeed
        });
    }

}

module.exports = {
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
    User,
    TrackEngine,
    TrackWeb,
    TrackServer
}
