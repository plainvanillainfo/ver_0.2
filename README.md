# Plain Vanilla Info Version 0.2
Metadata based information management 

## Server

package.json

```
{
    "name": "plainvanillainfo",
    "version": "0.2.0",
    "type": "module",
    "dependencies": {
       "plainvanillainfo": "^0.2.0-alpha.1"
    }
}
```

mypvi.js

```
import {Server} from 'plainvanillainfo/pviserver';

process.on('uncaughtException', function (error) {
   console.log(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', reason.stack || reason)
})

let serverInstance = new Server("./appDir");
setTimeout(() => { serverInstance.start({}); }, 500);
```

## Engine

package.json

```
{
    "name": "plainvanillainfo",
    "version": "0.2.0",
    "type": "module",
    "dependencies": {
       "plainvanillainfo": "^0.2.0-alpha.1"
    }
}
```

mypvi.js

```
import {Engine} from 'plainvanillainfo/pviengine';

process.on('uncaughtException', function (error) {
   console.log(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', reason.stack || reason)
})

let engineInstance = new Engine("./appDir");
setTimeout(() => { engineInstance.start({}); }, 900);
```

## Web Application

package.json

```
{
  "name": "pviwebapp",
  "version": "0.2.0",
  "description": "PVI Web App",
  "main": "src/App.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "build": "webpack"
  },
  "keywords": [],
  "dependencies": {
    "pvi": "^0.2.0-alpha.1"
    "jwt-decode": "^3.1.2"
  },
  "author": "PVI",
  "license": "MIT",
  "devDependencies": {
    "plainvanillainfo": "^0.2.0-alpha.1"
    "jwt-decode": "^3.1.2",
    "html-webpack-plugin": "^5.5.0",
    "webpack": "^5.64.4",
    "webpack-cli": "^4.9.1"
  }
  
}
```

src/App.js

```
import {Client} from '../node_modules/plainvanillainfo/pviclient/index.js';

export class App {
    constructor(appId, transmitter, hostname, websocketPort, appDir) {
    }

    start() {
        let x = new Client(this);
	      let elementHello = document.getElementById('elementHello');
        elementHello.innerHTML = 'Hello Universe!!!';
    }

}

let app = new App('Web App Default', null, null, null, "./appDir");
app.start();
```
public/index.html

```
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="PVI App Content">
  <meta name="author" content="PVI Team">
  <meta name="generator" content="">
  <!-- Bootstrap core CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.5.0/font/bootstrap-icons.css" rel="stylesheet" crossorigin="anonymous">
  <title>PVI Web App</title>
</head>

<body>
    <h1 id = 'elementHello'></h1>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.10.2/dist/umd/popper.min.js" integrity="sha384-7+zCNj/IqJ95wo16oMtfsKbZ9ccEh31eOz1HGyDuCQ6wgnyJNSYdrPa03rtR1zdB" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.min.js" integrity="sha384-QJHtvGhmr9XOIpI6YVutG+2QOK9T+ZnN4kzFN1RtK3zEFEIsxhlmWl5/YESvpZ13" crossorigin="anonymous"></script>
</body>

</html>
```

## Application Metadata

### config
myapp.js
```
{
}
```

### data
classes.js
```
{
}
```
usecases.js
```
{
}
```
entitlements.js
```
{
}
```
items.js
```
{
}
```
users.js
```
{
}
```
