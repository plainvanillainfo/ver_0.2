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
        if (viewerSpec.Viewport != null) {
            if (viewerSpec.Viewport.Top != null) {
                if (viewerSpec.Viewport.Top.Caption != null) {
                    this.elementCaption = document.getElementById('id_caption');
                    this.elementCaption.appendChild(document.createTextNode(viewerSpec.Viewport.Top.Caption));
                }
                if (viewerSpec.Viewport.Top.Logo != null) {
                    this.elementLogo = document.getElementById('id_logo');
                    this.elementLogo.setAttribute("src",viewerSpec.Viewport.Top.Logo.Image);
                    this.elementLogo.setAttribute("width",viewerSpec.Viewport.Top.Logo.Width);
                }
                if (viewerSpec.Viewport.Top.SignInUp != null) {
                    this.elementSignInUp = document.getElementById('id_signinup');
                }
                if (viewerSpec.Viewport.Top.Search != null) {
                    this.elementSearch = document.getElementById('id_search');
                }
                if (viewerSpec.Viewport.Top.Menu != null) {
                    this.elementMenu = document.getElementById('id_menu');
                }
/*
    setTopMenu(topMenu, topNavContent) {
        topNavContent.MenuUL = document.createElement('ul');
        topNavContent.insertBefore(topNavContent.MenuUL, this.viewport.Top.SearchForm);
        topNavContent.MenuUL.className = 'navbar-nav me-auto mb-2 mb-lg-0';
        topNavContent.MenuUL.ItemLIs = [];
        this.signInUp.checkUserAuthentication();
        topMenu.forEach( (menuItemCur, menuItemIndex) => {
            let itemLICur = document.createElement('li');
            topNavContent.MenuUL.appendChild(itemLICur);
            topNavContent.MenuUL.ItemLIs.push(itemLICur);
            itemLICur.A = document.createElement('a');
            itemLICur.appendChild(itemLICur.A);
            itemLICur.A.setAttribute("href", "#");
            itemLICur.A.appendChild(document.createTextNode(menuItemCur.Label));
            if (menuItemCur.Menu == null) {
                itemLICur.className = 'nav-item';
                itemLICur.A.className = 'nav-link';
                itemLICur.A.addEventListener('click', (event) => {
                    event.preventDefault();
                    if (this.signInUp.isAuthenticated) {
                        console.log("templateElemCur) - if - click on menu", menuItemCur);
                        this.tracks[this.trackForeground].menuItemClicked(menuItemCur);
                        if (menuItemCur.UseCase != null) {
                            if (itemLICur.template == null) {
    
                            }
                        }
                    } else {
                        this.signInUp.checkUserAuthentication();
                    }
                });
            } else {
                itemLICur.className = 'nav-item dropdown';
                itemLICur.A.className = 'nav-link dropdown-toggle';
                itemLICur.A.id = "navbarDropdown"+(menuItemIndex+1).toString();
                itemLICur.A.setAttribute("role", "button");
                itemLICur.A.setAttribute("data-bs-toggle", "dropdown");
                itemLICur.A.setAttribute("aria-expanded", "false");

                itemLICur.MenuUL = document.createElement('ul');
                itemLICur.appendChild(itemLICur.MenuUL);
                itemLICur.MenuUL.className = 'dropdown-menu';
                itemLICur.MenuUL.setAttribute("aria-labelledby", "navbarDropdown"+(menuItemIndex+1).toString());
                itemLICur.MenuUL.ItemLIs = [];
                menuItemCur.Menu.forEach(submenuItemCur => {
                    let subitemLICur = document.createElement('li');
                    itemLICur.MenuUL.appendChild(subitemLICur);
                    itemLICur.MenuUL.ItemLIs.push(subitemLICur);
                    subitemLICur.A = document.createElement('a');
                    subitemLICur.appendChild(subitemLICur.A);
                    subitemLICur.A.setAttribute("href", "#");
                    subitemLICur.A.appendChild(document.createTextNode(submenuItemCur.Label));
                    subitemLICur.A.className = 'dropdown-item';
                    subitemLICur.A.addEventListener('click', (event) => {
                        event.preventDefault();
                        if (this.signInUp.isAuthenticated) {
                            console.log("templateElemCur) - else - click on menu", submenuItemCur);
                            this.tracks[this.trackForeground].menuItemClicked(submenuItemCur);
                            if (submenuItemCur.UseCase != null) {
                                if (subitemLICur.template == null) {
    
                                }
                            }
                        } else {
                            this.signInUp.checkUserAuthentication();
                        }
                    });
                });
            }
        });

    }

*/


            }
        }
    }

}

module.exports = {
    Client,
    ClientWeb
}