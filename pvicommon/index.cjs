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
        this.template = new Template(this);
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
        this.div = div;
    }

    setUseCase(useCase) {
        console.log("TrackWeb::setUseCase - ViewerSpec: ");
        super.setUseCase(useCase);
        this.div.appendChild(document.createTextNode(JSON.stringify(useCase.spec)));
    }

}

class TrackEngine extends TrackClient {
    constructor(parent, trackId, script) {
        super(parent, trackId);
        this.script = script;
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
