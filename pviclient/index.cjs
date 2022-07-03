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
    Item,
    Template,
    TemplateList,
    TemplateElem,
    User,
    TrackWeb,
    TrackEngine
} = require('../pvicommon/index.cjs');

class Client {
    constructor(parent) {
        this.parent = parent;
        this.isAuthenticated = false;
        this.forwardToServer = this.forwardToServer.bind(this);
        this.classes = {};
        this.useCases = {};
        this.tracks = {};
    }

    fromServer(message) {
        console.log("Client::fromServer(): ", message);
        switch (message.Action) {
            case 'StartSession':
                this.forwardToServer({Action: 'SendViewerSpec'});
                break;
            case 'ReceiveViewerSpec':
                this.setViewerSpec(message.ViewerSpec);
                break;
            case 'ReceiveEntitlement':
                this.setEntitlement(message.TrackId, message.Track, message.ClassesFileContent, message.UseCasesFileContent);
                break;
            case 'ContinueTrack':
                if (message.TrackId != null && message.Track != null && this.tracks[message.TrackId] != null) {
                    this.tracks[message.TrackId].fromServer(message.Track);
                }
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

    setEntitlement(trackId, track, viewerName, classesFileContent, useCasesFileContent) {
        console.log("Client::setEntitlement()");
        this.initializeClasses(classesFileContent, viewerName);
        this.initializeUseCases(useCasesFileContent, viewerName);
        this.tracks[trackId].setUseCase(this.useCases[track.UseCaseSpec.Name]);
        //this.tracks[trackId].setItem(track.ItemSpec != null ? track.ItemSpec : {});
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

    initializeClasses(classesFileCurContent, viewerName) {
        classesFileCurContent.Classes.forEach(classCur => {
            //console.log("    ", classCur.Name);
            this.classes[classCur.Name] = new PVIClass(this, classCur.Attributes, false);
        });
    }    

    initializeUseCases(useCasesFileCurContent, viewerName) {
        console.log("Client::initializeUseCases - useCasesFileCurContent: ", useCasesFileCurContent.Name);
        useCasesFileCurContent.UseCases.forEach(useCaseCur => {
            //console.log("    ", useCaseCur.Name);
            if (useCaseCur.Viewers != null) {
                let viewerCur = useCaseCur.Viewers.find(cur => cur.Name === viewerName);
                useCaseCur.Viewers = viewerCur != null ? [viewerCur] : [];
            }
            useCaseCur.Elems.forEach(elemCur => {
                if (elemCur.Viewers != null) {
                    let elemViewerCur = elemCur.Viewers.find(cur => cur.Name === viewerName);
                    elemCur.Viewers = elemViewerCur != null ? [elemViewerCur] : [];
                }
            });
            this.useCases[useCaseCur.Name] = new UseCase(this, useCaseCur);
        });
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

    setEntitlement(trackId, template, classesFileContent, useCasesFileContent) {
        console.log("ClientWeb::setEntitlement()");
        super.setEntitlement(trackId, template, this.name, classesFileContent, useCasesFileContent);
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

    setEntitlement(trackId, template, classesFileContent, useCasesFileContent) {
        console.log("ClientEngine::setEntitlement()");
        super.setEntitlement(trackId, template, this.name, classesFileContent, useCasesFileContent);
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

module.exports = {
    Client,
    ClientWeb,
    ClientEngine
}