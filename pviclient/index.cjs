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
    Track,
    User
} = require('../pvicommon/index.cjs');

class Client {
    constructor(parent) {
        this.parent = parent;
        this.isAuthenticated = false;
        this.forwardToServer = this.forwardToServer.bind(this);
        this.useCases = {};
        this.tracks = {};
        this.item = null;
    }

    fromServer(message) {
        console.log("Client::fromServer(): ", message.Action);
        switch (message.Action) {
            case 'StartSession':
                this.forwardToServer({Action: 'SendViewerSpec'});
                break;
            case 'ReceiveViewerSpec':
                this.setViewerSpec(message.ViewerSpec);
                break;
            case 'ReceiveEntitlement':
                this.setEntitlement(message.TrackId, message.UseCase, message.Item);
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

    setEntitlement(trackId, useCase, item, viewerName) {
        console.log("Client::setEntitlement()");
        this.item = item;
        //this.useCases[useCase.Name] = useCase;
        let useCaseSpec = useCase;
        if (useCaseSpec.Viewers != null) {
            let viewerCur = useCaseSpec.Viewers.find(cur => cur.Name === viewerName);
            useCaseSpec.Viewers = viewerCur != null ? [viewerCur] : [];
        }
        useCaseSpec.Elems.forEach(elemCur => {
            if (elemCur.Viewers != null) {
                let elemViewerCur = elemCur.Viewers.find(cur => cur.Name === viewerName);
                elemCur.Viewers = elemViewerCur != null ? [elemViewerCur] : [];
            }
        });
        this.useCases[useCase.Name] = new UseCase(this, useCaseSpec);
        this.tracks[trackId].setUseCase(this.useCases[useCase.Name]);
        this.tracks[trackId].setItem(this.item);
    }

    checkUserAuthentication() {
    }

    setUserAccess() {
    }

    initiateTracks(trackFirst) {
        this.tracks[trackFirst.id] = trackFirst;
        if (this.driverUseCase != null) {
            this.forwardToServer({
                Action: 'SendEntitlement',
                TrackId: trackFirst.id,
                UserId: this.userId
            });
        }
    }

    terminateTracks() {
    }

}

class ClientWeb extends Client {
    constructor(parent, name) {
        super(parent);
        this.name = name;
    }

    setViewerSpec(viewerSpec) {
        console.log("ClientWeb::setViewerSpec()");
        if (viewerSpec.DriverUseCase != null) {
            this.driverUseCase = viewerSpec.DriverUseCase;
        }
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
                    this.elementSignIn.addEventListener('click', (event) => {
                        console.log("click on sign in");
                    });
                    this.elementSignOut = document.getElementById('id_signout');
                    this.elementSignOut.setAttribute("href", viewerSpec.Viewport.Top.SignInUp.CognitoLogoutURI);
                    this.elementSignOut.addEventListener('click', (event) => {
                        console.log("click on sign out");
                        this.isAuthenticated = false;
                        this.setUserAccess();
                    });
                }
            }
            if (viewerSpec.Viewport.Tracks != null) {
                this.elementTracks = document.getElementById('id_tracks');
                this.elemenTabs = document.getElementById('id_tabs');
                if (viewerSpec.Viewport.Tracks.Tabs == null) {
                    this.elemenTabs.style.visibility = 'hidden';
                    this.elemenTabs.style.display = 'none';
                }
                this.elementTrackFront = document.getElementById('id_track_front');
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
            if (viewerSpec.Viewport.Top != null) {
                if (viewerSpec.Viewport.Top.SignInUp != null) {
                    this.checkUserAuthentication();
                }
            }
        }
    }

    setEntitlement(trackId, useCase, item) {
        console.log("ClientWeb::setEntitlement()");
        super.setEntitlement(trackId, useCase, item, this.name);
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
                    let idDecoded = this.jwt_parse(cognitoData["id_token"]);
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
            this.initiateTracks();
        } else {
            this.elementSignIn.style.visibility = 'visible';
            this.elementSignIn.style.display = 'inline';
            this.elementSignOut.style.visibility = 'hidden';
            this.elementSignOut.style.display = 'none';
            this.terminateTracks();
        }
    }

    initiateTracks() {
        let divTrackNew = document.createElement('div');
        this.elementTracks.appendChild(divTrackNew);
        super.initiateTracks(new TrackWeb(this, '1', divTrackNew));
        this.elementTrackFront.appendChild(divTrackNew);
    }

    terminateTracks() {
        super.terminateTracks();
        this.elementTracks.appendChild(document.createTextNode("Tracks terminated"));
    }

}

class TrackWeb extends Track {
    constructor(parent, trackId, div) {
        super(parent, trackId);
        this.div = div;
    }

    setUseCase(useCase) {
        super.setUseCase(useCase);
        this.div.appendChild(document.createTextNode(JSON.stringify(useCase.spec)));
    }

}

class ClientEngine extends Client {
    constructor(parent, name) {
        super(parent);
        this.name = name;
    }

    setViewerSpec(viewerSpec) {
        console.log("ClientEngine::setViewerSpec()");
        if (viewerSpec.DriverUseCase != null) {
            this.driverUseCase = viewerSpec.DriverUseCase;
        }
        this.checkUserAuthentication();
    }

    setEntitlement(trackId, useCase, item) {
        console.log("ClientEngine::setEntitlement()");
        super.setEntitlement(trackId, useCase, item, this.name);
    }
    
    checkUserAuthentication() {
        this.userId = 'DefaultEngine';
        this.isAuthenticated = true;
        this.setUserAccess();
    }

    setUserAccess() {
        if (this.isAuthenticated === true) {
            this.initiateTracks();
        } else {
            this.terminateTracks();
        }
    }

    initiateTracks() {
        super.initiateTracks(new TrackEngine(this, '1', ""));
    }

    terminateTracks() {
        super.terminateTracks();
    }

}

class TrackEngine extends Track {
    constructor(parent, trackId, script) {
        super(parent, trackId);
        this.script = script;
    }

    setUseCase(useCase) {
        super.setUseCase(useCase);
        console.log("TrackEngine::setUseCase - ViewerSpec: ", useCase.spec.Viewers[0].ViewerSpec);
        if (useCase.spec.Viewers[0].ViewerSpec.Format === 'BatchLoader' && this.parent.parent.engineConfig.batchLoader != null) {
            //let retData = this.parent.parent.engineConfig.batchLoader();
            //console.log(retData);
            this.batchLoad();
        }
    }

    async batchLoad() {

        let retData = await this.parent.parent.engineConfig.batchLoader();
        console.log(retData);

        // retData is an array of UpdateItem payloads
        // Send them to the server as individual actions 
    }

}

module.exports = {
    Client,
    ClientWeb,
    ClientEngine
}