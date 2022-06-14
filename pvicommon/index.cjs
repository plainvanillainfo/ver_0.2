export class Attribute {
    constructor(parent) {
        this.parent = parent;
    }
}

export class AttributeComponent extends Attribute {
    constructor(parent) {
        super(parent);
    }
}

export class AttributeComponentPrimitive extends AttributeComponent {
    constructor() {
        super();
    }
}

export class AttributeComponentEmbedded extends AttributeComponent {
    constructor(parent, pviClass) {
        super(parent);
        this.pviClass = pviClass;
    }
}

export class AttributeReference extends Attribute {
    constructor(parent, pviClass) {
        super(parent);
        this.pviClass = pviClass;
    }
}

export class AttributeChild extends Attribute {
    constructor(parent, pviClass) {
        super(parent);
        this.pviClass = pviClass;
    }
}

export class AttributeExtension extends Attribute {
    constructor(parent, pviClass) {
        super(parent);
        this.pviClass = pviClass;
    }
}

export class PVIClass {
    constructor(parent) {
        this.parent = parent;
        this.attributes = {};
        this.extensions = {};
    }
}

export class UseCase {
    constructor(parent) {
        this.parent = parent;
        this.elems = {};
    }
}

export class UseCaseElem {
    constructor(parent) {
        this.parent = parent;
        this.path = [];
    }
}

export class ItemAttr {
    constructor(parent) {
        this.parent = parent;
    }
}

export class ItemAttrComponent extends ItemAttr {
    constructor(parent) {
        super(parent);
    }
}

export class ItemAttrComponentPrimitive extends ItemAttrComponent {
    constructor(parent) {
        super(parent);
    }
}

export class ItemAttrComponentEmbedded extends ItemAttrComponent {
    constructor(parent) {
        super(parent);
    }
}

export class ItemAttrReference extends ItemAttr {
    constructor(parent) {
        super(parent);
    }
}

export class ItemAttrChild extends ItemAttr {
    constructor(parent) {
        super(parent);
        this.levels = 1;
        this.nodes = {};
    }
}

export class ItemAttrExtension extends ItemAttr {
    constructor(parent) {
        super(parent);
    }
}

export class Item {
    constructor(parent) {
        this.parent = parent;
        this.attrs = {};
        this.sessionsWatching = [];
    }
}

export class Template {
    constructor(parent) {
        this.parent = parent;
    }
}

export class TemplateList {
    constructor(parent) {
        this.parent = parent;
    }
}

export class TemplateElem {
    constructor(parent) {
        this.parent = parent;
    }
}

export class Track {
    constructor(parent, id) {
        this.parent = parent;
        this.id = id;
    }
}
