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
    constructor(parent) {
        this.parent = parent;
        this.attributes = {};
        this.extensions = {};
    }
}

class UseCase {
    constructor(parent) {
        this.parent = parent;
        this.elems = {};
    }
}

class UseCaseElem {
    constructor(parent) {
        this.parent = parent;
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
        this.parent = parent;
        this.id = id;
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
