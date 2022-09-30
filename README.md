- [jand-ipc](#jand-ipc)
- [Example Usage](#example-usage)
- [Error handling](#error-handling)
- [Changelogs](#changelogs)
  - [2.0.0](#200)
  - [1.0.4](#104)
- [The entire API Documentation](#the-entire-api-documentation)

# jand-ipc
An Ipc wrapper for JanD.

# Example Usage
```javascript
const jand = require('jand-ipc')

async function run() {
    await jand.connect()
    console.log(await jand.getDaemonStatus())
    console.log(await jand.getRuntimeProcessList())
    await jand.newProcess({
        Name: 'sus',
        WorkingDirectory: '/',
        Arguments: [],
        Filename: "",
    }).catch(e => {
        console.log(e) // JandIpcError: ERR Something something
    })
    console.log('done')
}

run()
```

# Error handling
If JanD sends back an error a `JandIpcError` will be thrown.

# Changelogs

## 2.0.0
**Breaking change(yay)**
The entire jand object is now a class extending EventEmitter.
This means: 
- You now have to use only one instance of the object and use it throughout your code.
- You can't just import individual methods and use them.

This also introduces event subscriptions, aka being able to subscribe to events from JanD.



## 1.0.4
- Fixed wrong parameter type in `getProcessInfo()` (process should be string, not the process object)

# The entire API Documentation
> See https://jand.jan0660.dev/advanced/ipc-api for descriptions, unless otherwise specified here.

TODO