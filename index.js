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
 * @property {number} ProcessId
 * @property {boolean} Stopped
 * @property {number} ExitCode
 * @property {number} RestartCount
 * @property {boolean} Enabled
 * @property {boolean} AutoRestart
 * @property {boolean} Running
 * @property {boolean} Watch
 * @property {number} SafeIndex
 */

/**
 * @typedef {Object} NewProcess
 * @property {string} Name
 * @property {string} Filename
 * @property {string[]} Arguments
 * @property {string} [WorkingDirectory]
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
 * @property {"procstop"} Event
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
 * @property {ResponseExpectationOptions} [options]
 */

/**
 * @private
 * @typedef {Object} ResponseExpectationOptions
 * @property {boolean} [allowEmptyArray]
 */

/**
 * @private
 * @typedef {Object} EventExpectation
 * @property {string} [event]
 * @property {RegExp} [match]
 * @property {Function} resolve
 * @property {Function} reject
 */

/**
 * @typedef {"procstart" | "procstop" | "procren" | "procadd" | "procdel" | "outlog" | "errlog"} EventString
 */

class JandIpcError extends Error {
    constructor(...params) {
        super(...params)

        this.name = 'JandIpcError'
    }
}

module.exports.JandIpcError = JandIpcError

const EventsEnum = {
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

module.exports.EventsEnum = EventsEnum


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

        /**
         * @type {EventExpectation[]}
         */
        this.eventExpectations = []

        this.expectsEventFlags = 0b0000_0000
    }

    /**
     * @private
     * @param {string} type 
     * @param {string | object | boolean | number} [data]
     * @param {boolean} isEventsSocket
     */
    _sendData(type, data, isEventsSocket = false) {
        let dataSerialized = (typeof data === 'string' ? data : JSON.stringify(data))
        if (this.DEBUG) console.log(`Sent${isEventsSocket ? `(EVENT)` : ''} ${type} ${dataSerialized}`)
        if (!this.socket || !this.eventsSocket) throw new JandIpcError("Socket not connected")
        if (isEventsSocket) {
            this.eventsSocket.write(JSON.stringify({
                Type: type,
                Data: dataSerialized
            }))
        }
        else {
            this.socket.write(
                JSON.stringify({
                    Type: type,
                    Data: dataSerialized
                })
            )
        }
    }

    /**
     * @private
     * @param {string} data 
     */
    _sendRaw(data) {
        socket.write(data)
    }

    /**
     * Subscribe to a list of events
     * @param {EventString[]} events 
     */
    async subscribe(events) {
        for (const event of events) {
            if (EventsEnum[event]) {
                this.expectsEventFlags |= EventsEnum[event]
            }
        }
        if (!this.eventsSocket) throw new JandIpcError("Socket not connected")
        this._sendData('subscribe-events', this.expectsEventFlags, true)
        await this._expectEventResponse(/done/)
    }

    /**
     * Subscribe to logging events of a list of processes.
     * @param {string[]} processes
     */
    async subscribeLogEvents(processes) {
        for (const process of processes) {
            this.subscribeLogEvent(process)
        }
    }

    /**
     * Subscribe to logging events of a process.
     * @param {string} processname 
     */
    async subscribeLogEvent(processname) {
        this._sendData('subscribe-log-event', processname, true)
        await this._expectEventResponse(/done/)
    }

    /**
     * Subscribe to out logging events of a process.
     * This has been marked obsolete, left for backwards compatibility.
     * @param {string} processname 
     * @deprecated
     */
    async subscribeOutLogEvent(processname) {
        this._sendData('subscribe-outlog-event', processname, true)
        await this._expectEventResponse(/done/)
    }
    
    /**
     * Subscribe to err logging events of a process.
     * This has been marked obsolete, left for backwards compatibility.
     * @param {string} processname 
     * @deprecated
     */
    async subscribeErrLogEvent(processname) {
        this._sendData('subscribe-outlog-event', processname, true)
        await this._expectEventResponse(/done/)
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
            this.eventsSocket = net.connect(path)

            this.socket.once('ready', () => {
                resolve(true)
            })

            this.socket.on('data', (data) => {
                this._handleResponse(data.toString())
            })

            this.eventsSocket.on('data', (data) => {
                this._handleEvent(data.toString())
            })

        })
    }

    /**
     * Expect a response from the IPC channel. Either a RegExp or an array of object fields if response is JSON.
     * @private
     * @param {Array} fields 
     * @param {RegExp} [match] 
     * @param {boolean} isarray | If matching obj, is it in an array? This will only match the first object.
     * @param {ResponseExpectationOptions} [options]
     */
    _expectResponse(fields, isarray = false, match, options = {}) {
        return new Promise((resolve, reject) => {
            this.expectations.push({
                isarray,
                fields,
                match: match || /asdgneigioqeg/,
                resolve,
                reject,
                options,
            })
        })
    }

    /**
     * Expect a string response or event name.
     * @param {RegExp | string} match 
     * @returns 
     */
    _expectEventResponse(match) {
        if (typeof match === 'string') {
            return new Promise((resolve, reject) => {
                this.eventExpectations.push({
                    resolve,
                    reject,
                    event: match,
                })
            })
        } else {
            return new Promise((resolve, reject) => {
                this.eventExpectations.push({
                    resolve,
                    reject,
                    match: match || /asdgneigioqeg/,
                })
            })
        }
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
            // CASE 2 JSON Response
            for (const exp of this.expectations) {
            
                const options = exp.options ?? {}
                
                // Does not expect JSON, find next expectation
                if (!exp.fields.length) continue
                
                // if expecting an array, sample the first element
                
                //option: allow array to be empty(wont check the fields)
                if(exp.isarray && options.allowEmptyArray && !jsonData.length) {
                    console.log('Empty array')
                    exp.resolve(jsonData)
                    this.expectations.splice(this.expectations.indexOf(exp), 1)
                    return
                }

                //otherwise ignore empty array/obj
                else if (!options.allowEmptyArray && exp.isarray && jsonData.length == 0) continue
                
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
                
                
                if (!matchingFields) {
                    break
                }

                exp.resolve(jsonData)
                this.expectations.splice(this.expectations.indexOf(exp), 1)
            }
        } catch (e) {
            if (e instanceof SyntaxError) {
                // CASE 3(string data)
                if (this.DEBUG) console.log("Rec Str: " + data)

                if (data.startsWith('ERR:')) {
                    this.expectations[0].reject(new JandIpcError(data))
                    this.expectations.shift()
                    return
                }

                //match string response
                for (const exp of this.expectations) {
                    if (!exp.match) return
                    if (exp.match.test(data)) {
                        exp.resolve(data)
                        this.expectations.splice(this.expectations.indexOf(exp), 1)
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
        try {
            const jsonEvent = JSON.parse(evt)
            
            if (this.DEBUG) {
                console.log('Rec JSON EVENT: ', evt)
            }

            if (EventsEnum[jsonEvent.Event]) {
                if (EventsEnum[jsonEvent.Event] & this.expectsEventFlags) {
                    this.emit(jsonEvent.Event, jsonEvent)
                    
                    if (this.eventExpectations.length > 0) {
                        for (const exp of this.eventExpectations) {
                            if (exp.event == jsonEvent.Event) {
                                exp.resolve(jsonEvent)
                                this.eventExpectations.splice(this.eventExpectations.indexOf(exp), 1)
                                break
                            }
                        }
                    }
                }
            }
        } catch(e) {
            if (this.DEBUG) {
                console.log('Rec str EVENT: ', evt)
            }
            if (this.eventExpectations.length > 0) {
                for (const exp of this.eventExpectations) {
                    if (exp.match && exp.match.test(evt)) {
                        exp.resolve(evt)
                        this.eventExpectations.splice(this.eventExpectations.indexOf(exp), 1)
                    break
                }}  
            }
                
            }
    }

    get connected() {
        return (this.socket && this.socket.writable) && (this.eventsSocket && this.eventsSocket.writable)
    }

    /**
     * @returns {Promise<RuntimeProcessInfo[]>}
     */
    async getRuntimeProcessList() {
        this._sendData('get-processes')
        return await this._expectResponse(['Name', 'Running', 'Stopped'], true, undefined, {allowEmptyArray: true})
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