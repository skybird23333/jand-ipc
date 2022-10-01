/// <reference types="node" />
export type ProcessInfo = {
    Name: string;
    Filename: string;
    Arguments: string[];
    WorkingDirectory: string;
    AutoRestart: boolean;
    Enabled: boolean;
};
export type RuntimeProcessInfo = {
    Name: string;
    Filename: string;
    Arguments: string[];
    WorkingDirectory: string;
    ProcessId: number;
    Stopped: boolean;
    ExitCode: number;
    RestartCount: number;
    Enabled: boolean;
    AutoRestart: boolean;
    Running: boolean;
    Watch: boolean;
    SafeIndex: number;
};
export type NewProcess = {
    Name: string;
    Filename: string;
    Arguments: string[];
    WorkingDirectory?: string;
};
export type SetPropertyIpcPacket = {
    Process: string;
    Property: string;
    data: string;
};
export type DaemonStatus = {
    Processes: number;
    NotSaved: boolean;
    Directory: string;
    Version: string;
};
export type Config = {
    LogIpc: boolean;
    FormatConfig: boolean;
    MaxRestarts: number;
    LogProcessOutput: boolean;
};
export type BaseEvent = {
    Event: string;
};
export type ProcessStartedEvent = {
    Event: "procstart";
    Process: string;
};
export type ProcessStoppedEvent = {
    Event: "proctop";
    Process: string;
};
export type ProcessRenameEvent = {
    Event: "procren";
    Process: string;
    Value: string;
};
export type ProcessAddedEvent = {
    Event: "procadd";
    Process: string;
};
export type ProcessDeleteEvent = {
    Event: "procdel";
    Process: string;
};
export type ResponseExpectation = {
    fields: string[];
    match: RegExp;
    isarray: boolean;
    resolve: Function;
    reject: Function;
};
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
export class JandIpcError extends Error {
    constructor(...params: any[]);
}
export namespace events {
    const outlog: number;
    const errlog: number;
    const procstop: number;
    const procstart: number;
    const procadd: number;
    const procdel: number;
    const procren: number;
}
export class JandIpcClient extends EventEmitter {
    /**
     * @param {string} [name]
     */
    constructor(name?: string);
    name: string;
    DEBUG: boolean;
    /**
     * @type {net.Socket | null}
     */
    socket: net.Socket | null;
    /**
     * @type {ResponseExpectation[]}
     */
    expectations: ResponseExpectation[];
    expectsEvent: number;
    /**
     * @private
     * @param {string} type
     * @param {string | object | boolean | number} [data]
     */
    private _sendData;
    /**
     * @private
     * @param {string} data
     */
    private _sendRaw;
    subscribe(events: any): void;
    connect(): Promise<any>;
    /**
     * Expect a response from the IPC channel. Either a RegExp or an array of object fields if response is JSON.
     * @private
     * @param {Array} fields
     * @param {RegExp} [match]
     * @param {boolean} isarray | If matching obj, is it in an array? This will only match the first object.
     */
    private _expectResponse;
    /**
     * @private
     * @param {String} data
     */
    private _handleResponse;
    /**
     * @private
     * @param {any} evt
     */
    private _handleEvent;
    get connected(): boolean;
    /**
     * @returns {Promise<RuntimeProcessInfo[]>}
     */
    getRuntimeProcessList(): Promise<RuntimeProcessInfo[]>;
    /**
     *
     * @returns {Promise<DaemonStatus>}
     */
    getDaemonStatus(): Promise<DaemonStatus>;
    /**
     *
     * @param {String} oldname
     * @param {String} newname
     */
    renameProcess(oldname: string, newname: string): Promise<void>;
    /**
     * Send a line to the target process. 0.7+ only.
     * @param {string} processname
     * @param {string} text
     */
    sendProcessStdinLine(processname: string, text: string): Promise<void>;
    /**
     * Exit the daemon.
     */
    exit(): Promise<void>;
    /**
     * Enable/disable a process
     * @param {string} process
     * @param {boolean} enabled
     */
    setEnabled(process: string, enabled: boolean): Promise<void>;
    /**
     *
     * @param {string} process
     * @param {string} property
     * @param {string} data
     */
    setProcessProperty(process: string, property: string, data: string): Promise<void>;
    /**
     *
     * @param {String} process
     * @returns {Promise<RuntimeProcessInfo | null>}
     */
    getProcessInfo(process: string): Promise<RuntimeProcessInfo | null>;
    /**
     *
     * @param {string} process
     * @returns true if process was running
     */
    stopProcess(process: string): Promise<boolean>;
    /**
     * @param {string} process
     */
    restartProcess(process: string): Promise<void>;
    /**
     * Starts a new process and enables it, but does not run it
     * @param {NewProcess} process
     */
    newProcess(process: NewProcess): Promise<void>;
    /**
     * Kill a process and delete it.
     * @param {string} process
     */
    deleteProcess(process: string): Promise<void>;
    saveConfig(): Promise<void>;
    /**
     * @returns {Promise<Config>}
     */
    getConfig(): Promise<Config>;
    /**
     * @param {string} option
     * @param {string} value
     */
    setConfig(option: string, value: string): Promise<void>;
    flushAllLogs(): Promise<void>;
}
import EventEmitter = require("events");
import net = require("net");
