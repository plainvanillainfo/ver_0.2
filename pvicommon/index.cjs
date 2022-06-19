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
    constructor(parent) {
        this.parent = parent;
        this.attrs = {};
        this.sessionsWatching = [];
    }
}

class Template {
    constructor(parent) {
        this.parent = parent;
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

class Track {
    constructor(parent, id) {
        console.log("Track::constructor - id: ", id);
        this.parent = parent;
        this.id = id;
        this.useCase = null;
    }

    setUseCase(useCase) {
        console.log("Track::setUseCase: ", useCase);
        this.useCase = useCase;
        this.parent.elementTracks.appendChild(document.createTextNode(JSON.stringify(useCase)));


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
    Track
}
