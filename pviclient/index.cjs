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

class Client {
    constructor(parent) {
        this.parent = parent;
        this.isAuthenticated = false;
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

    checkUserAuthentication() {
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
                    this.elementSignIn = document.getElementById('id_signin');
                    this.elementSignIn.setAttribute("href", viewerSpec.Viewport.Top.SignInUp.CognitoRedirectURI);
                    this.elementSignIn.className = 'dropdown-item';
                    this.elementSignIn.addEventListener('click', (event) => {
                        console.log("click on sign in");
                    });
                    this.elementSignOut = document.getElementById('id_signout');
                    this.elementSignOut.setAttribute("href", viewerSpec.Viewport.Top.SignInUp.CognitoLogoutURI);
                    this.elementSignOut.className = 'dropdown-item';
                    this.elementSignOut.addEventListener('click', (event) => {
                        console.log("click on sign out");
                        this.isAuthenticated = false;
                        this.setUserAccess();
                    });
                    this.checkUserAuthentication();
                }
            }
            if (viewerSpec.Viewport.Tracks != null) {
                this.elementTracks = document.getElementById('id_tracks');
                this.elementTracks.appendChild(document.createTextNode("Main Item"));
                this.elemenTabs = document.getElementById('id_tabs');
                if (viewerSpec.Viewport.Tracks.Tabs != null) {
                } else {
                    this.elemenTabs.style.visibility = 'hidden';
                    this.elemenTabs.style.display = 'none';
                }
                this.elemenTrackCur = document.getElementById('id_track_cur');
            }
            if (viewerSpec.Viewport.Bottom != null) {
                if (viewerSpec.Viewport.Bottom.Image != null) {
                    this.elementBottomImage = document.getElementById('id_bottom_image');
                    this.elementBottomImage.setAttribute("src",viewerSpec.Viewport.Bottom.Image);
                    this.elementBottomImage.setAttribute("width",viewerSpec.Viewport.Bottom.Width);
                    this.elementBottomImage.setAttribute("objectFit",viewerSpec.Viewport.Bottom.ObjectFit);
                    this.elementBottomImage.setAttribute("objectPosition",viewerSpec.Viewport.Bottom.ObjectPosition);
                }
                if (viewerSpec.Viewport.Bottom.CopyrightText != null) {
                    this.elementCopyright = document.getElementById('id_copyright');

                    this.elementCopyright.appendChild(document.createTextNode(viewerSpec.Viewport.Bottom.CopyrightText));

                }
            }
        }
    }

    checkUserAuthentication() {
        if (this.parent.transmitter.websocketBEIsActive === true) {
            this.isAuthenticated = false;
            if (document.location.hash != null) {
                let cognitoData = {};
                let elementsString = decodeURIComponent(document.location.hash.substr(1, document.location.hash.length));
                let params = elementsString.split("&");
                for (let param of params) {
                    let values = param.split("=");
                    cognitoData[values[0]] = values[1];
                }
                if (cognitoData["id_token"] != null) {
                    //let idDecoded = jwt_decode(cognitoData["id_token"], { header: false });
                    let idDecoded = jwt_parse(cognitoData["id_token"]);
                    this.userId = idDecoded.email.toLowerCase();
                    this.isAuthenticated = true;
                }
            }
            this.setUserAccess();
        } else {
            setTimeout(() => { this.checkUserAuthentication(); }, 50);
        }
    }

    jwt_parse(token) {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    }

    setUserAccess() {
        if (this.isAuthenticated === true) {
            this.elementSignIn.style.visibility = 'hidden';
            this.elementSignIn.style.display = 'none';
            this.elementSignOut.style.visibility = 'visible';
            this.elementSignOut.style.display = 'inline';
            initiateTracks();
        } else {
            this.elementSignIn.style.visibility = 'visible';
            this.elementSignIn.style.display = 'inline';
            this.elementSignOut.style.visibility = 'hidden';
            this.elementSignOut.style.display = 'none';
            terminateTracks();
        }
    }

    initiateTracks() {
        this.elementTracks.appendChild(document.createTextNode("Tracks initiated"));
    }

    terminateTracks() {
        this.elementTracks.appendChild(document.createTextNode("Tracks terminated"));
    }

}

let x = {
/*
We need from server the seed menu
Need tab elements for tracks
If only one track, and no ability to spawn tracks, then tabs not needed
Menus are inside tracks
In main content, need breadcrumbs and root Item as the base for the  viewport menu
*/

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

/*
    setTopMenuSign(topNavContent, ViewerSpec) {
        let itemLISign = document.createElement('li');
        topNavContent.MenuUL.appendChild(itemLISign);
        topNavContent.MenuUL.ItemLIs.push(itemLISign);
        itemLISign.A = document.createElement('a');
        itemLISign.appendChild(itemLISign.A);
        itemLISign.A.setAttribute("href", "#");
 
        itemLISign.className = 'nav-item dropdown';
        itemLISign.A.className = 'nav-link dropdown-toggle';
        itemLISign.A.id = "navbarDropdownSign";
        itemLISign.A.setAttribute("role", "button");
        itemLISign.A.setAttribute("data-bs-toggle", "dropdown");
        itemLISign.A.setAttribute("aria-expanded", "false");
 
        let itemImgSign = document.createElement('i');
        itemLISign.A.appendChild(itemImgSign);
        itemImgSign.className = 'bi bi-box-arrow-in-right';
        itemImgSign.style.marginRight = "10px";
        itemLISign.A.appendChild(document.createTextNode("SignIn/Out"));
 
        itemLISign.MenuUL = document.createElement('ul');
        itemLISign.appendChild(itemLISign.MenuUL);
        itemLISign.MenuUL.className = 'dropdown-menu';
        itemLISign.MenuUL.setAttribute("aria-labelledby", "navbarDropdownSign");
        itemLISign.MenuUL.ItemLIs = [];
 
        let subitemLISignIn = document.createElement('li');
        itemLISign.MenuUL.appendChild(subitemLISignIn);
        itemLISign.MenuUL.ItemLIs.push(subitemLISignIn);
 
        subitemLISignIn.A = document.createElement('a');
        subitemLISignIn.appendChild(subitemLISignIn.A);
        subitemLISignIn.A.setAttribute("href", ViewerSpec.CognitoRedirectURI);
        subitemLISignIn.A.appendChild(document.createTextNode("Sign In"));
        subitemLISignIn.A.className = 'dropdown-item';
        subitemLISignIn.A.addEventListener('click', (event) => {
            //event.preventDefault();
            console.log("click on sign in");
        });
 
        let subitemLISignOut = document.createElement('li');
        itemLISign.MenuUL.appendChild(subitemLISignOut);
        itemLISign.MenuUL.ItemLIs.push(subitemLISignOut);
        subitemLISignOut.A = document.createElement('a');
        subitemLISignOut.appendChild(subitemLISignOut.A);
        subitemLISignOut.A.setAttribute("href", ViewerSpec.CognitoLogoutURI);
        subitemLISignOut.A.appendChild(document.createTextNode("Sign Out"));
        subitemLISignOut.A.className = 'dropdown-item';
        subitemLISignOut.A.addEventListener('click', (event) => {
            //event.preventDefault();
            console.log("click on sign out");
        });
    }
 
*/
};

module.exports = {
    Client,
    ClientWeb
}