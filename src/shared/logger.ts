// infrastructure/logger/Logger.ts

export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
}

export class Logger {
    private static globalLogLevel: LogLevel = LogLevel.DEBUG;
    private className: string;

    constructor(className: string) {
        this.className = className;
    }

    public static setGlobalLogLevel(level: LogLevel): void {
        Logger.globalLogLevel = level;
    }

    public error(message: string, error?: any): void {
        if (Logger.globalLogLevel >= LogLevel.ERROR) {
            console.error(`[ERROR] [${this.className}] ${message}`, error || '');
        }
    }

    public warn(message: string, data?: any): void {
        if (Logger.globalLogLevel >= LogLevel.WARN) {
            console.warn(`[WARN] [${this.className}] ${message}`, data || '');
        }
    }

    public info(message: string, data?: any): void {
        if (Logger.globalLogLevel >= LogLevel.INFO) {
            console.info(`[INFO] [${this.className}] ${message}`, data || '');
        }
    }

    public debug(message: string, data?: any): void {
        if (Logger.globalLogLevel >= LogLevel.DEBUG) {
            console.debug(`[DEBUG] [${this.className}] ${message}`, data || '');
        }
    }
}
