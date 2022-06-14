const {
    Client
} = require('../pviclient/index.cjs');

class Engine {
    constructor(appDir, engineName) {
        console.log("Engine::constructor()");
        this.appDir = appDir;
        this.engineName = engineName;
        this.engineConfig = null;
        this.configure();
    }

    configure() {
        let appConfigFileName = this.appDir+'/config/app.json';
        this.config = JSON.parse(fs.readFileSync(appConfigFileName));
        this.engineConfig = this.config.Executables.find(cur => cur.Type === 'Viewer' && cur.Name === this.engineName).ViewerConfig;
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

module.exports = {
    Engine: Engine
}
