//@ts-check
const net = require('net')
const EventEmitter = require('node:events')
const os = require('os')
const { resolve } = require('path')
let socket

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

/**
 * @typedef {Object} BaseEvent
 * @property {string} Event
 */

/**
 * @typedef {Object} ProcessStartedEvent
 * @property {"procstart"} Event
 * @property {string} Process
 */

/**
 * @typedef {Object} ProcessStoppedEvent
 * @property {"proctop"} Event
 * @property {string} Process
 */

/**
 * @typedef {Object} ProcessRenameEvent
 * @property {"procren"} Event
 * @property {string} Process
 * @property {string} Value
 */

/**
 * @typedef {Object} ProcessAddedEvent
 * @property {"procadd"} Event
 * @property {string} Process
 */

/**
 * @typedef {Object} ProcessDeleteEvent
 * @property {"procdel"} Event
 * @property {string} Process
 */

/**
 * @private
 * @typedef {Object} ResponseExpectation
 * @property {string[]} fields
 * @property {RegExp} match
 * @property {boolean} isarray
 * @property {Function} resolve
 * @property {Function} reject
 */

class JandIpcError extends Error {
    constructor(...params) {
        super(...params)

        this.name = 'JandIpcError'
    }
}

module.exports.JandIpcError = JandIpcError

const events = {
    outlog: 0b0000_0001,
    // errlog
    errlog: 0b0000_0010,
    // procstop
    procstop: 0b0000_0100,
    // procstart
    procstart: 0b0000_1000,
    // procadd
    procadd: 0b0001_0000,
    // procdel
    procdel: 0b0010_0000,
    // procren
    procren: 0b0100_0000,
}

module.exports.events = events


class JandIpcClient extends EventEmitter {
    /**
     * @param {string} [name]
     */
    constructor(name) {
        super()
        this.name = name || "jand"

        this.DEBUG = false

        /**
         * @type {net.Socket | null}
         */
        this.socket = null

        /**
         * @type {ResponseExpectation[]}
         */
        this.expectations = []

        this.expectsEvent = 0b0000_0000
    }

    /**
     * @private
     * @param {string} type 
     * @param {string | object | boolean | number} [data]
     */
    _sendData(type, data) {
        let dataSerialized = (typeof data === 'string' ? data : JSON.stringify(data))
        if (this.DEBUG) console.log(`Sent ${type} ${dataSerialized}`)
        if (!this.socket) throw new JandIpcError("Socket not connected")
        this.socket.write(
            JSON.stringify({
                Type: type,
                Data: dataSerialized
            })
        )
    }

    /**
     * @private
     * @param {string} data 
     */
    _sendRaw(data) {
        socket.write(data)
    }

    subscribe(events) {
        for (const event of events) {
            if (events[event]) {
                this.expectsEvent |= events[event]
            }
        }
        this._sendData('subscribe', events)
    }


    connect() {
        return new Promise((resolve, reject) => {
            let path
            if (os.platform() === "win32") {
                if (this.name.startsWith('/') || this.name.startsWith('\\')) {
                    path = this.name
                } else {
                    path = "\\\\.\\pipe\\" + this.name
                }
            } else {
                if (this.name.startsWith('/')) {
                    path = this.name
                }
                else {
                    path = "/tmp/CoreFxPipe_" + this.name
                }
            }

            this.socket = net.connect(path)

            this.socket.once('ready', () => {
                resolve(true)
            })

            this.socket.on('data', (data) => {
                this._handleResponse(data.toString())
            })

        })
    }

    /**
     * Expect a response from the IPC channel. Either a RegExp or an array of object fields if response is JSON.
     * @private
     * @param {Array} fields 
     * @param {RegExp} [match] 
     * @param {boolean} isarray | If matching obj, is it in an array? This will only match the first object.
     */
    _expectResponse(fields, isarray = false, match) {
        return new Promise((resolve, reject) => {
            this.expectations.push({
                isarray,
                fields,
                resolve,
                match: match || /asdgneigioqeg/,
                reject,
            })
        })
    }

    /**
     * @private
     * @param {String} data
     */
    _handleResponse(data) {
        try {
            const jsonData = JSON.parse(data)
            if (this.DEBUG) {
                console.log('Rec JSON: ')
                console.log(jsonData)
            }

            if (jsonData.Event) {
                // CASE 1 Event
                this._handleEvent(jsonData)
            }
            else if (this.expectations.length > 0) {
                // CASE 2 JSON Response
                for (const exp of this.expectations) {

                    if (!exp.fields.length) return

                    // if expecting array but response not an array, return
                    if (exp.isarray && !data.length) return

                    // if expecting an array, sample the first element
                    const targetFields =
                        exp.isarray ? Object.keys(jsonData[0]) : Object.keys(jsonData)


                    let matchingFields = true
                    // if the response doesn't have the expected fields, return
                    for (const field of exp.fields) {
                        if (!targetFields.find(i => i == field)) {
                            matchingFields = false
                            break
                        }
                    }
                    if (!matchingFields) break

                    exp.resolve(jsonData)
                }
            }
        } catch (e) {
            if (e instanceof SyntaxError) {
                // CASE 3(string data)
                if (this.DEBUG) console.log("Rec Str: " + data)

                if (data.startsWith('ERR:')) {
                    throw new JandIpcError(data)
                }

                //match string response
                for (const exp of this.expectations) {
                    if (!exp.match) return
                    if (exp.match.test(data)) {
                        exp.resolve(data)
                        break
                    }
                }
            }
        }
    }

    /**
     * @private
     * @param {any} evt 
     */
    _handleEvent(evt) {

        if (events[evt.Event]) {
            if (events[evt.Event] & this.expectsEvent) {
                this.emit(evt.Event, evt)
            }
        }
    }

    get connected() {
        return !!(this.socket && this.socket.writable)
    }

    /**
     * @returns {Promise<RuntimeProcessInfo[]>}
     */
    async getRuntimeProcessList() {
        this._sendData('get-processes')
        return await this._expectResponse(['Name', 'Running', 'Stopped'], true)
    }


    /**
     * 
     * @returns {Promise<DaemonStatus>}
     */
    async getDaemonStatus() {
        this._sendData('status')
        return await this._expectResponse(['Processes', 'NotSaved'])
    }

    /**
     * 
     * @param {String} oldname 
     * @param {String} newname 
     */
    async renameProcess(oldname, newname) {
        this._sendData('rename-process', `${oldname}:${newname}`)
        const data = await this._expectResponse([], false, /done|ERR:.+/)
        if (data == 'done') return
    }

    /**
     * Send a line to the target process. 0.7+ only.    
     * @param {string} processname 
     * @param {string} text 
     */
    async sendProcessStdinLine(processname, text) {
        this._sendData('send-process-stdin-line', `${processname}:${text}`)
        await this._expectResponse([], false, /done/)
        return
    }

    /**
     * Exit the daemon.
     */
    async exit() {
        this._sendData('exit')
    }

    /**
     * Enable/disable a process
     * @param {string} process 
     * @param {boolean} enabled 
     */
    async setEnabled(process, enabled) {
        this._sendData('set-enabled', `${process}:${enabled.toString()}`)
        await this._expectResponse([], false, /True|False/)
        return
    }

    /**
     * 
     * @param {string} process 
     * @param {string} property 
     * @param {string} data 
     */
    async setProcessProperty(process, property, data) {
        this._sendData('set-process-property', {
            Process: process,
            Property: property,
            Data: data
        })
        const response = await this._expectResponse([], false, /done|Invalid/)
        if (response == 'done') return
        if (response.startsWith('Invalid')) throw new JandIpcError(`Property ${property} is invalid.`)
    }

    /**
     * 
     * @param {String} process 
     * @returns {Promise<RuntimeProcessInfo | null>}
     */
    async getProcessInfo(process) {
        return new Promise((resolve, reject) => {
            this._sendData('get-process-info', process)
            this._expectResponse(['Name', 'Filename', 'Arguments', 'WorkingDirectory', 'AutoRestart', 'Enabled'])
                .catch(e => {
                    if (e.message.includes('ERR:invalid-process')) {
                        resolve(null)
                    } else {
                        reject(e)
                    }
                })
                .then(data => {
                    resolve(data)
                })
        })
    }

    /**
     * 
     * @param {string} process 
     * @returns true if process was running
     */
    async stopProcess(process) {
        this._sendData('stop-process', process)
        const response = await this._expectResponse([], false, /killed|already-stopped/)
        return response == 'killed'
    }

    /**
     * @param {string} process 
     */
    async restartProcess(process) {
        this._sendData('restart-process', process)
        await this._expectResponse([], false, /done/)
        return
    }

    /**
     * Starts a new process and enables it, but does not run it
     * @param {NewProcess} process 
     */
    async newProcess(process) {
        this._sendData('new-process', process)
        const res = await this._expectResponse([], false, /added|ERR:.+/)
        if (res == 'added') return
    }

    /**
     * Kill a process and delete it.
     * @param {string} process 
     */
    async deleteProcess(process) {
        this._sendData('delete-process', process)
        const res = await this._expectResponse([], false, /done/)
        if (res == 'done') return
    }

    async saveConfig() {
        this._sendData('save-config')
        await this._expectResponse([], false, /done/)
        return
    }

    /**
     * @returns {Promise<Config>}
     */
    async getConfig() {
        this._sendData('get-config')
        return await this._expectResponse(['LogIpc', 'FormatConfig'])
    }

    /**
     * @param {string} option 
     * @param {string} value 
     */
    async setConfig(option, value) {
        this._sendData('set-config', `${option}:${value}`)
        const res = await this._expectResponse([], false, /done|Option.+/)
        if (res == 'done') return
    }

    async flushAllLogs() {
        this._sendData('flush-all-logs')
        await this._expectResponse([], false, /done/)
        return
    }
}

module.exports.JandIpcClient = JandIpcClient