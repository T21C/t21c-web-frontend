// packages/client/dist/index.js
var CLIENT_VERSION = "2.0.0";
var PROTOCOL_VERSION = 3;
var IPC_SUBPROTOCOL = "adofai-ipc.v3";
var MAX_MESSAGE_BYTES = 2 * 1024 * 1024;
var IpcConnectionError = class extends Error {
  constructor(message = `ADOFAI-IPC is unavailable. Start the game with ADOFAI-IPC v${CLIENT_VERSION} enabled.`) {
    super(message);
    this.code = "UNAVAILABLE";
    this.name = "IpcConnectionError";
  }
};
var IpcUnavailableError = class extends IpcConnectionError {
  constructor(message) {
    super(message);
    this.name = "IpcUnavailableError";
  }
};
var IpcTimeoutError = class extends IpcConnectionError {
  constructor(timeoutMs) {
    super(`ADOFAI-IPC did not become ready within ${timeoutMs} ms.`);
    this.timeoutMs = timeoutMs;
    this.code = "TIMEOUT";
    this.name = "IpcTimeoutError";
  }
};
var IpcProtocolMismatchError = class extends Error {
  constructor(protocolVersion, serverVersion) {
    super("The game and application use different ADOFAI-IPC protocols. Update them and restart the game.");
    this.protocolVersion = protocolVersion;
    this.serverVersion = serverVersion;
    this.code = "INCOMPATIBLE";
    this.clientVersion = CLIENT_VERSION;
    this.name = "IpcProtocolMismatchError";
  }
};
var IpcNamespaceError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "IpcNamespaceError";
  }
};
var browserTransportFactory = (url, protocol) => new BrowserTransport(url, protocol);
var BrowserTransport = class {
  constructor(url, protocol) {
    this.url = url;
    this.protocol = protocol;
    this.closed = false;
    this.messages = /* @__PURE__ */ new Set();
    this.closes = /* @__PURE__ */ new Set();
    this.pageHide = () => this.failed(new IpcUnavailableError("The page was hidden for navigation."));
  }
  connect() {
    if (this.closed || typeof globalThis.WebSocket !== "function") return Promise.reject(new IpcUnavailableError("A WebSocket transport is required."));
    return new Promise((resolve, reject) => {
      this.rejectConnect = reject;
      const socket = new WebSocket(this.url, this.protocol);
      this.socket = socket;
      globalThis.addEventListener?.("pagehide", this.pageHide);
      socket.onopen = () => {
        if (this.closed) {
          socket.close();
          reject(new IpcUnavailableError());
        } else {
          this.rejectConnect = void 0;
          resolve();
        }
      };
      socket.onmessage = (event) => {
        if (typeof event.data === "string") for (const listener of [...this.messages]) listener(event.data);
      };
      socket.onerror = (event) => this.failed(event);
      socket.onclose = (event) => this.failed(event);
    });
  }
  send(text) {
    if (this.socket?.readyState !== WebSocket.OPEN || this.closed) throw new IpcUnavailableError();
    if (this.socket.bufferedAmount > 8 * 1024 * 1024) {
      this.close();
      throw new IpcUnavailableError("The IPC send buffer is full. Reconnect to synchronize.");
    }
    this.socket.send(text);
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    globalThis.removeEventListener?.("pagehide", this.pageHide);
    this.rejectConnect?.(new IpcUnavailableError());
    this.rejectConnect = void 0;
    const socket = this.socket;
    this.socket = void 0;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      try {
        socket.close();
      } catch {
      }
    }
  }
  failed(reason) {
    if (this.closed) return;
    this.close();
    for (const listener of [...this.closes]) {
      try {
        listener(reason);
      } catch {
      }
    }
  }
  onMessage(listener) {
    this.messages.add(listener);
    return () => this.messages.delete(listener);
  }
  onClose(listener) {
    this.closes.add(listener);
    return () => this.closes.delete(listener);
  }
};
var encoder = new TextEncoder();
var nextId = 0;
function messageId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${(++nextId).toString(36)}-${Math.random().toString(36).slice(2)}`;
}
function invoke(listeners, value) {
  for (const listener of [...listeners]) {
    try {
      listener(value);
    } catch {
    }
  }
}
function parse(text) {
  if (encoder.encode(text).length > MAX_MESSAGE_BYTES) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value.kind === "string" && typeof value.name === "string" && typeof value.id === "string" ? value : null;
  } catch {
    return null;
  }
}
var IpcConnection = class {
  constructor(options = {}) {
    this.options = options;
    this.channels = /* @__PURE__ */ new Map();
    this.states = /* @__PURE__ */ new Set();
    this.bindings = [];
    this.stopped = false;
    this.recovering = false;
    this._state = "disconnected";
    this.factory = options.transportFactory ?? browserTransportFactory;
    this.timeoutMs = options.connectTimeoutMs ?? 8e3;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 1e4;
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 15e3;
    this.startPort = options.startPort ?? 32145;
    this.endPort = options.endPort ?? 32155;
    this.host = options.host ?? "127.0.0.1";
    if (!["127.0.0.1", "localhost"].includes(this.host) || !Number.isInteger(this.startPort) || !Number.isInteger(this.endPort) || this.startPort < 1 || this.endPort > 65535 || this.endPort < this.startPort || this.endPort - this.startPort > 32 || ![this.timeoutMs, this.heartbeatIntervalMs, this.heartbeatTimeoutMs].every((value) => Number.isFinite(value) && value > 0)) throw new TypeError("Invalid localhost IPC discovery options.");
  }
  get state() {
    return this._state;
  }
  onState(listener) {
    this.states.add(listener);
    listener(this._state);
    return () => this.states.delete(listener);
  }
  namespace(name, protocolMajor) {
    if (protocolMajor !== void 0 && (!Number.isInteger(protocolMajor) || protocolMajor < 1)) throw new TypeError("Invalid feature protocol major.");
    if (!/^[a-z0-9-]+$/.test(name)) throw new TypeError("Invalid IPC namespace.");
    let channel = this.channels.get(name);
    if (!channel) {
      channel = new IpcChannel(this, name, protocolMajor);
      this.channels.set(name, channel);
      if (this.state === "connected") this.subscribe(name);
    }
    if (protocolMajor !== void 0 && channel.protocolMajor !== protocolMajor) throw new TypeError("This namespace already uses a different feature protocol requirement.");
    return channel;
  }
  start() {
    if (this.stopped) return Promise.reject(new IpcUnavailableError());
    if (this.starting) return this.starting;
    if (this.transport || this.recovering) return Promise.resolve();
    this.setState("reconnecting");
    this.starting = this.startOnce().finally(() => {
      this.starting = void 0;
    });
    return this.starting;
  }
  async startOnce() {
    try {
      const session = await this.discover();
      this.bind(session.transport, session.welcome);
    } catch (error) {
      if (error instanceof IpcProtocolMismatchError) {
        this.incompatible(error);
        throw error;
      }
      if (this.stopped) throw error;
      if (!this.recovering) void this.recover();
    }
  }
  close() {
    if (this.stopped) return;
    this.shutdown("closed");
  }
  /** Probe a retained socket on browser resume, or wake a pending discovery retry. */
  checkConnection() {
    if (this.stopped) return;
    if (this.transport) this.checkHeartbeat(this.transport);
    else this.wakeRetry?.();
  }
  shutdown(state) {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    this.wakeRetry?.();
    this.wakeRetry = void 0;
    this.cancelProbe?.();
    this.clearHeartbeat();
    for (const unbind of this.bindings) unbind();
    this.bindings = [];
    const transport = this.transport;
    this.transport = void 0;
    if (transport) this.disposeTransport(transport);
    for (const channel of this.channels.values()) channel.disconnected();
    this.setState(state);
  }
  send(kind, namespace, name, payload, options = {}, correlationId) {
    if (options.signal?.aborted) throw options.signal.reason ?? new DOMException("Aborted", "AbortError");
    if (this.state !== "connected" || !this.transport || this.stopped) throw new IpcUnavailableError();
    if (!/^[a-z0-9.-]+$/.test(name)) throw new TypeError("Invalid IPC message name.");
    const id = options.id ?? messageId();
    if (!id || id.length > 128) throw new TypeError("Invalid IPC message id.");
    this.write({ kind, namespace, name, id, correlationId, payload: payload === void 0 ? {} : payload });
    return id;
  }
  subscribe(namespace) {
    this.write({ kind: "subscribe", namespace, name: "namespace.subscribe", id: messageId(), payload: {} });
  }
  write(message) {
    const transport = this.transport;
    if (!transport) throw new IpcUnavailableError();
    const text = JSON.stringify(message);
    if (encoder.encode(text).length > MAX_MESSAGE_BYTES) throw new RangeError("IPC control message exceeds 2 MiB.");
    try {
      const result = transport.send(text);
      if (result) void result.catch(() => this.lost(transport));
    } catch (error) {
      this.lost(transport);
      throw error;
    }
  }
  async discover() {
    const ports = Array.from({ length: this.endPort - this.startPort + 1 }, (_, index) => this.startPort + index);
    if (this.preferredPort !== void 0) {
      ports.splice(ports.indexOf(this.preferredPort), 1);
      ports.unshift(this.preferredPort);
    }
    for (const port of ports) {
      if (this.stopped) throw new IpcUnavailableError();
      const transport = this.factory(`ws://${this.host}:${port}/ipc/ws`, IPC_SUBPROTOCOL);
      let resolveWelcome;
      let rejectWelcome;
      const welcome = new Promise((resolve, reject) => {
        resolveWelcome = resolve;
        rejectWelcome = reject;
      });
      void welcome.catch(() => {
      });
      const offMessage = transport.onMessage((text) => {
        const message = parse(text);
        if (message?.kind === "welcome") resolveWelcome(message);
      });
      const offClose = transport.onClose((reason) => rejectWelcome(reason ?? new IpcUnavailableError()));
      let timer;
      let disposed = false;
      const dispose = () => {
        if (!disposed) {
          disposed = true;
          this.disposeTransport(transport);
        }
      };
      const cancel = () => {
        rejectWelcome(new IpcUnavailableError());
        dispose();
      };
      this.cancelProbe = cancel;
      try {
        const verified = await Promise.race([
          (async () => {
            await transport.connect();
            return await welcome;
          })(),
          welcome,
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new IpcTimeoutError(this.timeoutMs)), this.timeoutMs);
          })
        ]);
        const data = verified.payload;
        if (data?.server !== "AdofaiIpc") throw new IpcUnavailableError();
        if (data.protocolVersion !== PROTOCOL_VERSION) throw new IpcProtocolMismatchError(data.protocolVersion ?? null, data.serverVersion ?? null);
        if (this.stopped) throw new IpcUnavailableError();
        this.preferredPort = port;
        return { transport, welcome: verified };
      } catch (error) {
        dispose();
        if (error instanceof IpcProtocolMismatchError) throw error;
      } finally {
        clearTimeout(timer);
        offMessage();
        offClose();
        if (this.cancelProbe === cancel) this.cancelProbe = void 0;
      }
    }
    throw new IpcUnavailableError();
  }
  bind(transport, welcome) {
    if (this.stopped) {
      this.disposeTransport(transport);
      return;
    }
    this.transport = transport;
    const data = welcome.payload;
    this.peerId = data.peerId;
    this.connectionId = data.connectionId;
    this.bindings = [transport.onMessage((text) => {
      if (this.transport !== transport || this.stopped) return;
      const message = parse(text);
      if (!message) {
        this.lost(transport);
        return;
      }
      if (message.kind === "pong" && message.correlationId === this.heartbeatId) {
        clearTimeout(this.heartbeatDeadline);
        this.heartbeatDeadline = void 0;
        this.heartbeatId = void 0;
      }
      if (message.kind === "ping") {
        this.write({ kind: "pong", name: "connection.pong", id: messageId(), correlationId: message.id, payload: {} });
        return;
      }
      if (message.namespace) this.channels.get(message.namespace)?.receive(message);
    }), transport.onClose(() => this.lost(transport))];
    this.write({ kind: "hello", name: "connection.hello", id: messageId(), payload: { protocolVersion: PROTOCOL_VERSION } });
    for (const name of this.channels.keys()) this.subscribe(name);
    if (this.transport !== transport) return;
    this.heartbeatTimer = setInterval(() => this.checkHeartbeat(transport), this.heartbeatIntervalMs);
    this.setState("connected");
  }
  checkHeartbeat(transport) {
    if (this.transport !== transport || this.stopped || this.heartbeatId) return;
    const id = messageId();
    this.heartbeatId = id;
    this.heartbeatDeadline = setTimeout(() => this.lost(transport), this.heartbeatTimeoutMs);
    try {
      this.write({ kind: "ping", name: "connection.ping", id, payload: {} });
    } catch {
    }
  }
  clearHeartbeat() {
    clearInterval(this.heartbeatTimer);
    clearTimeout(this.heartbeatDeadline);
    this.heartbeatTimer = void 0;
    this.heartbeatDeadline = void 0;
    this.heartbeatId = void 0;
  }
  lost(transport) {
    if (this.transport !== transport || this.stopped) return;
    this.clearHeartbeat();
    this.transport = void 0;
    for (const unbind of this.bindings) unbind();
    this.bindings = [];
    this.disposeTransport(transport);
    this.peerId = void 0;
    this.connectionId = void 0;
    for (const channel of this.channels.values()) channel.disconnected();
    this.setState("reconnecting");
    if (!this.recovering) void this.recover();
  }
  async recover() {
    if (this.recovering || this.stopped) return;
    this.recovering = true;
    let attempt = 0;
    try {
      while (!this.stopped && !this.transport) {
        await new Promise((resolve) => {
          this.wakeRetry = resolve;
          this.retryTimer = setTimeout(resolve, Math.min(5e3, 250 * 2 ** Math.min(attempt++, 5)) + Math.random() * 150);
        });
        clearTimeout(this.retryTimer);
        this.retryTimer = void 0;
        this.wakeRetry = void 0;
        if (this.stopped) return;
        try {
          const session = await this.discover();
          this.bind(session.transport, session.welcome);
        } catch (error) {
          if (error instanceof IpcProtocolMismatchError) {
            this.incompatible(error);
            return;
          }
        }
      }
    } finally {
      this.recovering = false;
      if (!this.stopped && !this.transport && this.state === "reconnecting") void this.recover();
    }
  }
  incompatible(error) {
    this.shutdown("incompatible");
    this.options.onProtocolMismatch?.(error);
  }
  setState(state) {
    this._state = state;
    invoke(this.states, state);
  }
  disposeTransport(transport) {
    try {
      const result = transport.close();
      if (result) void result.catch(() => {
      });
    } catch {
    }
  }
};
var IpcChannel = class {
  constructor(connection, name, protocolMajor) {
    this.connection = connection;
    this.name = name;
    this.protocolMajor = protocolMajor;
    this.events = /* @__PURE__ */ new Map();
    this.commands = /* @__PURE__ */ new Map();
    this.statuses = /* @__PURE__ */ new Set();
    this._status = "unavailable";
  }
  get status() {
    return this._status;
  }
  get error() {
    return this._error;
  }
  on(name, listener) {
    return this.listen(this.events, name, listener);
  }
  onCommand(name, listener) {
    return this.listen(this.commands, name, listener);
  }
  onStatus(listener) {
    this.statuses.add(listener);
    listener(this.status, this.error);
    return () => this.statuses.delete(listener);
  }
  send(name, payload, options) {
    this.requireCompatible();
    return this.connection.send("command", this.name, name, payload, options);
  }
  emit(name, payload) {
    this.requireCompatible();
    return this.connection.send("event", this.name, name, payload);
  }
  reply(correlationId, name, payload) {
    this.requireCompatible();
    return this.connection.send("event", this.name, name, payload, {}, correlationId);
  }
  whenReady(options = {}) {
    if (options.signal?.aborted) return Promise.reject(options.signal.reason ?? new DOMException("Aborted", "AbortError"));
    if (this.status === "ready") return Promise.resolve();
    if (this.status === "error") return Promise.reject(new IpcNamespaceError(this.error?.code ?? "namespace_error", this.error?.message ?? "The mod could not initialize."));
    return new Promise((resolve, reject) => {
      let timer;
      let off = () => {
      };
      const finish = (error) => {
        clearTimeout(timer);
        off();
        options.signal?.removeEventListener("abort", abort);
        if (error) reject(error);
        else resolve();
      };
      const abort = () => finish(options.signal?.reason ?? new DOMException("Aborted", "AbortError"));
      options.signal?.addEventListener("abort", abort, { once: true });
      off = this.onStatus((status, error) => {
        if (status === "ready") finish();
        else if (status === "error") finish(new IpcNamespaceError(error?.code ?? "namespace_error", error?.message ?? "The mod could not initialize."));
      });
      timer = setTimeout(() => finish(new IpcTimeoutError(options.timeoutMs ?? 15e3)), options.timeoutMs ?? 15e3);
    });
  }
  /** Internal transport adapter dispatch. */
  receive(message) {
    if (message.name === "command.rejected") {
      const error = message.payload;
      if (error?.code === "origin_not_allowed") {
        this._status = "error";
        this._error = error;
        for (const listener of [...this.statuses]) {
          try {
            listener(this.status, this.error);
          } catch {
          }
        }
      }
    }
    if (message.kind === "namespace") {
      let payload = message.payload;
      if (payload?.status === "ready" && this.protocolMajor !== void 0 && payload.featureProtocolMajor !== this.protocolMajor) {
        payload = { status: "error", error: { code: "feature_protocol_mismatch", message: "The app and mod use different message versions. Update both, restart ADOFAI, and reconnect." } };
      }
      if (["ready", "initializing", "error", "unavailable"].includes(payload?.status)) {
        this._status = payload.status;
        this._error = payload.error;
        for (const listener of [...this.statuses]) {
          try {
            listener(this.status, this.error);
          } catch {
          }
        }
      }
    }
    if (this._error?.code === "feature_protocol_mismatch") return;
    const listeners = (message.kind === "command" ? this.commands : this.events).get(message.name);
    if (listeners) for (const listener of [...listeners]) {
      try {
        listener(message.payload, message);
      } catch {
      }
    }
  }
  disconnected() {
    this._status = "unavailable";
    this._error = void 0;
    for (const listener of [...this.statuses]) {
      try {
        listener(this.status);
      } catch {
      }
    }
  }
  requireCompatible() {
    if (this._error?.code === "feature_protocol_mismatch") throw new IpcNamespaceError(this._error.code, this._error.message);
  }
  listen(map, name, listener) {
    let listeners = map.get(name);
    if (!listeners) {
      listeners = /* @__PURE__ */ new Set();
      map.set(name, listeners);
    }
    const stored = listener;
    listeners.add(stored);
    return () => {
      listeners?.delete(stored);
      if (!listeners?.size) map.delete(name);
    };
  }
};

// packages/adofai-ipc/src/schema.ts
var IpcValidationError = class extends TypeError {
  constructor(path, message) {
    super(`${path}: ${message}`);
    this.path = path;
    this.code = "invalid_value";
    this.name = "IpcValidationError";
  }
};
function decodeValue(schema, value, models, path = "$", depth = 0) {
  if (depth > 32) throw new IpcValidationError(path, "Maximum data depth exceeded.");
  if (schema === "string" || schema === "boolean") {
    if (typeof value !== schema) throw new IpcValidationError(path, `Expected ${schema}.`);
    return value;
  }
  if (schema === "int32") {
    if (typeof value !== "number" || !Number.isInteger(value) || value < -2147483648 || value > 2147483647)
      throw new IpcValidationError(path, "Expected a signed 32-bit integer.");
    return value;
  }
  if (schema === "float64" || schema === "safeint") {
    if (typeof value !== "number" || !Number.isFinite(value) || schema === "safeint" && !Number.isSafeInteger(value))
      throw new IpcValidationError(path, schema === "safeint" ? "Expected an integer within the JavaScript safe integer range." : "Expected a finite 64-bit floating point number.");
    return value;
  }
  if (schema === "void") {
    if (value !== null) throw new IpcValidationError(path, "Expected a null wire value for a void result.");
    return void 0;
  }
  if ("nullable" in schema) return value === null ? null : decodeValue(schema.nullable, value, models, path, depth + 1);
  if ("optional" in schema) return value === void 0 ? void 0 : decodeValue(schema.optional, value, models, path, depth + 1);
  if ("enum" in schema) {
    if (typeof value !== "string" || !schema.enum.includes(value))
      throw new IpcValidationError(path, `Expected one of: ${schema.enum.map((item) => JSON.stringify(item)).join(", ")}.`);
    return value;
  }
  if ("array" in schema) {
    if (!Array.isArray(value)) throw new IpcValidationError(path, "Expected an array.");
    for (const key of Object.keys(value)) {
      if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length)
        throw new IpcValidationError(`${path}.${key}`, "Unknown array field.");
    }
    const result2 = [];
    for (let index = 0; index < value.length; index++) {
      const property = Object.getOwnPropertyDescriptor(value, index);
      if (!property || !("value" in property)) throw new IpcValidationError(`${path}[${index}]`, "An array element is required.");
      result2.push(decodeValue(schema.array, property.value, models, `${path}[${index}]`, depth + 1));
    }
    return result2;
  }
  if ("model" in schema) {
    const model = Object.hasOwn(models, schema.model) ? models[schema.model] : void 0;
    if (!model) throw new IpcValidationError(path, `Unknown model ${schema.model}.`);
    return decodeValue(model, value, models, path, depth + 1);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new IpcValidationError(path, "Expected an object.");
  const fields = schema.object;
  for (const key of Object.keys(value)) {
    if (!Object.hasOwn(fields, key)) throw new IpcValidationError(`${path}.${key}`, "Unknown field.");
  }
  const result = /* @__PURE__ */ Object.create(null);
  for (const [key, field] of Object.entries(fields)) {
    const property = Object.getOwnPropertyDescriptor(value, key);
    const optional = typeof field === "object" && "optional" in field;
    if (!property && optional) continue;
    if (!property || !("value" in property)) throw new IpcValidationError(`${path}.${key}`, "A data field is required.");
    if (optional && property.value === void 0) continue;
    result[key] = decodeValue(field, property.value, models, `${path}.${key}`, depth + 1);
  }
  return result;
}

// packages/adofai-ipc/src/index.ts
function defineContract(definition) {
  if (!/^[a-z0-9-]+$/.test(definition.id) || !/^[a-f0-9]{64}$/.test(definition.hash)) throw new TypeError("Invalid IPC contract identity.");
  function freeze(value) {
    if (value && typeof value === "object") {
      for (const item of Object.values(value)) freeze(item);
      Object.freeze(value);
    }
    return value;
  }
  return freeze(definition);
}
var IpcCallError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "IpcCallError";
  }
};
var registrationOutput = { object: { appId: "string", sessionId: "string" } };
function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (!globalThis.crypto?.getRandomValues) throw new Error("A cryptographic random source is required to register an IPC app.");
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
var AppRegistration = class {
  constructor(options, settings = {}) {
    this.appId = uuid();
    this.bindings = /* @__PURE__ */ new Map();
    this.lifetime = new AbortController();
    if (!options || typeof options.displayName !== "string" || !options.displayName.trim() || options.displayName.length > 200)
      throw new TypeError("A displayName of 1\u2013200 characters is required.");
    this.displayName = options.displayName;
    this.timeoutMs = settings.requestTimeoutMs ?? 3e4;
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) throw new TypeError("Invalid IPC request timeout.");
    this.connection = new IpcConnection(settings);
    this.offState = this.connection.onState((state) => {
      if (state === "incompatible") this.lifetime.abort(new IpcCallError("protocol_mismatch", "The IPC runtime uses an incompatible protocol."));
    });
  }
  use(contract, handlers) {
    this.check();
    if (this.bindings.has(contract.id)) throw new Error(`This app already uses ${contract.id}.`);
    if (!handlers || typeof handlers !== "object") throw new TypeError("App handlers must be an object.");
    const implementations = handlers;
    for (const name of Object.keys(contract.app)) {
      if (!Object.hasOwn(implementations, name) || typeof implementations[name] !== "function") throw new TypeError(`Missing app handler: ${name}.`);
    }
    for (const name of Object.keys(implementations)) {
      if (!Object.hasOwn(contract.app, name)) throw new TypeError(`Unknown app handler: ${name}.`);
    }
    const binding = new ContractBinding(this, this.connection, contract, implementations, this.lifetime.signal, this.timeoutMs);
    this.bindings.set(contract.id, binding);
    void this.connection.start().catch(() => {
    });
    return binding.api;
  }
  dispose() {
    if (this.lifetime.signal.aborted && this.connection.state === "closed") return;
    this.lifetime.abort(new IpcCallError("disposed", "The app registration has been disposed."));
    for (const binding of this.bindings.values()) binding.dispose();
    this.bindings.clear();
    this.offState();
    this.connection.close();
  }
  /** Recheck app availability when the page returns from suspension. */
  checkConnection() {
    this.check();
    this.connection.checkConnection();
  }
  check() {
    if (this.lifetime.signal.aborted) throw this.lifetime.signal.reason;
  }
};
var ContractBinding = class {
  constructor(app, connection, contract, handlers, signal, timeoutMs) {
    this.app = app;
    this.connection = connection;
    this.contract = contract;
    this.handlers = handlers;
    this.signal = signal;
    this.timeoutMs = timeoutMs;
    this.pending = /* @__PURE__ */ new Map();
    this.cleanup = [];
    this.statuses = /* @__PURE__ */ new Set();
    this.status = "unavailable";
    this.epoch = 0;
    this.disposed = false;
    this.raw = connection.namespace(contract.id, 1);
    const api = /* @__PURE__ */ Object.create(null);
    api.ready = () => this.ready();
    api.onStatus = (listener) => {
      this.check();
      if (typeof listener !== "function") throw new TypeError("A status listener is required.");
      this.statuses.add(listener);
      try {
        listener(this.status, this.statusError);
      } catch {
      }
      return () => this.statuses.delete(listener);
    };
    Object.defineProperties(api, {
      status: { enumerable: true, get: () => this.status },
      sessionId: { enumerable: true, get: () => this.sessionId }
    });
    for (const [name, method] of Object.entries(contract.mod)) {
      if (["ready", "onStatus", "status", "sessionId", "then", "constructor"].includes(name)) throw new TypeError(`Reserved IPC method name: ${name}.`);
      api[name] = async (input) => {
        const request = decodeValue(method.input, input === void 0 ? {} : input, contract.models);
        await this.ready();
        return this.request(method.wireName, request, method.output);
      };
    }
    this.api = Object.freeze(api);
    this.cleanup.push(this.raw.on("rpc.result", (value, message) => this.receive(value, message, false)));
    for (const name of ["rpc.error", "command.rejected", "command.failed"]) {
      this.cleanup.push(this.raw.on(name, (value, message) => this.receive(value, message, true)));
    }
    for (const [name, method] of Object.entries(contract.app)) {
      this.cleanup.push(this.raw.onCommand(method.wireName, (payload, message) => {
        void this.handleApp(name, method, payload, message);
      }));
    }
    this.cleanup.push(this.raw.onStatus((status, error) => {
      if (status === "ready") {
        void this.ready().catch(() => {
        });
      } else {
        this.epoch++;
        this.sessionId = void 0;
        this.registration = void 0;
        const reason = new IpcCallError(error?.code ?? "unavailable", error?.message ?? "The mod is no longer available.");
        this.failAll(reason);
        this.setStatus(status, status === "error" ? reason : void 0);
      }
    }));
    const abort = () => {
      this.epoch++;
      this.sessionId = void 0;
      this.failAll(signal.reason);
      this.setStatus("error", signal.reason instanceof IpcCallError ? signal.reason : new IpcCallError("disposed", "The app registration has been disposed."));
    };
    signal.addEventListener("abort", abort, { once: true });
    this.cleanup.push(() => signal.removeEventListener("abort", abort));
  }
  check() {
    if (this.signal.aborted) throw this.signal.reason;
    if (this.disposed) throw new IpcCallError("disposed", "The channel has been disposed.");
  }
  async ready() {
    this.check();
    await this.raw.whenReady({ signal: this.signal });
    this.check();
    const connection = this.connection.connectionId;
    if (!connection) throw new IpcCallError("unavailable", "The app is disconnected.");
    if (!this.registration || this.registration.connection !== connection) {
      const epoch = this.epoch;
      this.setStatus("initializing");
      const promise = this.request("rpc.register", {
        appId: this.app.appId,
        displayName: this.app.displayName,
        contractHash: this.contract.hash
      }, registrationOutput).then((value) => {
        if (epoch !== this.epoch || connection !== this.connection.connectionId) throw new IpcCallError("unavailable", "The app registration has expired.");
        this.check();
        const registered = value;
        if (registered.appId !== this.app.appId || !registered.sessionId) throw new IpcCallError("invalid_response", "Invalid app registration response.");
        this.sessionId = registered.sessionId;
        this.setStatus("ready");
      }).catch((error) => {
        if (epoch === this.epoch && connection === this.connection.connectionId && !this.signal.aborted && !this.disposed)
          this.setStatus("error", error instanceof IpcCallError ? error : new IpcCallError("invalid_response", error instanceof Error ? error.message : "The mod rejected app registration."));
        throw error;
      });
      this.registration = { connection, promise };
    }
    await this.registration.promise;
  }
  request(name, input, output) {
    this.check();
    if (this.pending.size >= 256) return Promise.reject(new IpcCallError("busy", "Too many pending IPC calls."));
    const id = uuid();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new IpcCallError("timeout", "The IPC call timed out. Its side effects may already have occurred."));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, output, timer });
      try {
        this.raw.send(name, input, { id, signal: this.signal });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }
  receive(value, message, failed) {
    if (!message.correlationId) return;
    const pending = this.pending.get(message.correlationId);
    if (!pending) return;
    this.pending.delete(message.correlationId);
    clearTimeout(pending.timer);
    if (failed) {
      const error = value;
      pending.reject(new IpcCallError(
        typeof error?.code === "string" ? error.code : "invalid_response",
        typeof error?.message === "string" ? error.message : "Invalid IPC error response."
      ));
      return;
    }
    try {
      pending.resolve(decodeValue(pending.output, value, this.contract.models));
    } catch (error) {
      pending.reject(error);
    }
  }
  async handleApp(name, method, payload, message) {
    const connectionId = this.connection.connectionId;
    const epoch = this.epoch;
    let id = message.id;
    let code = "invalid_request";
    try {
      this.check();
      const envelope = payload;
      if (!envelope || typeof envelope.callId !== "string" || !envelope.callId || envelope.callId.length > 128 || typeof envelope.sessionId !== "string" || !envelope.sessionId) throw new TypeError("Invalid app call envelope.");
      id = envelope.callId;
      await Promise.resolve();
      const registration = this.registration;
      if (!registration || registration.connection !== connectionId) return;
      await registration.promise;
      if (epoch !== this.epoch || connectionId !== this.connection.connectionId || envelope.sessionId !== this.sessionId) return;
      this.check();
      const request = decodeValue(method.input, envelope.args, this.contract.models);
      code = "handler_failed";
      const handler = this.handlers[name];
      const result = await handler(request);
      if (epoch !== this.epoch || connectionId !== this.connection.connectionId) return;
      this.check();
      code = "invalid_result";
      if (method.output === "void" && result !== void 0) throw new IpcValidationError("$", "A void handler must not return a value.");
      const value = decodeValue(method.output, method.output === "void" ? null : result, this.contract.models);
      this.raw.reply(id, "rpc.result", method.output === "void" ? null : value);
    } catch (error) {
      if (this.disposed || this.signal.aborted || epoch !== this.epoch || connectionId !== this.connection.connectionId) return;
      try {
        this.raw.reply(id, "rpc.error", { code, message: error instanceof Error ? error.message : "App handler failed." });
      } catch {
      }
    }
  }
  failAll(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
  setStatus(status, error) {
    if (this.status === status && this.statusError?.code === error?.code && this.statusError?.message === error?.message) return;
    this.status = status;
    this.statusError = error;
    for (const listener of [...this.statuses]) {
      try {
        listener(status, error);
      } catch {
      }
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.epoch++;
    this.sessionId = void 0;
    this.failAll(new IpcCallError("disposed", "The channel has been disposed."));
    this.setStatus("unavailable");
    this.statuses.clear();
    for (const off of this.cleanup.splice(0)) off();
  }
};
function createIpc(options = {}) {
  return { registerApp: (app) => new AppRegistration(app, options) };
}
var ipc = createIpc();
export {
  AppRegistration,
  IpcCallError,
  IpcValidationError,
  createIpc,
  defineContract,
  ipc
};
