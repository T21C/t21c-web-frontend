declare class IpcProtocolMismatchError extends Error {
    readonly protocolVersion: number | null;
    readonly serverVersion: string | null;
    readonly code = "INCOMPATIBLE";
    readonly clientVersion = "2.0.0";
    constructor(protocolVersion: number | null, serverVersion: string | null);
}
/** Byte transport only. Protocol, subscription and reconnection belong to the SDK. */
interface IpcTransport {
    connect(): Promise<void>;
    send(text: string): void | Promise<void>;
    close(): void | Promise<void>;
    onMessage(listener: (text: string) => void): () => void;
    onClose(listener: (reason?: unknown) => void): () => void;
}
type IpcTransportFactory = (url: string, protocol: string) => IpcTransport;
interface ConnectIpcOptions {
    host?: "127.0.0.1" | "localhost";
    startPort?: number;
    endPort?: number;
    connectTimeoutMs?: number;
    /** Check idle connections and replace sockets that no longer answer, even without a close event. */
    heartbeatIntervalMs?: number;
    heartbeatTimeoutMs?: number;
    transportFactory?: IpcTransportFactory;
    onProtocolMismatch?: (error: IpcProtocolMismatchError) => void;
}

type ValueSchema = "string" | "boolean" | "int32" | "float64" | "safeint" | "void" | {
    readonly model: string;
} | {
    readonly object: Readonly<Record<string, ValueSchema>>;
} | {
    readonly array: ValueSchema;
} | {
    readonly nullable: ValueSchema;
} | {
    readonly optional: ValueSchema;
} | {
    readonly enum: readonly string[];
    readonly name?: string;
};
type Models = Readonly<Record<string, ValueSchema>>;
declare class IpcValidationError extends TypeError {
    readonly path: string;
    readonly code = "invalid_value";
    constructor(path: string, message: string);
}

interface MethodDefinition {
    readonly wireName: string;
    readonly input: ValueSchema;
    readonly output: ValueSchema;
}
interface ContractDefinition {
    readonly id: string;
    readonly hash: string;
    readonly models: Models;
    readonly mod: Readonly<Record<string, MethodDefinition>>;
    readonly app: Readonly<Record<string, MethodDefinition>>;
}
declare const contractTypes: unique symbol;
interface IpcContract<M extends object, H extends object> extends ContractDefinition {
    readonly [contractTypes]?: {
        readonly mod: M;
        readonly handlers: H;
    };
}
type ChannelStatus = "unavailable" | "initializing" | "ready" | "error";
type Channel<M extends object> = M & {
    readonly status: ChannelStatus;
    readonly sessionId: string | undefined;
    ready(): Promise<void>;
    onStatus(listener: (status: ChannelStatus, error?: IpcCallError) => void): () => void;
};
declare function defineContract<M extends object, H extends object>(definition: ContractDefinition): IpcContract<M, H>;
declare class IpcCallError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
interface AppOptions {
    displayName: string;
}
interface IpcOptions extends ConnectIpcOptions {
    requestTimeoutMs?: number;
}
declare class AppRegistration {
    readonly appId: string;
    readonly displayName: string;
    private readonly connection;
    private readonly bindings;
    private readonly lifetime;
    private readonly timeoutMs;
    private readonly offState;
    constructor(options: AppOptions, settings?: IpcOptions);
    use<M extends object, H extends object>(contract: IpcContract<M, H>, handlers: NoInfer<H>): Channel<M>;
    dispose(): void;
    /** Recheck app availability when the page returns from suspension. */
    checkConnection(): void;
    private check;
}
declare function createIpc(options?: IpcOptions): {
    registerApp(options: AppOptions): AppRegistration;
};
declare const ipc: ReturnType<typeof createIpc>;

export { type AppOptions, AppRegistration, type Channel, type ChannelStatus, type ContractDefinition, IpcCallError, type IpcContract, type IpcOptions, IpcValidationError, type MethodDefinition, type Models, type ValueSchema, createIpc, defineContract, ipc };
