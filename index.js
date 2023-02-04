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
 * @private
 * @typedef {Object} RequestQueueData
 * @property {string} type
 * @property {string} data
 * @property {Function} resolve
 * @property {Function} reject
 * @property {boolean} isEventsSocket
 * @property {"main" | "events"} [socket]
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
         * @type {RequestQueueData[]}
         */
        this.requestQueue = []

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
    _addRequestToQueue(type, data, isEventsSocket = false) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                type,
                data,
                resolve,
                reject,
                isEventsSocket
            })

            if (this.requestQueue.length === 1) {
                this._sendData(type, data, isEventsSocket)
            }
        })
    }

    /**
     * @private
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
        await this._addRequestToQueue('subscribe-log-event', processname, true)
        await this._expectEventResponse(/done/)
    }

    /**
     * Subscribe to out logging events of a process.
     * This has been marked obsolete, left for backwards compatibility.
     * @param {string} processname 
     * @deprecated
     */
    async subscribeOutLogEvent(processname) {
        await this._addRequestToQueue('subscribe-outlog-event', processname, true)
        await this._expectEventResponse(/done/)
    }
    
    /**
     * Subscribe to err logging events of a process.
     * This has been marked obsolete, left for backwards compatibility.
     * @param {string} processname 
     * @deprecated
     */
    async subscribeErrLogEvent(processname) {
        await this._addRequestToQueue('subscribe-outlog-event', processname, true)
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
            const req = this.requestQueue[0]
            req.resolve(jsonData)
            this.requestQueue.splice(this.requestQueue.indexOf(req), 1)
            if(this.requestQueue.length > 0) {
                this._sendData(this.requestQueue[0].type, this.requestQueue[0].data, this.requestQueue[0].isEventsSocket)
            }
        } catch (e) {
            if (e instanceof SyntaxError) {
                // CASE 3(string data)
                if (this.DEBUG) console.log("Rec Str: " + data)

                if (data.startsWith('ERR:')) {
                    this.requestQueue[0].reject(new JandIpcError(data))
                    this.requestQueue.shift()
                    return
                }

                const req = this.requestQueue[0]
                req.resolve(data)
                this.requestQueue.splice(this.requestQueue.indexOf(req), 1)
                if(this.requestQueue.length > 0) {
                    this._sendData(this.requestQueue[0].type, this.requestQueue[0].data, this.requestQueue[0].isEventsSocket)
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
        return await this._addRequestToQueue('get-processes')
    }


    /**
     * 
     * @returns {Promise<DaemonStatus>}
     */
    async getDaemonStatus() {
        return await this._addRequestToQueue('status')
        
    }

    /**
     * 
     * @param {String} oldname 
     * @param {String} newname 
     */
    async renameProcess(oldname, newname) {
        const data = await this._addRequestToQueue('rename-process', `${oldname}:${newname}`)
        if (data == 'done') return
    }

    /**
     * Send a line to the target process. 0.7+ only.    
     * @param {string} processname 
     * @param {string} text 
     */
    async sendProcessStdinLine(processname, text) {
        await this._addRequestToQueue('send-process-stdin-line', `${processname}:${text}`)
        
        return
    }

    /**
     * Exit the daemon.
     */
    async exit() {
        await this._addRequestToQueue('exit')
    }

    /**
     * Enable/disable a process
     * @param {string} process 
     * @param {boolean} enabled 
     */
    async setEnabled(process, enabled) {
        await this._addRequestToQueue('set-enabled', `${process}:${enabled.toString()}`)
        
        return
    }

    /**
     * 
     * @param {string} process 
     * @param {string} property 
     * @param {string} data 
     */
    async setProcessProperty(process, property, data) {
        const response = await this._addRequestToQueue('set-process-property', {
            Process: process,
            Property: property,
            Data: data
        })
        
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
           this._addRequestToQueue('get-process-info', process)
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
        const response = await this._addRequestToQueue('stop-process', process)
        return response == 'killed'
    }

    /**
     * @param {string} process 
     */
    async restartProcess(process) {
        await this._addRequestToQueue('restart-process', process)
        return
    }

    /**
     * Starts a new process and enables it, but does not run it
     * @param {NewProcess} process 
     */
    async newProcess(process) {
        const res = await this._addRequestToQueue('new-process', process)
        if (res == 'added') return
    }

    /**
     * Kill a process and delete it.
     * @param {string} process 
     */
    async deleteProcess(process) {
        const res = await this._addRequestToQueue('delete-process', process)
        if (res == 'done') return
    }

    async saveConfig() {
        await this._addRequestToQueue('save-config')
        
        return
    }

    /**
     * @returns {Promise<Config>}
     */
    async getConfig() {
        return await this._addRequestToQueue('get-config')
    }

    /**
     * @param {string} option 
     * @param {string} value 
     */
    async setConfig(option, value) {
        const res = await this._addRequestToQueue('set-config', `${option}:${value}`)
        if (res == 'done') return
    }

    async flushAllLogs() {
        await this._addRequestToQueue('flush-all-logs')
        
        return
    }
}

module.exports.JandIpcClient = JandIpcClient