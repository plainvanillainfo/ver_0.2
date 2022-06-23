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
    }
}

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

class Item {
    constructor(parent, dbId, id) {
        this.parent = parent;
        this.dbId = dbId;
        this.id = id;
        this.rawData = null;
        this.attrs = {};
        this.ext = '';
        this.childItems = {};
        this.sessionsWatching = [];
    }
}

class Template {
    constructor(parent) {
        this.parent = parent;
        this.useCase = null;
        this.item = {};
    }

    setUseCase(useCase) {
        console.log("Template::setUseCase: ", useCase.spec);
        this.useCase = useCase;
    }

    setItem(item) {
        console.log("Template::setItem: ", item);
        this.item = item;
    }

    getSpec() {
        return {UseCaseSpec: this.useCase.spec, ItemSpec: this.item};
    }
}

class TemplateWeb extends Template {
    constructor(parent) {
        super(parent);
    }

    setUseCase(useCase) {
        super.setUseCase(useCase);
        //this.parent.div.appendChild(document.createTextNode(JSON.stringify(useCase.spec)));

        this.nav = document.createElement('nav');
        this.parent.div.appendChild(this.nav);
        this.nav.className = 'navbar navbar-expand-md navbar-dark bg-primary';
        //this.nav.style.color = '#ffffff';
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
                alert(JSON.stringify(menuItemCur.Viewers[0]));
            });
        });


    }

}


class TemplateList {
    constructor(parent) {
        this.parent = parent;
    }
}

class TemplateElem {
    constructor(parent) {
        this.parent = parent;
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
        this.template = new Template(this);
    }

}

class TrackClient extends Track {
    constructor(parent, trackId) {
        super(parent, trackId);
    }

}

class TrackWeb extends TrackClient {
    constructor(parent, trackId, div) {
        super(parent, trackId);
        this.template = new TemplateWeb(this);
        this.div = div;
    }

    setUseCase(useCase) {
        console.log("TrackWeb::setUseCase - ViewerSpec: ");
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
                    itemCur.Attrs[rowAttrCur] = jsesc(rowAttrDetail.Value, {'quotes': 'double'});
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
    User,
    TrackEngine,
    TrackWeb,
    TrackServer
}
