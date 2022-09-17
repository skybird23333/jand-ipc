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

# The entire API Documentation
> See https://jand.jan0660.dev/advanced/ipc-api for descriptions, unless otherwise specified here.

<dl>
<dt><a href="#connect">connect(name)</a></dt>
<dd><p>Connect to the JanD IPC socket</p>
</dd>
<dt><a href="#getRuntimeProcessList">getRuntimeProcessList()</a> ⇒ <code>Promise.&lt;Array.&lt;RuntimeProcessInfo&gt;&gt;</code></dt>
<dd></dd>
<dt><a href="#getDaemonStatus">getDaemonStatus()</a> ⇒ <code><a href="#DaemonStatus">Promise.&lt;DaemonStatus&gt;</a></code></dt>
<dd></dd>
<dt><a href="#renameProcess">renameProcess(oldname, newname)</a></dt>
<dd></dd>
<dt><a href="#sendProcessStdinLine">sendProcessStdinLine(processname, text)</a></dt>
<dd><p>Send a line to the target process. 0.7+ only.</p>
</dd>
<dt><a href="#exit">exit()</a></dt>
<dd><p>Exit the daemon.</p>
</dd>
<dt><a href="#setEnabled">setEnabled(process, enabled)</a></dt>
<dd><p>Enable/disable a process</p>
</dd>
<dt><a href="#setProcessProperty">setProcessProperty(process, property, data)</a></dt>
<dd></dd>
<dt><a href="#getProcessInfo">getProcessInfo(process)</a></dt>
<dd></dd>
<dt><a href="#stopProcess">stopProcess(process)</a> ⇒</dt>
<dd></dd>
<dt><a href="#restartProcess">restartProcess(process)</a></dt>
<dd></dd>
<dt><a href="#newProcess">newProcess(process)</a></dt>
<dd><p>Starts a new process and enables it, but does not run it</p>
</dd>
<dt><a href="#getConfig">getConfig()</a> ⇒ <code><a href="#Config">Promise.&lt;Config&gt;</a></code></dt>
<dd></dd>
<dt><a href="#setConfig">setConfig(option, value)</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#ProcessInfo">ProcessInfo</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#RuntimeProcessInfo">RuntimeProcessInfo</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#NewProcess">NewProcess</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#SetPropertyIpcPacket">SetPropertyIpcPacket</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#DaemonStatus">DaemonStatus</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#Config">Config</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a name="connect"></a>

## connect(name)
Connect to the JanD IPC socket

| Param | Type |
| --- | --- |
| name | <code>String</code> |

**Kind**: global function
<a name="getRuntimeProcessList"></a>

## getRuntimeProcessList() ⇒ <code>Promise.&lt;Array.&lt;RuntimeProcessInfo&gt;&gt;</code>
**Kind**: global function
<a name="getDaemonStatus"></a>

## getDaemonStatus() ⇒ [<code>Promise.&lt;DaemonStatus&gt;</code>](#DaemonStatus)
**Kind**: global function
<a name="renameProcess"></a>

## renameProcess(oldname, newname)
**Kind**: global function

| Param | Type |
| --- | --- |
| oldname | <code>String</code> |
| newname | <code>String</code> |

<a name="sendProcessStdinLine"></a>

## sendProcessStdinLine(processname, text)
Send a line to the target process. 0.7+ only.

**Kind**: global function

| Param | Type |
| --- | --- |
| processname | <code>string</code> |
| text | <code>string</code> |

<a name="exit"></a>

## exit()
Exit the daemon.

**Kind**: global function
<a name="setEnabled"></a>

## setEnabled(process, enabled)
Enable/disable a process

**Kind**: global function

| Param | Type |
| --- | --- |
| process | <code>string</code> |
| enabled | <code>boolean</code> |

<a name="setProcessProperty"></a>

## setProcessProperty(process, property, data)
**Kind**: global function

| Param | Type |
| --- | --- |
| process | <code>string</code> |
| property | <code>string</code> |
| data | <code>string</code> |

<a name="getProcessInfo"></a>

## getProcessInfo(process)
**Kind**: global function

| Param | Type |
| --- | --- |
| process | [<code>ProcessInfo</code>](#ProcessInfo) |

<a name="stopProcess"></a>

## stopProcess(process) ⇒
**Kind**: global function
**Returns**: true if process was running

| Param | Type |
| --- | --- |
| process | <code>string</code> |

<a name="restartProcess"></a>

## restartProcess(process)
**Kind**: global function

| Param | Type |
| --- | --- |
| process | <code>string</code> |

<a name="newProcess"></a>

## newProcess(process)
Starts a new process and enables it, but does not run it

**Kind**: global function

| Param | Type |
| --- | --- |
| process | [<code>NewProcess</code>](#NewProcess) |

<a name="getConfig"></a>

## getConfig() ⇒ [<code>Promise.&lt;Config&gt;</code>](#Config)
**Kind**: global function
<a name="setConfig"></a>

## setConfig(option, value)
**Kind**: global function

| Param | Type |
| --- | --- |
| option | <code>string</code> |
| value | <code>string</code> |

<a name="ProcessInfo"></a>

## ProcessInfo : <code>Object</code>
**Kind**: global typedef
**Properties**

| Name | Type |
| --- | --- |
| Name | <code>string</code> |
| Filename | <code>string</code> |
| Arguments | <code>Array.&lt;string&gt;</code> |
| WorkingDirectory | <code>string</code> |
| AutoRestart | <code>boolean</code> |
| Enabled | <code>boolean</code> |

<a name="RuntimeProcessInfo"></a>

## RuntimeProcessInfo : <code>Object</code>
**Kind**: global typedef
**Properties**

| Name | Type |
| --- | --- |
| Name | <code>string</code> |
| Filename | <code>string</code> |
| Arguments | <code>Array.&lt;string&gt;</code> |
| WorkingDirectory | <code>string</code> |
| AutoRestart | <code>boolean</code> |
| ProcessId | <code>number</code> |
| ExitCode | <code>number</code> |
| RestartCount | <code>number</code> |

<a name="NewProcess"></a>

## NewProcess : <code>Object</code>
**Kind**: global typedef
**Properties**

| Name | Type |
| --- | --- |
| Name | <code>string</code> |
| Filename | <code>string</code> |
| Arguments | <code>Array.&lt;string&gt;</code> |
| WorkingDirectory | <code>string</code> |

<a name="SetPropertyIpcPacket"></a>

## SetPropertyIpcPacket : <code>Object</code>
**Kind**: global typedef
**Properties**

| Name | Type |
| --- | --- |
| Process | <code>string</code> |
| Property | <code>string</code> |
| data | <code>string</code> |

<a name="DaemonStatus"></a>

## DaemonStatus : <code>Object</code>
**Kind**: global typedef
**Properties**

| Name | Type |
| --- | --- |
| Processes | <code>number</code> |
| NotSaved | <code>boolean</code> |
| Directory | <code>string</code> |
| Version | <code>string</code> |

<a name="Config"></a>

## Config : <code>Object</code>
**Kind**: global typedef
**Properties**

| Name | Type |
| --- | --- |
| LogIpc | <code>boolean</code> |
| FormatConfig | <code>boolean</code> |
| MaxRestarts | <code>number</code> |
| LogProcessOutput | <code>boolean</code> |