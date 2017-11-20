# <img src="https://capriza.github.io/images/logos/logos-busmq.svg" height="78" align="center" /> BusMQ

BusMQ is a production grade message bus for node.js backed by [Redis](http://redis.io/) queues.

---

## Features

* Event based message queues
* Event based bi-directional channels for peer-to-peer communication (backed by message queues)
* Service endpoints based on request/response for microservices architecture
* Publish/Subscribe channels
* Reliable delivery of messages (AKA Guaranteed Delivery)
* Persistent Publish/Subscribe (backed by message queues)
* Federation over distributed data centers
* Discoverable queues over federation
* Auto expiration of queues after a pre-defined idle time
* Scalability through the use of multiple redis instances and node processes
* High availability through redis master-slave setup and stateless node processes
* Tolerance to dynamic addition of redis instances
* Choice of connection driver - [node_redis](https://github.com/NodeRedis/node_redis) or [ioredis](https://github.com/luin/ioredis) (thanks to [bgrieder](https://github.com/bgrieder))
* Out-of-the-box support for Redis Sentinels and Clusters when using ioredis driver (thanks to [bgrieder](https://github.com/bgrieder))
* Connect to the bus from a browser (via federation)


## Motivation

There are several exiting node modules that provide great queues-backed-by-redis functionality,
such as [Kue](https://github.com/learnboost/kue), [Bull](https://github.com/OptimalBits/bull) and
[Convoy](https://github.com/gosquared/convoy), so what's so special about busmq?

Although seemingly the other modules provide similar features, they lack a very specific feature that's required
for a reliable message queue: guaranteed order. *Jobs* is the main focus for these modules, whereas busmq focuses on
*messages*.

Inherently, job processing does not require a certain order - if a job fails it can simply be retried
at a later time with (usually) no ill-effects. However, message processing is very order dependant - if you receive a message
out of order then there's no telling what the consequences may be. A good example is
[TCP message order importance](http://en.wikipedia.org/wiki/Out-of-order_delivery) - clients are guaranteed
that TCP packets are *always* received in the correct order. That's what busmq focuses on, which makes busmq much
more like [RabbitMQ](http://www.rabbitmq.com/) rather than a generic queueing system.

Of course, the other modules may double as messages queues, but that's just not their main focus. In addition, busmq
provides built-in features for peer-to-peer communication, scaling, high-availability and federation which are extremely important for a reliable
messaging system.

## High Availability and Scaling

Scaling is achieved by spreading queues and channels between multiple redis instances.
The redis instance is selected by performing a calculation on the queue/channel name.
If the redis instances are added and the designated redis instance of a queue changes because of it then
the bus will still find the correct redis instance. There will be some time penalty until the system
stabilizes after the addition.

High availability for redis is achieved by using standard redis high availability setups, such as
[Redis Cluster](http://redis.io/topics/cluster-tutorial), [Redis Sentinal](http://redis.io/topics/sentinel) or [AWS ElasticCache](http://aws.amazon.com/elasticache/)

## Installation

```no-highlight
npm install --save busmq
```

## Usage

See [Usage](usage.md)

## Browser Support

See [Usage#Browser Support](usage.md#browser-support)

## Tests

Redis server must be installed to run the tests, but does not need to be running.
Download redis from [https://redis.io](https://redis.io).

```no-highlight
./node_modules/mocha/bin/mocha test
```


