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
        this.templatesWatching = [];
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

    getChildItems(model, name, fnCallback) {
        console.log("Item::getChildItems: ", name);
        if (this.childItems[name] != null) {
            fnCallback();
            //return this.childItems[name];
        } else {
            model.getChild([], this, name, fnCallback);
            fnCallback();
            //console.log("Item::getChildItems - END: ", name);
            //return this.childItems[name];
        }
    }

    templatesWatchingPushOrPrune() {
        console.log("Item::templatesWatchingPushOrPrune - this.templatesWatching.length: ", this.templatesWatching.length);
        for (let indexCur = this.templatesWatching.length - 1; indexCur >= 0; indexCur-- ) {
            let templateWatchingPath = [...this.templatesWatching[indexCur]];
            let templateWatchingSession = templateWatchingPath.shift();
            let destNode = templateWatchingSession.accessNode(templateWatchingPath);
            if (destNode == null) {
                console.log("Item::templatesWatchingPushAndPrune - splice session: ", templateWatchingSession.id);
                this.templatesWatching.splice(indexCur, 1);
            } else {
                console.log("Item::templatesWatchingPushAndPrune - destNode.dbPath: ", destNode.dbPath);
                destNode.pushOutData();
            }
        }
    }

}

class Template {
    constructor(parent) {
        this.parent = parent;
        this.track = this.parent.track;
        this.useCase = null;
        this.itemId = null;
        this.item = null;
        this.elems = {};
        this.dbPath = [...this.parent.dbPath];
    }

    setUseCase(useCase) {
        console.log("Template::setUseCase: Name ", useCase.spec.Name);
        this.useCase = useCase;
    }

    setItem(item) {
        console.log("Template::setItem: ", item);
        this.item = item;
        this.dbPath.push(this.item.id);
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

    accessNode(nodePath) {
        console.log("Template::accessNode ");
        let retVal = this;
        if (nodePath.length > 0) {
            let templateElemNameCur = nodePath.shift();
            console.log("Template::accessNode - templateElemNameCur: ", templateElemNameCur);
            if (this.elems[templateElemNameCur] != null) {
                retVal = this.elems[templateElemNameCur].accessNode(nodePath);
            } else {
                retVal = null;
            }
        }
        return retVal;
    }

}

class TemplateServer extends Template {
    constructor(parent) {
        super(parent);
        this.session = this.parent.session;
        this.model = this.parent.model;
        this.forwardToClient = this.forwardToClient.bind(this);
        this.pushOutData = this.pushOutData.bind(this);
    }

    fromClient(message) {
        console.log("TemplateServer::fromClient(): ", message);
        if (message.Action != null) {
            switch (message.Action) {
                case 'StartTemplateElem':
                    if (message.TemplateElem != null && message.TemplateElem.UseCaseElemName != null) {
                        let templateElemNew = new TemplateElemServer(this, this.useCase.elems[message.TemplateElem.UseCaseElemName]);
                        this.elems[message.TemplateElem.UseCaseElemName] = templateElemNew;
                        if (templateElemNew.fJoin == false) {
                            templateElemNew.start();
                        }
                    }
                    break;
                case 'ContinueTemplateElem':
                    if (message.TemplateElem != null && message.TemplateElem.UseCaseElemName != null) {
                        if(this.elems[message.TemplateElem.UseCaseElemName] != null) {
                            this.elems[message.TemplateElem.UseCaseElemName].fromClient(message.TemplateElem);
                        }
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
        super.setItem(item);
        this.item.templatesWatching.push([this.session, this.track, ...this.dbPath]);
    }

    pushOutData() {
        console.log("TemplateServer::pushOutData - item.dbId, id: ", this.session.id, this.item.dbId, this.item.id);
        let messageOut = {
            Action: 'ContinueTemplateSub',
            Template: {
                Action: 'AcceptData',
                Item: {
                    Id: this.item.id,
                    Ext: this.item.ext,
                    Attrs: this.item.attrs,
                    ChildItems: {}
                }
            }
        };
        this.parent.forwardToClient(messageOut);
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
                case 'AcceptData':
                    if (this.item == null) {
                        this.item = new Item(this, null, message.Item.Id);
                    }
                    this.item.attrs = message.Item.Attrs;
                    this.item.ext = message.Item.Ext;
                    this.item.childItems = message.Item.ChildItems;
                    this.setUseCaseForm();
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

    refreshData() {
    }

    setItem(item) {
        console.log("TemplateClient::setItem: ", item);
        super.setItem(item);
    }

    setItemId(itemId) {
        this.itemId = itemId;
    }

}

class TemplateWeb extends TemplateClient {
    constructor(parent) {
        super(parent);
        this.track = this.parent.track;
        this.nav = null;
        this.divTarget = null;

    }

    setUseCase(useCase) {
        super.setUseCase(useCase);

        if (this.itemId != null) {
            let messageOut = {
                Action: 'StartTemplate',
                Template: {
                    UseCaseName: this.useCase.spec.Name,
                    ItemId: this.itemId
                }
            };
            this.parent.forwardToServer(messageOut);
        } else {
            switch (this.useCase.spec.Viewers[0].ViewerSpec.Format) {
                case 'Menu':
                    this.setUseCaseMenu();
                    break;
                case 'Form':
                    this.setUseCaseForm();
                    break;
                default:
                    break;
            }
        }
    }

    setUseCaseForm() {

        if (this.divTarget != null) {
            this.track.div.removeChild(this.divTarget);
        }

        this.divTarget = document.createElement('div');
        this.track.div.appendChild(this.divTarget);
        this.divTarget.style.margin = '10px';
        this.form = document.createElement('form');
        this.divTarget.appendChild(this.form);
        this.formData = {};
        let divCur = document.createElement('div');
        this.form.appendChild(divCur);
        divCur.className = 'mb-3';
        let buttonCur = document.createElement('button');
        divCur.appendChild(buttonCur);
        buttonCur.className = 'btn btn-info';
        buttonCur.setAttribute("type", "button");
        buttonCur.id = 'backbutton';
        buttonCur.style.width = "12em";
        buttonCur.appendChild(document.createTextNode("< Go Back"));
        buttonCur.addEventListener('click', (event) => {
            event.preventDefault();
            this.hideForm();
            /*
            if (this.context.TemplateElem != null && this.context.TemplateElem.joinedViewerSpec != null) {
                this.templateSub = null;
                this.actionNext = 'Sr';
            }
            */
        });
        let fNeedKeyElem = false;
        let keyElemSpec = null;
        let keyElemValue;
        /*
        if (this.viewerSpec.Format === 'Form' && this.viewerSpec.Mask === 'Create') {
            if (this.viewerSpec.KeyElem != null) {
                keyElemSpec = this.elems[this.viewerSpec.KeyElem].elemSpec;
                keyElemValue = keyElemSpec.Va;
                if (keyElemSpec.Va == null || keyElemSpec.Va === '') {
                    fNeedKeyElem = true;
                }
            } else {
                fNeedKeyElem = true;
            }
        }
        */
        let itemAttrs = [];
        let itemAttrCur;
        /*
        for (let attrCur in this.elems) {
            let elemCur = this.elems[attrCur];
            if (elemCur.join === false) {
                itemAttrCur = {
                    Value: elemCur.elemSpec.Va != null ? elemCur.elemSpec.Va : null,
                    viewerSpec: {
                        name: attrCur,
                        Format:  elemCur.elemSpec.Vs != null && elemCur.elemSpec.Vs.Format != null ? elemCur.elemSpec.Vs.Format : '', 
                        Editable: elemCur.elemSpec.Vs != null && elemCur.elemSpec.Vs.Editable != null ? elemCur.elemSpec.Vs.Editable : 'Yes',
                        ValueSet: elemCur.elemSpec.Vs != null && elemCur.elemSpec.Vs.ValueSet != null ? elemCur.elemSpec.Vs.ValueSet : null,
                        Legend: elemCur.elemSpec.Vs != null && elemCur.elemSpec.Vs.Legend != null ? elemCur.elemSpec.Vs.Legend : null,
                        Label: elemCur.elemSpec.Lb,
                        Mask: elemCur.elemSpec.Vs != null && elemCur.elemSpec.Vs.Mask != null ? elemCur.elemSpec.Vs.Mask : null,
                        IsKey: elemCur.elemSpec.Vs != null && elemCur.elemSpec.Vs.IsKey != null ? elemCur.elemSpec.Vs.IsKey : 'No'
                    },
                    Elem: elemCur
                };
                if (fNeedKeyElem === false || itemAttrCur.viewerSpec.IsKey === 'Yes') {
                    itemAttrs.push(itemAttrCur);
                }
            } else {
                if (elemCur.elemSpec.Va != null && elemCur.elemSpec.Va.Ls != null && elemCur.elemSpec.Va.Ls.length > 0) {
                    this.joinItemAttrs(itemAttrs, elemCur.elemSpec.Va.Ls[0].Ts, fNeedKeyElem);
                    
                    if (this.subTree == null) {
                        this.subTree = {
                            Te: {
                                Nm: 'ChildInvestmentAccounts',
                                UC: 'ChildInvestmentAccounts',
                                Ax: 'Co',
                                Tl: {
                                    Ax: 'Sv',
                                    Ls: []
                                }
                            }
                        }
                    }
                    
                    if (elemCur.templateList == null) {
                        elemCur.activate(this.TemplateChildPicked != null ? this.TemplateChildPicked : null);
                    }
                    
                }
            }
        }
        */
        itemAttrs.forEach(itemAttrCur => {
        /*
            let templateElemCur = {Nm: itemAttrCur.viewerSpec.name, Lb: itemAttrCur.viewerSpec.Label};
            divCur = document.createElement('div');
            this.form.appendChild(divCur);
            divCur.style.marginBottom = "10px";
            let labelText = templateElemCur.Lb;
            let labelCur = document.createTextNode(labelText + ": ");
            let labelSpan = document.createElement('span');
            labelSpan.appendChild(labelCur);
            divCur.appendChild(labelSpan);
            labelSpan.style.display = "inline-block";
            labelSpan.style.width = "25%";
            let inputCur;
            let inputLabel;
            if (itemAttrCur.viewerSpec != null && itemAttrCur.viewerSpec.Format != null) {
                switch (itemAttrCur.viewerSpec.Format) {
                    case 'Text':
                        inputCur = document.createElement('input');
                        divCur.appendChild(inputCur);
                        inputCur.setAttribute("type", "input");
                        inputCur.value = itemAttrCur.Value != null ? itemAttrCur.Value : itemAttrCur;
                        inputCur.style.width = '70%';
                        inputCur.addEventListener('blur', (event) => {
                            event.preventDefault();
                            this.formData[event.target.id] = event.target.value
                        });
                        if (itemAttrCur.viewerSpec.Editable != null && itemAttrCur.viewerSpec.Editable.toLowerCase() === 'no') {
                            inputCur.disabled = true;
                        }
                        break;
                    case 'Mask':
                        inputCur = document.createElement('input');
                        divCur.appendChild(inputCur);
                        inputCur.setAttribute("type", "input");
                        if (keyElemSpec != null && itemAttrCur.viewerSpec.name === keyElemSpec.Nm) {
                            let mask = itemAttrCur.viewerSpec.Mask;
                            if (fNeedKeyElem) {
                                inputCur.value = this.itemKey + '-';//'115-123456';
                            } else {
                                inputCur.value = this.itemKey + '-' + itemAttrCur.Value;
                            }
                        } else {
                            inputCur.value = itemAttrCur.Value != null ? itemAttrCur.Value : itemAttrCur;
                        }
                        inputCur.style.width = '70%';
                        if (keyElemSpec != null && itemAttrCur.name === keyElemSpec.Nm) {
                            inputCur.addEventListener('blur', (event) => {
                                event.preventDefault();
                                this.formData[event.target.id] = event.target.value.sustr(4);
                            });
                        } else {
                            inputCur.addEventListener('blur', (event) => {
                                event.preventDefault();
                                this.formData[event.target.id] = event.target.value
                            });
                        }
                        if (itemAttrCur.viewerSpec.Editable != null && itemAttrCur.viewerSpec.Editable.toLowerCase() === 'no') {
                            inputCur.disabled = true;
                        }
                        break;
                    case 'Textarea':
                        inputCur = document.createElement('textarea');
                        divCur.appendChild(inputCur);
                        inputCur.setAttribute("rows", "4");
                        inputCur.value = itemAttrCur.Value != null ? itemAttrCur.Value : itemAttrCur;
                        inputCur.style.width = '70%'; 
                        inputCur.addEventListener('blur', (event) => {
                            event.preventDefault();
                            this.formData[event.target.id] = event.target.value
                        });
                        if (itemAttrCur.viewerSpec.Editable != null && itemAttrCur.viewerSpec.Editable.toLowerCase() === 'no') {
                            inputCur.disabled = true;
                        }
                        break;
                    case 'Checkbox':
                        inputCur = document.createElement('input');
                        divCur.appendChild(inputCur);
                        inputCur.className = 'form-check-input';
                        inputCur.setAttribute("type", "checkbox");
                        if (itemAttrCur.Value != null && itemAttrCur.Value !== "") {
                            inputCur.checked = true
                        } else {
                            inputCur.checked = false;
                        }
                        inputCur.style.marginRight = "1em";
                        inputCur.addEventListener('blur', (event) => {
                            event.preventDefault();
                            this.formData[event.target.id] = event.target.checked;
                        });

                        inputLabel = document.createElement('label');
                        divCur.appendChild(inputLabel);
                        inputLabel.className = 'form-check-label';
                        inputLabel.setAttribute("for", "flexCheckDisabled");
                        if (itemAttrCur.viewerSpec.Legend != null) {
                            inputLabel.appendChild(document.createTextNode(itemAttrCur.viewerSpec.Legend));
                        }
                        break;
                    case 'Date':
                        let divDate = document.createElement('div');
                        divCur.appendChild(divDate);
                        divDate.className = 'input-group date';
                        divDate.style.display = 'inline';
                        
                        inputCur = document.createElement('input');
                        divDate.appendChild(inputCur);
                        inputCur.setAttribute("type", "date");

                        let dateTemp = itemAttrCur.Value != null ? itemAttrCur.Value : '';
                        if (dateTemp > '') {
                            let valueCur = new Date(dateTemp);
                            inputCur.value = valueCur.toISOString().substr(0, 10);
                        }

                        inputCur.style.width = '70%';
                        inputCur.addEventListener('blur', (event) => {
                            event.preventDefault();
                            this.formData[event.target.id] = event.target.value;
                        });
                        
                        let itemImgCal = document.createElement('i');
                        divDate.appendChild(itemImgCal);
                        itemImgCal.className = 'bi bi-calendar';
                        itemImgCal.style.marginLeft = "10px";
                    
                        break;
                    case 'Dropdown':
                        inputCur = document.createElement('select');
                        divCur.appendChild(inputCur);
                        if (itemAttrCur.viewerSpec.ValueSet != null) {
                            itemAttrCur.viewerSpec.ValueSet.forEach(itemCur => {
                                let option = document.createElement('option');
                                inputCur.appendChild(option);
                                option.addEventListener('click', (event) => {
                                    event.preventDefault();
                                    console.log("click on option", itemCur);
                                    this.formData[event.target.id] = event.target.value;
                                });
                                let spanAttr = document.createElement('span');
                                option.appendChild(spanAttr);
                                spanAttr.appendChild(document.createTextNode(itemCur));
                            });
                        }
                        break;
                    case 'DrillDown':
                        inputCur = document.createElement('button');
                        divCur.appendChild(inputCur);
                        inputCur.className = 'btn btn-primary';
                        inputCur.setAttribute("type", "button");
                        inputCur.style.width = "22em";
                        inputCur.appendChild(document.createTextNode(labelText));
                        inputCur.addEventListener('click', (event) => {
                            event.preventDefault();
                            itemAttrCur.Elem.activate();
                        });
                        break;
                    default:
                        break;
                }
            } else {
                inputCur = document.createElement('input');
                divCur.appendChild(inputCur);
                inputCur.setAttribute("type", "input");
                inputCur.value = itemAttrCur.Value != null ? itemAttrCur.Value : '';
                inputCur.style.width = '70%';
                inputCur.addEventListener('blur', (event) => {
                    event.preventDefault();
                    this.formData[event.target.id] = event.target.value
                });
            }
            if (inputCur != null) {
                inputCur.id = templateElemCur.Nm;
            }
            */
        });
        this.useCase.spec.Elems.forEach( (elemCur, menuItemIndex) => {
            divCur = document.createElement('div');
            this.form.appendChild(divCur);
            divCur.style.marginBottom = "10px";
            let labelText = elemCur.Viewers[0].Label;
            let labelCur = document.createTextNode(labelText + ": ");
            let labelSpan = document.createElement('span');
            labelSpan.appendChild(labelCur);
            divCur.appendChild(labelSpan);
            labelSpan.style.display = "inline-block";
            labelSpan.style.width = "25%";
            let inputCur;
            let inputLabel;
            if (true) {
                inputCur = document.createElement('input');
                divCur.appendChild(inputCur);
                inputCur.setAttribute("type", "input");
                if (this.item != null && this.item.attrs != null && this.item.attrs[elemCur.Name] != null) {
                    inputCur.value = this.item.attrs[elemCur.Name].Value != null ? this.item.attrs[elemCur.Name].Value : '';
                }
                inputCur.style.width = '70%';
                inputCur.addEventListener('blur', (event) => {
                    event.preventDefault();
                    this.formData[event.target.id] = event.target.value
                });
            }
            if (inputCur != null) {
                inputCur.id = elemCur.Name;
            }
        });
        divCur = document.createElement('div');
        this.form.appendChild(divCur);
        divCur.className = 'mb-3';
        buttonCur = document.createElement('button');
        divCur.appendChild(buttonCur);
        buttonCur.className = 'btn btn-danger';
        buttonCur.setAttribute("type", "button");
        buttonCur.id = 'cancelbutton';
        buttonCur.style.width = "12em";
        buttonCur.style.marginLeft = '25%';
        buttonCur.style.marginRight = '30px';
        buttonCur.appendChild(document.createTextNode("Cancel"));
        buttonCur.addEventListener('click', (event) => {
            event.preventDefault();
            this.hideForm();
        });
        buttonCur = document.createElement('button');
        divCur.appendChild(buttonCur);
        buttonCur.className = 'btn btn-success'; 
        buttonCur.setAttribute("type", "button");
        buttonCur.id = 'savebutton';
        buttonCur.style.width = "12em";
        buttonCur.appendChild(document.createTextNode("Save"));
        buttonCur.addEventListener('click', (event) => {
            event.preventDefault();
            this.saveFormData();
            //this.hideForm();
        });
    }

    hideForm() {
        this.track.popBreadcrumb();
        this.track.div.removeChild(this.divTarget);
    }

    saveFormData() {
        let attrs = {};
        let fUpdated = false;
        for (let formAttrCur in this.formData) {
            let formAttrDetail = this.formData[formAttrCur];
            attrs[formAttrCur] = {Type: 'P', Value: formAttrDetail};
            
            fUpdated = true;
        }
        if (fUpdated) {
            let messageOut = {
                Action: 'UpdateItem',
                Template: {
                    ItemDBPath: this.dbPath,
                    ItemData: {
                        Id: this.item != null ? this.item.id : null,
                        Attrs: attrs,
                        ChildItems: {}
                    }
                }
            };
            this.parent.forwardToServer(messageOut);
        }
    }

    setUseCaseMenu() {
        this.nav = document.createElement('nav');
        this.track.div.appendChild(this.nav);
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
        this.useCase.spec.Elems.forEach( (menuItemCur, menuItemIndex) => {
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
                console.log("TemplateWeb::setUseCaseMenu - click on menu item", menuItemCur);
                let elemPicked = this.useCase.elems[menuItemCur.Name];
                this.elems[menuItemCur.Name] = new TemplateElemWeb(this, elemPicked);
            });
        });

        this.divTarget = document.createElement('div');
        this.track.div.appendChild(this.divTarget);
        this.divTarget.style.margin = '10px';
    }

    setVisibility(trueOrFalse) {
        if (trueOrFalse === true) {
            if (this.nav != null) {
                this.nav.style.visibility = 'visible';
                this.nav.style.display = 'flex';
            }
            this.divTarget.style.visibility = 'visible';
            this.divTarget.style.display = 'block';
        } else {
            if (this.nav != null) {
                this.nav.style.visibility = 'hidden';
                this.nav.style.display = 'none';
            }
            this.divTarget.style.visibility = 'hidden';
            this.divTarget.style.display = 'none';
        }
    }

}

class TemplateList {
    constructor(parent) {
        this.parent = parent;
        this.track = this.parent.track;
        this.childItemList = [];
        this.childItemTemplates = {};
        this.dbPath = [...this.parent.dbPath];
    }

    setUseCase(useCase) {
        console.log("TemplateList::setUseCase:", useCase.spec);
        this.useCase = useCase;
    }    

    setChildItemList(itemParent) {
        console.log("TemplateList::setChildItemList");
        this.itemParent = itemParent;
    }    

    accessNode(nodePath) {
        let retVal = this;
        let templateIdCur = nodePath.shift();
        console.log("TemplateList::accessNode - templateIdCur: ", templateIdCur);
        if (this.childItemTemplates[templateIdCur] != null) {
            retVal = this.childItemTemplates[templateIdCur].accessNode(nodePath);
        }
        return retVal;
    }


}

class TemplateListServer extends TemplateList {
    constructor(parent) {
        super(parent);
        this.session = this.parent.session;
        this.model = this.parent.model;
        this.forwardToClient = this.forwardToClient.bind(this);
        this.start = this.start.bind(this);
    }

    fromClient(message) {
        console.log("TemplateListServer::fromClient(): ", message);
        if (message.Action != null) {
            switch (message.Action) {
                case 'StartTemplate':
                    if (message.Template != null && message.Template.ItemId != null) {
                        this.childItemTemplates[message.Template.ItemId] = new TemplateServer(this);
                        let itemCur = this.childItemList.ListItems.find(listItemCur => listItemCur.id === message.Template.ItemId);
                        if (itemCur != null) {
                            this.childItemTemplates[message.Template.ItemId].setItem(itemCur);
                            this.childItemTemplates[message.Template.ItemId].pushOutData();
                        }
                    }
                    break;
                case 'UpdateItem':
                    if (message.Template != null && message.Template.ItemData != null && message.Template.ItemDBPath != null) {
                        if (message.Template.ItemData.Id != null) {
                            let itemCur = this.childItemList.ListItems.find(listItemCur => listItemCur.id === message.Template.ItemData.Id);
                            if (itemCur != null) {
                                if (message.Template.ItemDBPath.length === 1) {
                                    let itemLocal = {
                                        ChildItems: {},
                                        Attrs: {}, 
                                        Ext: ''
                                    };
                                    itemLocal.ChildItems[message.Template.ItemDBPath[0]] = [message.Template.ItemData];
                                    this.model.putItem([], itemLocal);
                                }
                            }
                        }
                    }
                    break;
                default:
                    break;
            }
        }this.model
    }

    forwardToClient(messageIn) {
        let messageOut = {
            Action: 'ContinueTemplateList',
            TemplateList: {
                ...messageIn
            }
        };
        this.parent.forwardToClient(messageOut);
    }

    start() {
        console.log("TemplateListServer::start");
        let listItems = [];
        if (this.childItemList != null && this.childItemList.ListItems != null) {
            this.childItemList.ListItems.forEach(cur => {
                let listItemCur = {
                    Id: cur.id,
                    Ext: cur.ext,
                    Attrs: cur.attrs,
                    ChildItems: {}
                };
                listItems.push(listItemCur);
                //console.log("TemplateListServer::start path: ", [...this.dbPath, cur.id]);
                cur.templatesWatching.push([this.session, this.track, ...this.dbPath, cur.id]);
                //console.log("TemplateListServer::start pathLen: ",cur.templatesWatching.length);
            });
        }
        this.itemParent.templatesWatching.push([this.session, this.track, ...this.dbPath]);
        let messageOut = {
            Action: 'StartTemplateList',
            TemplateList: {
                Action: 'AcceptDataList',
                ItemList: listItems 
            }
        };
        this.parent.forwardToClient(messageOut);
    }

    setChildItemList(itemParent, attributeName, fnCallback) {
        console.log("TemplateElemServer::setChildItemList");
        super.setChildItemList(itemParent);
        this.childItemList = itemParent.getChildItems(this.model, attributeName, fnCallback);
    }    


    pushOutData() {
        //console.log("TemplateListServer::pushOutData - itemParent.dbId, id: ", this.session.id, this.itemParent.dbId, this.itemParent.id);
        let listItems = [];
        if (this.childItemList != null && this.childItemList.ListItems != null) {
            this.childItemList.ListItems.forEach(cur => {
                let listItemCur = {
                    Id: cur.id,
                    Ext: cur.ext,
                    Attrs: cur.attrs,
                    ChildItems: {}
                };
                listItems.push(listItemCur);
                //console.log("TemplateListServer::pushOutData path: ", [...this.dbPath, cur.id]);
                //console.log("TemplateListServer::pushOutData pathLen: ",cur.templatesWatching.length);
            });
        }
        let messageOut = {
            Action: 'ContinueTemplateList',
            TemplateList: {
                Action: 'AcceptDataList',
                ItemList: listItems 
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
        if (message.Action != null) {
            switch (message.Action) {
                case 'ContinueTemplateSub':
                    if (this.templateSub != null && message.Template != null) {
                        this.templateSub.fromServer(message.Template);
                    }
                    break;
                case 'AcceptDataList':
                    if (message.ItemList != null) {
                        this.setListFromServer(message.ItemList);
                    }
                    break;
                default:
                    break;
            }
        }
    }

    forwardToServer(messageIn) {
        let messageOut = {
            Action: 'ContinueTemplateList',
            TemplateList: {
                UseCaseName: this.useCase.spec.Name,
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
        this.track = this.parent.track;
    }

    start() {
        console.log("TemplateListWeb::start");
    }

    setListFromServer(listFromServer) {
        this.listFromServer = listFromServer;
        let child = this.divTarget.lastElementChild; 
        while (child) {
            this.divTarget.removeChild(child);
            child = this.divTarget.lastElementChild;
        }

        let divTableWrapper = document.createElement('div');
        this.divTarget.appendChild(divTableWrapper);
        divTableWrapper.className = 'table-wrapper';

        let divTitle = document.createElement('div');
        divTableWrapper.appendChild(divTitle);
        divTitle.className = 'table-title';

        let divTitleRow = document.createElement('div');
        divTitle.appendChild(divTitleRow);
        divTitleRow.className = 'row';

        let divTitleRowTitle = document.createElement('div');
        divTitleRow.appendChild(divTitleRowTitle);
        divTitleRowTitle.className = 'col-sm-10';
        
        let tableCaption = document.createElement('h3');
        divTitleRowTitle.appendChild(tableCaption);
        tableCaption.appendChild(document.createTextNode(this.useCase.spec.Viewers[0].Label));

        let divTitleRowAddButton = document.createElement('div');
        divTitleRow.appendChild(divTitleRowAddButton);
        divTitleRowAddButton.className = 'col-sm-2';
        
        let buttonAdd = document.createElement('button');
        divTitleRowAddButton.appendChild(buttonAdd);
        buttonAdd.className = 'btn btn-info add-new';
        buttonAdd.addEventListener('click', (event) => {
            event.preventDefault();
            console.log("TemplateListWeb - Add New");
            this.templateSub = new TemplateWeb(this);
            if (this.useCase.spec.Viewers[0].ViewerSpec.SubUseCase != null) {
                let useCaseSub = this.client.useCases[this.useCase.spec.Viewers[0].ViewerSpec.SubUseCase]
                this.templateSub.setUseCase(useCaseSub);
                this.track.pushBreadcrumb(this.templateSub);
            }
        });
       
        let iconAdd = document.createElement('i');
        divTitleRowTitle.appendChild(iconAdd);
        iconAdd.className = 'fa fa-plus';
        buttonAdd.appendChild(iconAdd);
        buttonAdd.appendChild(document.createTextNode('Add New'));

        this.tableList = document.createElement('table');
        divTableWrapper.appendChild(this.tableList);
        this.tableList.className = 'table table-hover table-striped caption-top table-responsive';

        let tableHead = document.createElement('thead');
        this.tableList.appendChild(tableHead);
        this.tableHeadRow = document.createElement('tr');
        tableHead.appendChild(this.tableHeadRow);
        this.tableBody = document.createElement('tbody');
        this.tableList.appendChild(this.tableBody);

        this.useCase.spec.Elems.forEach(elemCur => {
            let tableHeadRowHeader = document.createElement('th');
            this.tableHeadRow.appendChild(tableHeadRowHeader);
            tableHeadRowHeader.setAttribute("scope", "col");
            tableHeadRowHeader.appendChild(document.createTextNode(elemCur.Viewers[0].Label));
        });

        this.listFromServer.forEach(itemCur => {
            let tableItemRow = document.createElement('tr');
            this.tableBody.appendChild(tableItemRow);

            tableItemRow.addEventListener('click', (event) => {
                event.preventDefault();
                console.log("TemplateListWeb - item picked: ", itemCur.Id);
                this.templateSub = new TemplateWeb(this);
                this.templateSub.setItemId(itemCur.Id)
                if (this.useCase.spec.Viewers[0].ViewerSpec.SubUseCase != null) {
                    let useCaseSub = this.client.useCases[this.useCase.spec.Viewers[0].ViewerSpec.SubUseCase]
                    this.templateSub.setUseCase(useCaseSub);
                    this.track.pushBreadcrumb(this.templateSub);
                }
            });

            for (let attrCur in itemCur.Attrs) {
                let attrDetail = itemCur.Attrs[attrCur];
                let tableItemRowCell = document.createElement('td');
                tableItemRow.appendChild(tableItemRowCell);
                tableItemRowCell.appendChild(document.createTextNode(attrDetail.Value));
            }
        });

    }

}

class TemplateElem {
    constructor(parent, useCaseElem) {
        this.parent = parent;
        this.track = this.parent.track;
        this.useCaseElem = useCaseElem;
        this.dbPath = [...this.parent.dbPath, this.useCaseElem.attribute.Name];
        if (this.useCaseElem.spec.Join != null && this.useCaseElem.spec.Join === 'Yes') {
            this.fJoin = true;
        } else {
            this.fJoin = false;
        }
    }

    accessNode(nodePath) {
        console.log("TemplateElem::accessNode");
        let retVal = null;
        if (this.templateList != null) {
            retVal = this.templateList.accessNode(nodePath);
        }
        return retVal;
    }

}

class TemplateElemServer extends TemplateElem {
    constructor(parent, useCaseElem) {
        super(parent, useCaseElem);
        this.session = this.parent.session;
        this.model = this.parent.model;
        this.itemParent = parent.item;
        this.forwardToClient = this.forwardToClient.bind(this);
        this.start = this.start.bind(this);
        if (this.fJoin) {
            if (useCaseElem.attribute.Type === 'Child') {
                this.templateList = new TemplateListServer(this);
                this.templateList.setUseCase(this.model.useCases[useCaseElem.spec.SubUseCase]);
                this.templateList.setChildItemList(this.itemParent, this.useCaseElem.attribute.Name, this.start);
            }
        }
    }

    fromClient(message) {
        console.log("TemplateElemServer::fromClient(): ", message);
        if (message.Action != null) {
            switch (message.Action) {
                case 'ContinueTemplateList':
                    if (this.useCaseElem.attribute.Type === 'Child') {
                        if (this.templateList != null && message.TemplateList != null) {
                            this.templateList.fromClient(message.TemplateList);
                        }
                    }
                    break;
                default:
                    break;
            }
        }
    }

    start() {
        console.log("TemplateElemServer::start(): "); //, this.useCaseElem);
        if (this.useCaseElem.attribute.Type === 'Child') {
            if (this.templateList == null && this.useCaseElem.spec.Path.SubUseCase != null) {
                this.templateList = new TemplateListServer(this);
                this.templateList.setUseCase(this.model.useCases[this.useCaseElem.spec.Path.SubUseCase]);
                this.templateList.setChildItemList(this.itemParent, this.useCaseElem.attribute.Name, this.templateList.start);
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
        let messageOut = {
            Action: 'StartTemplateElem',
            TemplateElem: {
                UseCaseElemName: this.useCaseElem.spec.Name
            }

        };
        this.parent.forwardToServer(messageOut);
    }

    fromServer(message) {
        console.log("TemplateElemClient::fromServer(): ", message);
        if (message.Action != null) {
            switch (message.Action) {
                case 'StartTemplateList':
                    this.start(message.TemplateList.ItemList);
                    break;
                case 'ContinueTemplateList':
                    if (this.templateList != null && message.TemplateList != null) {
                        this.templateList.fromServer(message.TemplateList);
                    }
                    break;
                default:
                    break;
            }
        }
    }

    forwardToServer(messageIn) {
        let messageOut = {
            Action: 'ContinueTemplateElem',
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
        this.track = this.parent.track;
    }

    start(itemList) {
        console.log("TemplateElemWeb::start(): ");
        if (this.useCaseElem.attribute.Type === 'Child') {
            if (this.templateList == null) {
                this.templateList = new TemplateListWeb(this);
                this.templateList.setUseCase(this.client.useCases[this.useCaseElem.spec.Path.SubUseCase]);
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
        this.session = this.parent;
        this.track = this;
        this.id = id;
        this.isClosed = false;
        this.dbPath = [];
    }

    setUseCase(useCase) {
        console.log("Track::setUseCase");
        this.template.setUseCase(useCase);
    }

    setItem(item) {
        console.log("Track::setItem");
        this.template.setItem(item);
    }

    accessNode(nodePath) {
        console.log("Track::accessNode");
        let retVal = null;
        if (this.isClosed == false) {
            nodePath.shift();
            retVal = this.template.accessNode(nodePath);
        }
        return retVal;
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
        this.track = this;
        this.div = div;
        this.breadcrumbs = [];
        this.template = new TemplateWeb(this);
        this.breadcrumbs.push(this.template);

        this.divBreadcrumbs = document.createElement('nav');
        this.div.appendChild(this.divBreadcrumbs);
        this.divBreadcrumbs.setAttribute('aria-label', 'breadcrumb');
        //this.divBreadcrumbs.style.setProperty('--bs-breadcrumb-divider', '>');

        this.olBreadcrumbs = document.createElement('ol');
        this.divBreadcrumbs.appendChild(this.olBreadcrumbs);
        this.olBreadcrumbs.className = 'breadcrumb';

    }

    setUseCase(useCase) {
        console.log("TrackWeb::setUseCase()");
        super.setUseCase(useCase);
        this.showCrumbs();
    }

    pushBreadcrumb(templatePushed) {
        this.breadcrumbs.push(templatePushed);
        this.breadcrumbs[this.breadcrumbs.length-2].setVisibility(false);
        this.showCrumbs();
    }

    popBreadcrumb() {
        this.breadcrumbs[this.breadcrumbs.length-1].setVisibility(false);
        this.breadcrumbs.pop();
        this.breadcrumbs[this.breadcrumbs.length-1].setVisibility(true);
        this.showCrumbs();
    }

    showCrumbs() {
        let child = this.olBreadcrumbs.lastElementChild; 
        while (child) {
            this.olBreadcrumbs.removeChild(child);
            child = this.olBreadcrumbs.lastElementChild;
        }
        this.breadcrumbs.forEach((crumbCur, indexCur) => {
            let liCrumb = document.createElement('li');
            this.olBreadcrumbs.appendChild(liCrumb);

            if (indexCur === (this.breadcrumbs.length-1)) {
                liCrumb.className = 'breadcrumb-item active';
                liCrumb.appendChild(document.createTextNode(crumbCur.useCase.spec.Viewers[0].Label));
            } else {
                liCrumb.className = 'breadcrumb-item';
                let aCrumb = document.createElement('a');
                liCrumb.appendChild(aCrumb);
                aCrumb.setAttribute('href', '#');
                aCrumb.appendChild(document.createTextNode(crumbCur.useCase.spec.Viewers[0].Label));
            }
        });
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
