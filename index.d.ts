export function connect(name?: string): Promise<void>;
export function getProcessList(): Promise<ProcessInfo[]>;
export function getRuntimeProcessList(): Promise<RuntimeProcessInfo[]>;
export function getDaemonStatus(): Promise<DaemonStatus>;
export function renameProcess(oldname: string, newname: string): Promise<void>;
export function sendProcessStdinLine(processname: string, text: string): Promise<void>;
export function exit(): Promise<void>;
export function setEnabled(process: string, enabled: boolean): Promise<void>;
export function setProcessProperty(process: string, property: string, data: string): Promise<void>;
export function getProcessInfo(process: ProcessInfo): Promise<any>;
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
export class JandIpcError extends Error {
    constructor(...params: any[]);
}
