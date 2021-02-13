// Type definitions for busmq 3.1
// Project: https://github.com/npm/node-busmq
// Definitions by: Peter Schmidt <https://github.com/pesi->
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/busmq

import {Server as HttpsServer} from "https";
import {Server as HttpServer} from "http";
import EventEmitter = require("events");

// export const SEMVER_SPEC_VERSION: "2.0.0";
// export type ReleaseType = "major" | "premajor" | "minor" | "preminor" | "patch" | "prepatch" | "prerelease";

/**
 * All possible log-levels.
 */
export type LogLevel = "log" | "exception" | "fatal" | "error" | "warning" | "warn" | "info" | "debug" | "trace";

/**
 * Specifies the interface a logger has to implement to be usable with busmq.
 */
export interface Logger {
    log(message : string);
    exception?(message : string);
    fatal?(message : string);
    error?(message : string);
    warning?(message : string);
    warn?(message : string);
    info?(message : string);
    debug?(message : string);
    trace?(message : string);
}

/**
 * Defines the options to connect to a federated bus.
 */
export interface FederationClientOptions {

    /**
     *  A secret key to authenticate with the federates. this key must be shared among all federates. default is 'notsosecret'.
     */
    secret:  string;

    /**
     *  The number of web sockets to keep open and idle at all times to federated bus instances. Default is 10.
     */
    poolSize: number;

    /**
     * An array of urls of the form http[s]://<ip-or-host>[:port] of other bus instances that this bus can federate to. Default is an empty array.
     */
    urls: string[];
}

/**
 * Defines the options to create a federated bus.
 */
export interface FederationServerOptions {

    /**
     *  A secret key to authenticate with the federates. this key must be shared among all federates. default is 'notsosecret'.
     */
    secret:  string;

    /**
     * An http/https server object to listen for incoming federate connections. If undefined, then federation server will not be open.
     */
    server: HttpServer | HttpsServer;

    /**
     * Specifies the path within the server to accept federation connections on.
     */
    path:   string;
}

/**
 * Defines the options to create a new <Bus> instance.
 */
export interface BusOptions {
    /**
     * Specify the redis connection driver to use. This should be either 'node-redis' or 'ioredis'. The default is 'node-redis'.
     */
    driver?: string;

    /**
     * Specifies the type of redis setup to connect to. This should be one of 'direct', 'cluster' or 'sentinels'. The default is 'direct'.
     *      'direct': direct connection to redis instances (default)
     *      'sentinels': urls provided are that of sentinels (only supported by the ioredis driver)
     *      'cluster': urls provided belong to a redis cluster (only supported by the ioredis driver)
     */
    layout?: string;

    /**
     * Specifies the redis servers to connect to. Can be a string or an array of string urls. A valid url has the form redis://[auth_pass@]<host_or_ip>[:port].
     */
    redis: string | string[];

    /**
     * Options to pass to the redis client on instantiation (defaults to {}). Driver specific.
     */
    redisOptions?: any;

    /**
     * The options to use for federation.
     */
    federate?: FederationServerOptions | FederationClientOptions;

    /**
     * A Logger to log to.
     */
    logger?: Logger;

    /**
     * The log-level to use.
     */
    logLevel?: LogLevel;
}

/**
 * All possible Bus-events.
 */
export type BusEvents = "online" | "offline" | "error";

/**
 * A message bus.
 *
 * Events:
 *  online - emitted when the bus has successfully connected to all of the specified redis instances.
 *  offline - emitted when the bus loses connections to the redis instances.
 *  error - an error occurs.
 */
export class Bus extends EventEmitter {

    /**
     * Creates a new Bus instance.
     * @param options - the options to use.
     */
    constructor(options: BusOptions);

    /**
     * Turn debug messages to the log on or off.
     * @param on
     */
    debug(on:boolean) : Bus;

    /**
     * Attach a logger to the bus instance.
     * @param logger
     */
    withLog(logger: Logger) : Bus;

    /**
     * Connect to the redis servers and start the federation server (if one was specified).
     * Once connected to all redis instances, the online event will be emitted.
     * If the bus gets disconnected from the the redis instances, the offline event will be emitted.
     */
    connect();

    /**
     * Returns whether the bus is online or not;
     */
    isOnline() : boolean;

    /**
     * Disconnect all redis connections, close the fedserver and close all the wspool websocket connections.
     */
    disconnect();

    /**
     * Provide a connection to redis for the specified key.
     * If the key already exists, then a connection to the correct redis is provided.
     * Otherwise, a connection to the correct redis is calculated from the key.
     * @param key - the key to get the connection for. If not specified, return the first connection.
     * @param cb - callback of the form function(connection). Note that the provided connection object exposes redis commands directly.
     */
    connection(key: string, cb?: (connection: Connection) => any);

    /**
     * Create a new Queue.
     * Call queue.attach before using the queue!
     * @param name - the name of the queue.
     */
    queue(name: string) : Queue;

    /***
     * Create a new bi-directional channel.
     * @param name - the name of the channel.
     * @param local - [optional] specifies the local role. default is local.
     * @param remote - [optional] specifies the remote role. default is remote.
     */
    channel(name: string, local?: string, remote?: string) : Channel;

    /**
     * Create a new pubsub channel.
     * @param name - name of the pubsub channel.
     */
    pubsub(name: string) : PubSub;

    /**
     * Create a new service object.
     * Call service.serve or service.connect before using service instance!
     * @param name - the name of the service.
     */
    service(name: string): Service;

    /**
     * Federate an object to the specified remote bus instead of hosting the object on the local redis servers.
     * Do not use any of the object API's before federation setup is complete (only after the 'ready' event is emitted).
     * @param object - queue, channel, service or persisted object to federate. These are created normally through bus.queue, bus.channel, bus.service and bus.persistify.
     * @param target - the target bus url or an already open websocket to the target bus. The url has the form http[s]://<location>[:<port>].
     */
    federate(object: Queue | PromisifiedQueue | Channel | PromisifiedChannel | Service | PromisifiedService | IPersistable | PubSub | PromisifiedPubSub , target: string): Federation;

    /**
     * Create a new Persistable object. Persistifying an object adds additional methods to the persistified object.
     * See the API for more details.
     * @param name - name of the object.
     * @param object - the object to persist.
     * @param attributes - array of property names to persist in the object. The properties will be automatically defined on the object.
     */
    persistify(name: string, object: any, attributes: string[]) : IPersistable;

    /**
     * Convert the specified methods in the provided object into promise based methods instead of callback based methods.
     * Once the methods are promisified, it is possible to use them with async/await. Returns the object itself.
     * @param object - the object whose methods to convert.
     * @param methods - the method names to convert.
     */
    promisify(object: any, methods: string[]) : any;
}

/**
 * A connection to redis.
 * Connects to redis with a write connection and a read connection.
 * The write connection is used to emit commands to redis.
 * The read connection is used to listen for events.
 * This is required because once a connection is used to wait for events, it cannot be used to issue further requests.
 */
export class Connection extends EventEmitter {

    /**
     * Creates a new Connection instance.
     * @param index - the index of the connection within the hosting bus.
     * @param bus - the bus object using the connection.
     */
    constructor(index, bus : Bus);

    /**
     * Returns true if both redis connections are ready.
     */
    isReady() : boolean;

    /**
     * Connects to redis.
     */
    connect();

    /**
     * Disconnect from redis. Ends all redis connections.
     */
    disconnect();
}

/**
 * The options how to create a queue.
 */
export interface QueueOptions {

    /**
     * Duration in seconds for the queue to live without any attached clients. Default is 30 seconds.
     */
    ttl?: number;

    /**
     * The maximum number of messages the queue can contain.
     * Pushing a message to a full queue results in the push callback being called with id set to null. Default is 0 (unlimited).
     */
    maxsize?: number;

    /**
     * Whether this queue should notify all the federating buses connected to this bus about this queue.
     * Finding a discoverable queue is performed using the queue.find# method. default is false.
     */
    discoverable?: boolean;
}

/**
 * The options how to consume messages from a queue.
 */
export interface ConsumeOptions {

    /**
     *  If specified, only max messages will be consumed from the queue.
     *  If not specified, messages will be continuously consumed as they are pushed into the queue.
     *  Default is undefined.
     */
    max?: number;

    /**
     * True indicates to remove a read message from the queue, and false leaves it in the queue so that it may be read once more.
     * Default is true.
     * Note: The behavior of mixing consumers that remove messages with consumers that do not remove messages from the same queue is undefined.
     */
    remove?: boolean;

    /**
     * Applicable only if remove is true.
     * Indicates that every consumed message needs to be ACKed in order not to receive it again in case of calling consume again.
     * See queue.ack for ack details. Default is false.
     */
    reliable?: boolean;

    /**
     * Applicable only if reliable is true.
     * Indicates the last message id that was ACKed so that only messages with higher id's should be received.
     * If any messages still exist in the queue with id's lower than last they will be discarded.
     * This behaves exactly like calling queue.ack with the last id before starting to consume. Default is 0.
     */
    last?: number;

    /**
     * The request timeout, overriding the default request timeout.
     */
    reqTimeout?: number;
}

/**
 * All possible Bus-events.
 */
export type QueueEvents = "attaching" | "attached" | "detaching" | "detached" | "consuming" | "message" | "error";

/**
 * A queue of messages.
 * Messages are pushed to the queue and consumed from it in they order that they were pushed.
 * Any number of clients can produce messages to a queue, and any number of consumers can consume messages from a queue.
 *
 * Do not instantiate directly, instead use {Bus#queue} to create a new Queue!
 *
 * Events:
 *   attaching  - emitted when starting to attach.
 *   attached   - emitted when attached to the queue. The listener callback receives true if the queue already exists and false if it was just created.
 *   detaching  - emitted when starting to detach.
 *   detached   - emitted when detached from the queue. If no other clients are attached to the queue, the queue will remain alive for the ttl duration.
 *   consuming  - emitted when starting or stopping to consume messages from the queue. The listener callback will receive true if starting to consume and false if stopping to consume.
 *   message    - emitted when a message is consumed from the queue. The listener callback receives the message as a string and the id of the message as an integer.
 *   error      - emitted when some error occurs. The listener callback receives the error.
 */
export class Queue extends EventEmitter {

    /**
     * Creates a new Queue instance.
     * Do not instantiate directly, instead use {Bus#queue} to create a new Queue!
     * @param bus - the bus the queue belongs to.
     * @param name - the name of the queue.
     */
    constructor(bus: Bus, name:string);

    /**
     * Attach to the queue. If the queue does not already exist it is created. Once attached, the attached event is emitted.
     * Events:
     *   attaching - starting to attach to the queue
     *   attached  - messages can be pushed to the queue or consumed from it.
     *               receives a boolean indicating whether the queue already existed (true) or not (false)
     *   error     - some error occurred.
     *
     * @param options - the options to use.
     */
    attach(options : QueueOptions);

    /**
     * Detach from the queue. The queue will continue to live for as long as it has at least one attachment.
     * Once a queue has no more attachments, it will continue to exist for the predefined ttl, or until it is attached to again.
     *
     * Events:
     *    detached - detached from the queue
     *    error    - some error occurred
     */
    detach();

    /**
     * Push a message to the queue. The message can be a JSON object or a string.
     * The message will remain in the queue until it is consumed by a consumer or until the queue is closed or until it expires.
     * @param message - the message to push.
     * @param callback  - invoked after the message was actually pushed to the queue. Receives err and the id of the pushed message.
     */
    push(message: object | string, callback?: (err: string, resp: any) => any );

    /**
     * Start consuming messages from the queue. The message event is emitted whenever a message is consumed from the queue.
     * To stop consuming messages call Queue#stop.
     *
     *  Events:
     *    consuming - the new consuming state (true), after which message events will start being fired
     *    message   - received a message from the queue
     *    error     - the queue does not exist, or some error occurred
     *
     * @param options
     */
    consume(options : ConsumeOptions);

    /**
     * Specifies that the message with the specified id, and all messages with lower id's, can safely be discarded so that they should never be consumed again.
     * Ignored if not consuming in reliable mode.
     * @param id - the message id to ack
     * @param callback - invoked after the message was actually acked. receives err.
     */
    ack(id : number, callback?: (err: string) => any);

    /**
     * Returns true if this client is consuming messages, false otherwise.
     * @param callback - receives err and the consuming state
     */
    isConsuming(callback?: (err: string, isConsuming: boolean) => any);

    /**
     * Stop consuming messages from the queue.
     *
     * Events:
     *    consuming - the new consuming state, which will be false when no longer consuming
     *    error     - on some error
     */
    stop();

    /**
     * Closes the queue and destroys all pending messages. No more messages can be pushed or consumed.
     * Clients attempting to attach to the queue will receive the closed event.
     * Clients currently attached to the queue will receive the closed event.
     * Events:
     *    error  - some error occurred
     *    closed - the queue was closed
     */
    close();

    /**
     * Empty the queue, removing all messages.
     * @param callback - invoked after the queue was flushed. receives err.
     */
    flush(callback?: (err: string, resp: any) => any);

    /**
     * Checks if the queue exists in the local bus.
     * @param callback  - receives err and result with a value of true if the queue exists, false otherwise
     */
    exists(callback?: (err: string, exists: boolean) => any);

    /**
     * Checks if the queue already exists in the local bus or a federated bus.
     * Note that a queue can only be found if the federated bus has announced its existence to the federating buses.
     * This is something that happens periodically during the lifecycle of the queue, where the frequency depends on the ttl of the queue.
     * Normally this method would be called before calling queue.attach.
     * @param callback -  receives err and the location of the queue.
     *                    If the queue exists locally, location will be set to local.
     *                    If the queue exists in a federated bus, location will be set to the url of the federated bus.
     *                    If the queue is not found, location is set to null.
     */
    find(callback?: (err: string, location: string) => any);

    /**
     * Get the number if messages in the queue.
     * @param callback - receives err and the number of messages in the queue.
     */
    count(callback?: (err: string, count: number) => any);

    /**
     * Get the time in seconds for the queue to live without any clients attached to it.
     * @param callback - receives err and the ttl in seconds.
     */
    ttl(callback?: (err: string, ttl: number) => any);

    /**
     * Get or set arbitrary metadata on the queue.
     * Will set the metadata key to the provided value, or get the current value of the key if the value parameter is not provided.
     * @param key - the metadata key to set or get.
     *               If key and value is not provided then all the metadata values will be retrieved.
     *               If key is an object, all object values will be set in the metadata.
     * @param value - [optional] the value to set on the key. If a value is not provided, the metadata will be retrieved.
     * @param callback - receives err as the first argument.
     *                   If setting a metadata value, it is called with no further arguments.
     *                   If retrieving the value, it is called with the retrieved value.
     */
    metadata( key: string, value?: any, callback?: (err: string, value?: any) => any);

    /**
     * Returns the number of messages pushed by this client to the queue.
     * @param callback - receives err and the number of pushed messages.
     */
    pushed(callback?: (err: string, count: number) => any);

    /**
     * Returns the number of messages consumed by this client from the queue.
     * @param callback - receives err and the number of consumed messages.
     */
    consumed(callback?: (err: string, count: number) => any);

    /**
     * Convert the eligible methods to promise based methods instead of callback based.
     * @returns the promisified queue
     */
    promisify() : PromisifiedQueue;
}

/**
 * A queue of messages.
 * Messages are pushed to the queue and consumed from it in they order that they were pushed.
 * Any number of clients can produce messages to a queue, and any number of consumers can consume messages from a queue.
 *
 * Do not instantiate directly, instead use {Bus#queue} to create a new Queue!
 *
 * Events:
 *   attaching   - emitted when starting to attach.
 *   attached    - emitted when attached to the queue. The listener callback receives true if the queue already exists and false if it was just created.
 *   detaching   - emitted when starting to detach.
 *   detached    - emitted when detached from the queue. If no other clients are attached to the queue, the queue will remain alive for the ttl duration.
 *   consuming   - emitted when starting or stopping to consume messages from the queue. The listener callback will receive true if starting to consume and false if stopping to consume.
 *   message     - emitted when a message is consumed from the queue. The listener callback receives the message as a string and the id of the message as an integer.
 *   error       - emitted when some error occurs. The listener callback receives the error.
 */
export class PromisifiedQueue extends EventEmitter {

    /**
     * Creates a new Queue instance.
     * Do not instantiate directly, instead use {Bus#queue#promisify} to create a new promisified queue!
     * @param bus - the bus the queue belongs to.
     * @param name - the name of the queue.
     */
    constructor(bus: Bus, name:string);

    /**
     * Attach to the queue. If the queue does not already exist it is created. Once attached, the attached event is emitted.
     * Events:
     *   attaching - starting to attach to the queue
     *   attached  - messages can be pushed to the queue or consumed from it.
     *               receives a boolean indicating whether the queue already existed (true) or not (false)
     *   error     - some error occurred.
     *
     * @param options - the options to use.
     */
    attach(options : QueueOptions);

    /**
     * Detach from the queue. The queue will continue to live for as long as it has at least one attachment.
     * Once a queue has no more attachments, it will continue to exist for the predefined ttl, or until it is attached to again.
     *
     * Events:
     *    detached - detached from the queue
     *    error    - some error occurred
     */
    detach();

    /**
     * Push a message to the queue. The message can be a JSON object or a string.
     * The message will remain in the queue until it is consumed by a consumer or until the queue is closed or until it expires.
     * @param message - the message to push.
     * @returns the id of the pushed message.
     */
    push(message: object | string): Promise<any>;

    /**
     * Start consuming messages from the queue. The message event is emitted whenever a message is consumed from the queue.
     * To stop consuming messages call Queue#stop.
     *
     *  Events:
     *    consuming - the new consuming state (true), after which message events will start being fired
     *    message   - received a message from the queue
     *    error     - the queue does not exist, or some error occurred
     *
     * @param options
     */
    consume(options : ConsumeOptions);

    /**
     * Specifies that the message with the specified id, and all messages with lower id's, can safely be discarded so that they should never be consumed again.
     * Ignored if not consuming in reliable mode.
     * @param id - the message id to ack
     */
    ack(id : number): Promise<void>;

    /**
     * Returns true if this client is consuming messages, false otherwise.
     * @param callback - receives err and the consuming state
     */
    isConsuming(callback?: (err: string, isConsuming: boolean) => any);

    /**
     * Stop consuming messages from the queue.
     *
     * Events:
     *    consuming - the new consuming state, which will be false when no longer consuming
     *    error     - on some error
     */
    stop();

    /**
     * Closes the queue and destroys all pending messages. No more messages can be pushed or consumed.
     * Clients attempting to attach to the queue will receive the closed event.
     * Clients currently attached to the queue will receive the closed event.
     * Events:
     *    error  - some error occurred
     *    closed - the queue was closed
     */
    close();

    /**
     * Empty the queue, removing all messages.
     * @returns Invoked after the queue was flushed.
     */
    flush(): Promise<any>;

    /**
     * Checks if the queue exists in the local bus.
     * @returns a value of true if the queue exists, false otherwise.
     */
    exists(): Promise<boolean>;

    /**
     * Checks if the queue already exists in the local bus or a federated bus.
     * Note that a queue can only be found if the federated bus has announced its existence to the federating buses.
     * This is something that happens periodically during the lifecycle of the queue, where the frequency depends on the ttl of the queue.
     * Normally this method would be called before calling queue.attach.
     * @returns the location of the queue.
     *   If the queue exists locally, location will be set to local.
     *   If the queue exists in a federated bus, location will be set to the url of the federated bus.
     *   If the queue is not found, location is set to null.
     */
    find(): Promise<string>;

    /**
     * Get the number if messages in the queue.
     * @returns the number of messages in the queue.
     */
    count(): Promise<number>;

    /**
     * Get the time in seconds for the queue to live without any clients attached to it.
     * @returns The ttl in seconds.
     */
    ttl(): Promise<number>;

    /**
     * Get or set arbitrary metadata on the queue.
     * Will set the metadata key to the provided value, or get the current value of the key if the value parameter is not provided.
     * @param key - the metadata key to set or get.
     *               If key and value is not provided then all the metadata values will be retrieved.
     *               If key is an object, all object values will be set in the metadata.
     * @param value - [optional] the value to set on the key. If a value is not provided, the metadata will be retrieved.
     * @returns Nothing, if setting a metadata value.
     *          The value, if getting a metadata.
     */
    metadata( key: string, value?: any) : Promise<any>;

    /**
     * Returns the number of messages pushed by this client to the queue.
     * @returns the number of pushed messages.
     */
    pushed(): Promise<number>;

    /**
     * Returns the number of messages consumed by this client from the queue.
     * @returns the number of consumed messages.
     */
    consumed(): Promise<number>;
}

/**
 * A bi-directional message channel between two endpoints utilizing message queues.
 *
 * Events:
 *   connect           - emitted when connected to the channel
 *   remote:connect    - emitted when a remote peer connects to the channel
 *   disconnect        - emitted when disconnected from the channel
 *   remote:disconnect - emitted when the remote peer disconnects from the channel
 *   message           - emitted when a message is received from the channel. The listener callback receives the message as a string.
 *   end               - emitted when the remote peer ends the channel
 *   error             - emitted when an error occurs. The listener callback receives the error.
 */
export class Channel extends EventEmitter {

    /**
     * Creates a new bi-directional message channel between two endpoints utilizing message queues.
     * Do not instantiate directly, instead use {Bus#channel} to create a new channel!
     * @param bus - the bus the queue belongs to.
     * @param name - the name of the queue.
     * @param local - the role of the local endpoint (client/server).
     * @param remote - the role of the remote endpoint (client/server).
     */
    constructor(bus: Bus, name:string, local: string, remote: string);

    /**
     * Connect to the channel, using the 'local' role to consume messages and 'remote' role to send messages.
     * @param options - message consumption options (same as Queue#consume)
     */
    connect(options: ConsumeOptions);

    /**
     * Alias to channel.connect()
     * @param options - message consumption options (same as Queue#consume)
     */
    attach(options: ConsumeOptions);

    /**
     * Connect to the channel as a "listener", using the 'local' role to send messages and 'remote' role to consume
     * messages. This is just a syntactic-sugar for a connect with a reverse semantic of the local/remote roles.
     * @param options - message consumption options (same as Queue#consume)
     */
    listen(options: ConsumeOptions);

    /**
     * Send a message to the peer. The peer does need to be connected for a message to be sent.
     *
     * @param message  - the message to push.
     * @param callback - invoked after the message was actually pushed to the queue. Receives err and the id of the pushed message.
     */
    send(message: object | string, callback?: (err:string, resp: any) => any);

    /**
     * Send a message to the the specified endpoint. There is no need to connect to the channel with channel.connect or channel.listen.
     *
     * @param endpoint - the target endpoint to receive the message.
     * @param message  - the message to push.
     * @param callback - invoked after the message was actually pushed to the queue. Receives err and the id of the pushed message.
     */
    sendTo(endpoint, message: object | string, callback?: (err:string, resp: any) => any);

    /**
     * Disconnect this endpoint from the channel without sending the 'end' event to the remote endpoint.
     * The channel remains open and a different peer can connect to it.
     */
    disconnect();

    /**
     * Alias to channel.disconnect()
     */
    detach();

    /**
     * End the channel. No more messages can be pushed or consumed.
     * This also causes the peer to disconnect from the channel and close the message queues.
     */
    end();

    /**
     * Specifies that the message with the specified id, and all messages with lower id's, can safely be discarded so that they should never be consumed again.
     * Ignored if not consuming in reliable mode.
     * @param id - the message id to ack
     * @param callback - invoked after the message was actually acked. receives err.
     */
    ack(id : number, callback?: (err: string) => any);

    /**
     * Returns true if connected to the channel, false if not connected.
     */
    isAttached();

    /**
     * Convert the eligible methods to promise based methods instead of callback based.
     * @returns the promisified channel
     */
    promisify() : PromisifiedChannel;
}

/**
 * A bi-directional message channel between two endpoints utilizing message queues.
 *
 * Events:
 *   connect           - emitted when connected to the channel
 *   remote:connect    - emitted when a remote peer connects to the channel
 *   disconnect        - emitted when disconnected from the channel
 *   remote:disconnect - emitted when the remote peer disconnects from the channel
 *   message           - emitted when a message is received from the channel. The listener callback receives the message as a string.
 *   end               - emitted when the remote peer ends the channel
 *   error             - emitted when an error occurs. The listener callback receives the error.
 */
export class PromisifiedChannel extends EventEmitter {

    /**
     * Creates a new bi-directional message channel between two endpoints utilizing message queues.
     * Do not instantiate directly, instead use {Bus#channel} to create a new channel!
     * @param bus - the bus the queue belongs to.
     * @param name - the name of the queue.
     * @param local - the role of the local endpoint (client/server).
     * @param remote - the role of the remote endpoint (client/server).
     */
    constructor(bus: Bus, name:string, local: string, remote: string);

    /**
     * Connect to the channel, using the 'local' role to consume messages and 'remote' role to send messages.
     * @param options - message consumption options (same as Queue#consume)
     */
    connect(options: ConsumeOptions);

    /**
     * Alias to channel.connect()
     * @param options - message consumption options (same as Queue#consume)
     */
    attach(options: ConsumeOptions);

    /**
     * Connect to the channel as a "listener", using the 'local' role to send messages and 'remote' role to consume
     * messages. This is just a syntactic-sugar for a connect with a reverse semantic of the local/remote roles.
     * @param options - message consumption options (same as Queue#consume)
     */
    listen(options: ConsumeOptions);

    /**
     * Send a message to the peer. The peer does need to be connected for a message to be sent.
     *
     * @param message  - the message to push.
     * @returns the id of the pushed message.
     */
    send(message: object | string) : Promise<any>;

    /**
     * Send a message to the the specified endpoint. There is no need to connect to the channel with channel.connect or channel.listen.
     *
     * @param endpoint - the target endpoint to receive the message.
     * @param message  - the message to push.
     * @returns the id of the pushed message.
     */
    sendTo(endpoint, message: object | string) : Promise<any>;

    /**
     * Disconnect this endpoint from the channel without sending the 'end' event to the remote endpoint.
     * The channel remains open and a different peer can connect to it.
     */
    disconnect();

    /**
     * Alias to channel.disconnect()
     */
    detach();

    /**
     * End the channel. No more messages can be pushed or consumed.
     * This also causes the peer to disconnect from the channel and close the message queues.
     */
    end();

    /**
     * Specifies that the message with the specified id, and all messages with lower id's, can safely be discarded so that they should never be consumed again.
     * Ignored if not consuming in reliable mode.
     * @param id - the message id to ack
     */
    ack(id : number) : Promise<void>;

    /**
     * Returns true if connected to the channel, false if not connected.
     */
    isAttached();

    /**
     * Convert the eligible methods to promise based methods instead of callback based.
     * @returns the promisified channel
     */
    promisify() : PromisifiedChannel;
}

/**
 * It is possible to persist arbitrary objects to the bus.
 * A persistable object defines a set of properties on the object that are tracked for modification. When saving a dirty object (where dirty means that some tracked properties have changed) only those dirty properties are persisted to the bus. Loading a persistable object reads all of the persisted properties.
 */
export interface IPersistable extends EventEmitter {

    /**
     * Save all the dirty properties. The dirty properties are marked as not dirty after the save completes.
     *
     * @param callback - called when the save has finished. receives err if there was an error.
     */
    save(callback?: (err:string) => any);

    /**
     * Load all the tracked properties. All properties are marked as not dirty after the load completes.
     *
     * @param callback - called when the load has finished.
     *                   receives err, exists and id,
     *                   where exists is true if the persisted object was found in the bus
     *                   and id is the id of the object whose data was searched.
     */
    load(callback?: (err:string, exists: boolean, key: string) => any);

    /**
     * Start a periodic timer to continuously mark the persisted object as being used.
     *
     * @param ttl - specifies the number of seconds to keep the object alive in the bus.
     */
    persist(ttl: number);

    /**
     * Stop the periodic timer. This will cause object to expire after the defined ttl provided in the persist method.
     */
    unpersist();
}

export class ServiceRequestOptions {

    /**
     * The request timeout, overriding the default request timeout.
     */
    reqTimeout?: number;

    /**
     * Whether the reply received in the callback will be a Readable stream instead of the actual response.
     */
    streamReply?: boolean;
}

/**
 * A service endpoint for implementing microservice architectures.
 * A service object can either be serving requests or making requests, but it can't do both.
 * Requests to a service have the request/response form - a requester sends a request to the service, the service handles the request and then sends a reply (or error) back to the requester.
 * Replies can be streamed instead of sending them as a single response. This is useful in cases where the response is large.
 * Any number of service objects can handle requests, as well as any number of clients can make requests to the service.
 * When there are multiple service objects serving the same service endpoint, only one will ever receive any single request
 * Services do not operate in reliable mode, that is, if a request is being handled but the service handler crashes, the request is lost.
 *
 * Events:
 *   serving    - emitted when the service will start receiving request events.
 *   connected  - emitted once connected to the service as a consumer.
 *   disconnect - emitted when disconnected from the service.
 *   request    - emitted when a request is received from a requester.
 *                The event handler should have the form (request, reply), where request is the data the requester sent,
 *                and reply is a function that the service handler invokes once handling is done.
 *                It is also possible to call reply.createWriteStream() to stream the reply back to the requester.
 *   error      - emitted when an error occurs. The listener callback receives the error.
 */
export class Service extends EventEmitter {

    /**
     * Creates a new service endpoint utilizing message queues.
     * Do not instantiate directly, instead use {Bus#service} to create a new channel!
     * @param bus - the bus the service belongs to.
     * @param name - the name of the service.
     */
    constructor(bus: Bus, name: string);

    /**
     * Start serving requests made to the service. The request event will be fired when a new request arrives.
     *
     * @param options - message consumption options (same as Queue#consume) for consuming incoming request messages.
     * @param callback - one time listener for the serving event.
     */
    serve( options?: ConsumeOptions, callback?: () => any);

    /**
     * Connect to the service to start making requests.
     *
     * @param options - message consumption options (same as Queue#consume) for consuming replies.
     *                + additional property "reqTimeout" to define default request timeout for all requests can be specified.
     * @param callback - one time listener for the connected event
     */
    connect( options?: ConsumeOptions, callback?: () => any);

    /**
     * Disconnect from the service. This should be called by both a service provider and a service consumer.
     * When in serving mode, no new requests will arrive. When in requester mode, no new requests can be made.
     *
     * @param gracePeriod -  number of milliseconds to wait for any currently in-flight requests to finish handling.
     */
    disconnect( gracePeriod?: number);

    /**
     * Make a request to the service. The connect() method must be called before making any requests.

     * @param data - the request data to send to the service. Can be a string or an object.
     * @param options - the request options to use.
     * @param callback - a callback of the form function(err, reply) that will be invoked with the reply from the service.
     *                  If omitted, no reply will be sent (or received) from the service.
     */
    request(data : any, options?: ServiceRequestOptions , callback?: (err:string, reply: any) => any);

    /**
     * Convert the eligible methods to promise based methods instead of callback based.
     * @returns the promisified service.
     */
    promisify() : PromisifiedService;
}

/**
 * A service endpoint for implementing microservice architectures.
 * A service object can either be serving requests or making requests, but it can't do both.
 * Requests to a service have the request/response form - a requester sends a request to the service, the service handles the request and then sends a reply (or error) back to the requester.
 * Replies can be streamed instead of sending them as a single response. This is useful in cases where the response is large.
 * Any number of service objects can handle requests, as well as any number of clients can make requests to the service.
 * When there are multiple service objects serving the same service endpoint, only one will ever receive any single request
 * Services do not operate in reliable mode, that is, if a request is being handled but the service handler crashes, the request is lost.
 *
 * Events:
 *   serving    - emitted when the service will start receiving request events.
 *   connected  - emitted once connected to the service as a consumer.
 *   disconnect - emitted when disconnected from the service.
 *   request    - emitted when a request is received from a requester.
 *                The event handler should have the form (request, reply), where request is the data the requester sent,
 *                and reply is a function that the service handler invokes once handling is done.
 *                It is also possible to call reply.createWriteStream() to stream the reply back to the requester.
 *   error      - emitted when an error occurs. The listener callback receives the error.
 */
export class PromisifiedService extends EventEmitter {

    /**
     * Creates a new service endpoint utilizing message queues.
     * Do not instantiate directly, instead use {Bus#service} to create a new channel!
     * @param bus - the bus the service belongs to.
     * @param name - the name of the service.
     */
    constructor(bus: Bus, name: string);

    /**
     * Start serving requests made to the service. The request event will be fired when a new request arrives.
     *
     * @param options - message consumption options (same as Queue#consume) for consuming incoming request messages.
     */
    serve( options: ConsumeOptions) : Promise<void>;

    /**
     * Connect to the service to start making requests.
     *
     * @param options - message consumption options (same as Queue#consume) for consuming replies.
     *                + additional property "reqTimeout" to define default request timeout for all requests can be specified.
     */
    connect( options?: ConsumeOptions) : Promise<void>;

    /**
     * Disconnect from the service. This should be called by both a service provider and a service consumer.
     * When in serving mode, no new requests will arrive. When in requester mode, no new requests can be made.
     *
     * @param gracePeriod -  number of milliseconds to wait for any currently in-flight requests to finish handling.
     */
    disconnect( gracePeriod?: number);

    /**
     * Make a request to the service. The connect() method must be called before making any requests.

     * @param data - the request data to send to the service. Can be a string or an object.
     * @param options - the request options to use.
     */
    request(data : any, options?: ServiceRequestOptions) : Promise<any>;

}

/**
 * A plain old publish/subscribe channel.
 * These channels are not backed by queues, so any subscriber not subscribed at the time a message is published will not receive the message.
 * Publish/Subscribe channel are always created on the first redis server in the list of redis servers the bus is connected to.
 * The reason for this is the time it would take to locate a publish/subscribe channel via the redis api were the channels distributed between all redis servers (it's O(N) where N is the number of subscribers).
 *
 * Events:
 *   subscribed   - emitted when subscribed to messages on the pubsub channel
 *   unsubscribed - emitted when unsubscribing from the pubsub channel
 *   message      - emitted when a message is received from the pubsub channel. The listener callback receives the message as a string.
 *   error        - emitted when an error occurs. The listener callback receives the error.
 */
export class PubSub extends EventEmitter {

    /**
     * Creates a new Pubsub endpoint.
     * Do not instantiate directly, instead use {Bus#pubsub} to create a new Pubsub.
     * @param bus - the bus the service belongs to.
     * @param name - the name of the service.
     */
    constructor(bus: Bus, name: string);

    /**
     * Publishes a message on the pubsub channel. Only currently subscribed clients will receive the message.
     *
     * @param message - the message to publish.
     * @param callback - invoked after the message was actually published.
     *                   Receives err if there was an error.
     *                   note: starting from version 1.5.0, the callback no longer receives the number of subscribers that received the message.
     */
    publish(message : any, callback?: (err: string) => any );

    /**
     * Subscribes to message in the pubsub channel. Once a message is received, the message event will be emitted.
     */
    subscribe();

    /**
     * Unsubscribes from messages on the pubsub channel. Messages can still be published using the publish method.
     */
    unsubscribe();

    /**
     * Returns true if subscribed to messages from the pubsub channel, false if not.
     */
    isSubscribed() : boolean;

    /**
     * Convert the eligible methods to promise based methods instead of callback based.
     * @returns the promisified pubsub.
     */
    promisify() : PromisifiedPubSub;
}

/**
 * A plain old publish/subscribe channel.
 * These channels are not backed by queues, so any subscriber not subscribed at the time a message is published will not receive the message.
 * Publish/Subscribe channel are always created on the first redis server in the list of redis servers the bus is connected to.
 * The reason for this is the time it would take to locate a publish/subscribe channel via the redis api were the channels distributed between all redis servers (it's O(N) where N is the number of subscribers).
 *
 * Events:
 *   subscribed   - emitted when subscribed to messages on the pubsub channel
 *   unsubscribed - emitted when unsubscribing from the pubsub channel
 *   message      - emitted when a message is received from the pubsub channel. The listener callback receives the message as a string.
 *   error        - emitted when an error occurs. The listener callback receives the error.
 */
export class PromisifiedPubSub extends EventEmitter {

    /**
     * Creates a new Pubsub endpoint.
     * Do not instantiate directly, instead use {Bus#pubsub} to create a new Pubsub.
     * @param bus - the bus the service belongs to.
     * @param name - the name of the service.
     */
    constructor(bus: Bus, name: string);

    /**
     * Publishes a message on the pubsub channel. Only currently subscribed clients will receive the message.
     *
     * @param message - the message to publish.
     */
    publish(message : any) : Promise<void>;

    /**
     * Subscribes to message in the pubsub channel. Once a message is received, the message event will be emitted.
     */
    subscribe();

    /**
     * Unsubscribes from messages on the pubsub channel. Messages can still be published using the publish method.
     */
    unsubscribe();

    /**
     * Returns true if subscribed to messages from the pubsub channel, false if not.
     */
    isSubscribed() : boolean;
}

/**
 * A pool of websockets that keeps a minimum of open websockets to a list of bus federation servers.
 */
export class WSPool extends EventEmitter {

    /**
     * Do not instantiate directly, instead use {Bus#create} with federation options to create a new pool.
     * @param bus - the bus the service belongs to.
     * @param options - the options to use.
     */
    constructor(bus: Bus, options: FederationClientOptions);

    /**
     * Get a websocket channel from the pool for the specified url, a new channel on a random websocket will be created.
     * @param url - the url to get the websocket for. if none is available right now it will be retrieved once one is available.
     * @param callback - receives the websocket channel.
     */
    get(url : string, callback?: (err: string, channel: any) => any);

    /**
     * Close the pool and disconnect all open websockets
     */
    close();
}

/**
 * It is sometimes desirable to setup bus instances in different locations, where redis servers of one location are not directly accessible to other locations.
 * This setup is very common when building a bus that spans several data centers, where each data center is isolated behind a firewall.
 * Federation enables using queues, channels and persisted objects of a bus without access to the redis servers themselves.
 * When federating an object, the federating bus uses web sockets to the target bus as the federation channel, and the federated bus manages the object on its redis servers on behalf of the federating bus.
 * The federating bus does not host the federated objects on the local redis servers.
 * Federation is done over web sockets since they are firewall and proxy friendly.
 * The federating bus utilizes a simple pool of always-connected web sockets. When a bus is initialized, it spins up an fixed number of web sockets that connect to federated bus instances.
 * When federating an object, the bus selects a web socket from the pool and starts federating the object over it.
 * The API and events of a federated objects are exactly the same as a non-federated objects. This is achieved using the dnode module for RPCing the object API.
 *
 * Events:
 *   ready        - emitted when the federation setup is ready. The callback receives the bus object to use.
 *   unauthorized - incorrect secret key was used to authenticate with the federation server
 *   reconnecting - the federation connection was disconnected and is now reconnecting
 *   reconnected  - the federation connection has successfully reconnected
 *   close        - the federation connection closed permanently
 *   error        - some error occurred. the callback receives the error message
 */
export class Federation extends EventEmitter {

    /**
     * Creates a new Federation endpoint.
     * Do not instantiate directly, instead use {Bus#federate} to create a new Federation.
     * @param object - the object to federate.
     * @param target - the url where to federate the object.
     * @param wspool - the websocket pool to use.
     * @param options - the options to use.
     */
    constructor(object: Queue | PromisifiedQueue | Channel | PromisifiedChannel | Service | PromisifiedService | IPersistable | PubSub | PromisifiedPubSub , target: string, wspool: WSPool, options: FederationClientOptions);

    /**
     * Stop federating the object and close the channel.
     *
     * @param disconnect - true to disconnect the underlying websocket
     */
    close(disconnect : boolean);
}

/**
 * Return the parsed version as a busmq object, or null if it's not valid.
 */
export function create(options: BusOptions): Bus;
