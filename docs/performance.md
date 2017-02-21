# Performance

Performance benchmark vs RabbitMQ.

---

Performance was measured with two key indicators in mind:

* Message Throughput - the number of messages per second that can be pushed and consumed from a queue
* Message Throughout Consistency - how consistent the throughput is over time

There is also a third indicator that might be interesting to examine and that is "Queue Open/Close Throughout".
I'm pretty sure there's place for improvement there, so no benchmarking was performed in that area.

## The Environment

The benchmark was performed on two [c3.xlarge AWS machines](http://aws.amazon.com/ec2/instance-types/) running Debian 7.
Each machine has 4 Intel(R) Xeon(R) CPU E5-2680 v2 @ 2.80GHz and 7.5GB of RAM.

One machine was setup to run 4 instances of redis 2.8.19. Redis is single threaded so it can only utilize one CPU.

A second machine was setup to run 4 node busmq processes executing the benchmarking code.
Each one of the 4 node processes connected to all of the 4 redis instances running on the first machine.

## Benchmark Flow

The benchmark flow is as follows:

* start up 4 node processes (one per cpu)
* on startup, the node process creates 100 queues
* once all the nodes of all the processes have been created, every process performs:
  * initiate a report cycle of 2 seconds
  * push/consume 32 byte messages as fast as possible to/from all queues
  * report the number of pushed and consumed messages per cycle
  * reset the pushed and consumed message counters at the end of every cycle
* run a total of 100 cycles

## Results

Benchmarks are only good for what they actually measure.
There are always use cases that do no align with the results so be careful with any conclusions.
It's advised to perform your own performance tests with *your* use cases and setups in mind.

On average, the benchmark shows every second about 10400 messages were pushed and 9973 messages were consumed.
It is also apparent that the push/consume throughput is quite consistent over time.
(The X-axis shows the cycle number, the Y-axis shows the number of messages)

![Benchmark results](img/busmq-benchmark.png)

Additional testing indicates that the size of the messages has little to no impact on the throughput.
However, increasing the number of queues by an order of magnitude does effect the performance.
