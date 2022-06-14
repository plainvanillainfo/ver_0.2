import {
    Client
} from '../pviclient/index.js';

export class Engine {
    constructor(id) {
        console.log("Engine::constructor()");
    }

    async start() {

    }

    async stop() {
    }

    exitHandler(err) {
    }

    receivedFromServer(message) {
    }

    forwardToServer(messageIn) {
    }    

    setViewerSpec(viewerSpec) {
    }
}
