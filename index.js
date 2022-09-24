//@ts-check
const net = require('net')
const os = require('os')
let socket

var DEBUG = false

/**
 * @typedef {Object} ProcessInfo
 * @property {string} Name
 * @property {string} Filename
 * @property {string[]} Arguments
 * @property {string} WorkingDirectory
 * @property {boolean} AutoRestart
 * @property {boolean} Enabled
 */

/**
 * @typedef {Object} RuntimeProcessInfo
 * @property {string} Name
 * @property {string} Filename
 * @property {string[]} Arguments
 * @property {string} WorkingDirectory
 * @property {boolean} AutoRestart
 * @property {number} ProcessId
 * @property {number} ExitCode
 * @property {number} RestartCount
 */

/**
 * @typedef {Object} NewProcess
 * @property {string} Name
 * @property {string} Filename
 * @property {string[]} Arguments
 * @property {string} WorkingDirectory
 */

/**
 * @typedef {Object} SetPropertyIpcPacket
 * @property {string} Process
 * @property {string} Property
 * @property {string} data
 */

/**
 * @typedef {Object} DaemonStatus
 * @property {number} Processes
 * @property {boolean} NotSaved
 * @property {string} Directory
 * @property {string} Version
 */

/**
 * @typedef {Object} Config
 * @property {boolean} LogIpc
 * @property {boolean} FormatConfig
 * @property {number} MaxRestarts
 * @property {boolean} LogProcessOutput
 */

class JandIpcError extends Error {
    constructor(...params) {
        super(...params)

        this.name = 'JandIpcError'
    }
}

module.exports.JandIpcError = JandIpcError

/**
 * @private
 * @param {string} type 
 * @param {string | object | boolean | number} [data]
 */
 function sendData(type, data) {
    let dataSerialized = (typeof data === 'string' ? data : JSON.stringify(data))
    if(DEBUG) console.log(`Sent ${type} ${dataSerialized}`)
    socket.write(
        JSON.stringify({
            Type: type,
            Data: dataSerialized
        })
    )
}

/**
 * Expect a response from the IPC channel. Either a RegExp or an array of object fields if response is JSON.
 * @private
 * @param {RegExp | Array} match 
 * @param {boolean} isarray | If matching obj, is it in an array? This will only match the first object.
 */
function expectResponse(match, isarray=false) {
    return new Promise((resolve, reject) => {
        socket.on('data', data_buffer => {
            if(data_buffer.toString().startsWith('ERR')) throw new JandIpcError(data_buffer.toString())

            if (DEBUG) console.log(`Received ${data_buffer.toString()}`)

            if (match instanceof RegExp) {
                
                if (match.test(data_buffer.toString())) {
                    resolve(data_buffer.toString())
                }
            
            } else {
                try {
                    const data = JSON.parse(data_buffer)                    
                    if (isarray && !data.length) return
                    const targetFields = 
                    isarray? Object.keys(data[0]) : Object.keys(data)
                    for (const field of match) {
                        if (!targetFields.find(i => i == field)) {
                            return
                        }
                    }

                    resolve(data)
                } catch (e) {
                    if(DEBUG) console.log(e)
                }
            }
        })
    }
    )
}

/**
 * Connect to the JanD IPC socket
 * @param {string} name | JAND_PIPE
 */
module.exports.connect = async function (name="jand") {
    let path
    if (os.platform() === "win32") {
        if (name.startsWith('/') || name.startsWith('\\')) {
            path = name
        } else {
            path = "\\\\.\\pipe\\" + name
        }
    } else {
        if (name.startsWith('/')) {
            path = name
        }
        else {
            path = "/tmp/CoreFxPipe_" + name
        }
    }
    socket = net.connect(path)
}

/**
 * @returns {Promise<RuntimeProcessInfo[]>}
 */
module.exports.getRuntimeProcessList = async function () {
    sendData('get-processes')
    return await expectResponse(['Name', 'Running', 'Stopped'], true)
}


/**
 * 
 * @returns {Promise<DaemonStatus>}
 */
module.exports.getDaemonStatus = async function () {
    sendData('status')
    return await expectResponse(['Processes', 'NotSaved'])
}

/**
 * 
 * @param {String} oldname 
 * @param {String} newname 
 */
module.exports.renameProcess = async function(oldname, newname) {
    sendData('rename-process', `${oldname}:${newname}`)
    const data = await expectResponse(/done|ERR:.+/)
    if(data == 'done') return
}

/**
 * Send a line to the target process. 0.7+ only.    
 * @param {string} processname 
 * @param {string} text 
 */
module.exports.sendProcessStdinLine = async function(processname, text) {
    sendData('send-process-stdin-line', `${processname}:${text}`)
    await expectResponse(/done/)
    return
}

/**
 * Exit the daemon.
 */
module.exports.exit = async function() {
    sendData('exit')
}

/**
 * Enable/disable a process
 * @param {string} process 
 * @param {boolean} enabled 
 */
module.exports.setEnabled = async function(process, enabled) {
    sendData('set-enabled', `${process}:${enabled.toString()}`)
    await expectResponse(/True|False/)
    return
}

/**
 * 
 * @param {string} process 
 * @param {string} property 
 * @param {string} data 
 */
module.exports.setProcessProperty = async function(process, property, data) {
    sendData('set-process-property', {
        Process: process,
        Property: property,
        Data: data
    })
    const response = await expectResponse(/done|Invalid/)
    if(response == 'done') return
    if(response.startsWith('Invalid')) throw new JandIpcError(`Property ${property} is invalid.`)
}

/**
 * 
 * @param {String} process 
 * @returns {Promise<RuntimeProcessInfo>}
 */
module.exports.getProcessInfo = async function(process) {
    sendData('get-process-info', process)
    return await expectResponse(['Name', 'Filename', 'Arguments', 'WorkingDirectory', 'AutoRestart', 'Enabled'])
}

/**
 * 
 * @param {string} process 
 * @returns true if process was running
 */
module.exports.stopProcess = async function(process) {
    sendData('stop-process', process)
    const response = await expectResponse(/killed|already-stopped/)
    return response == 'killed'
}

/**
 * @param {string} process 
 */
module.exports.restartProcess = async function(process) {
    sendData('restart-process', process)
    await expectResponse(/done/)
    return
}

/**
 * Starts a new process and enables it, but does not run it
 * @param {NewProcess} process 
 */
module.exports.newProcess = async function(process) {
    sendData('new-process', process)
    const res = await expectResponse(/added|ERR:.+/)
    if(res == 'added') return
}

module.exports.saveConfig = async function() {
    sendData('save-config')
    await expectResponse(/done/)
    return
}

/**
 * @returns {Promise<Config>}
 */
module.exports.getConfig = async function() {
    sendData('get-config')
    return await expectResponse(['LogIpc', 'FormatConfig'])
}

/**
 * @param {string} option 
 * @param {string} value 
 */
module.exports.setConfig = async function(option, value) {
    sendData('set-config', `${option}:${value}`)
    const res = await expectResponse(/done|Option.+/)
    if(res == 'done') return
}

module.exports.flushAllLogs = async function() {
    sendData('flush-all-logs')
    await expectResponse(/done/)
    return
}