export namespace events {
    const OUTLOG: number;
    const ERRLOG: number;
    const PROCSTOP: number;
    const PROCSTART: number;
    const PROCADD: number;
    const PROCDEL: number;
    const PROCREN: number;
}
export function subscribe(events: any): Promise<void>;
export function connect(name?: string): Promise<void>;
export function getRuntimeProcessList(): Promise<RuntimeProcessInfo[]>;
export function getDaemonStatus(): Promise<DaemonStatus>;
export function renameProcess(oldname: string, newname: string): Promise<void>;
export function sendProcessStdinLine(processname: string, text: string): Promise<void>;
export function exit(): Promise<void>;
export function setEnabled(process: string, enabled: boolean): Promise<void>;
export function setProcessProperty(process: string, property: string, data: string): Promise<void>;
export function getProcessInfo(process: string): Promise<RuntimeProcessInfo | null>;
export function stopProcess(process: string): Promise<boolean>;
export function restartProcess(process: string): Promise<void>;
export function newProcess(process: NewProcess): Promise<void>;
export function saveConfig(): Promise<void>;
export function getConfig(): Promise<Config>;
export function setConfig(option: string, value: string): Promise<void>;
export function flushAllLogs(): Promise<void>;
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
    AutoRestart: boolean;
    ProcessId: number;
    ExitCode: number;
    RestartCount: number;
};
export type NewProcess = {
    Name: string;
    Filename: string;
    Arguments: string[];
    WorkingDirectory: string;
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
export class JandIpcError extends Error {
    constructor(...params: any[]);
}
