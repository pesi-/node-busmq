var crypto = require('crypto');
var cluster = require('cluster');
var config = require('./config').sqs;
var AWS = require('aws-sdk');
AWS.config.update({region: config.region, accessKeyId: "<accessKeyId>", secretAccessKey: "<secretAccessKey>"});

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + ((err instanceof Error) ? err.stack : err));
});

// -- state
var producers = [];
var consumers = [];

// Create an SQS service object
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

for (var i = 0; i < config.numQueues; ++i) {
  setupQueue(i);
}

// -- setup queues
var queuesReady = 0;
var totalConsumed = 0;
var totalPushed = 0;
function setupQueue(i) {
  var pqName = 'w' + ((workerId + 1) % config.numWorkers) + '-q' + i;
  var cqName = 'w' + (workerId % config.numWorkers) + '-q' + i;

  sqs.createQueue({
    QueueName: pqName,
    Attributes: {}
  }, function(err, data) {
    if (err) {
      console.log("Error", err);
    } else {
//      console.log("Success", data.QueueUrl);
      producers.push(data.QueueUrl);
      if (++queuesReady === (config.numQueues * 2)) {
        // all producers and consumers are ready
        readyBenchmark();
      }
    }
  });

  sqs.createQueue({
    QueueName: cqName,
    Attributes: {}
  }, function(err, data) {
    if (err) {
      console.log("Error", err);
    } else {
//      console.log("Success", data.QueueUrl);
      consumers.push(data.QueueUrl);
      recieveMessages(data.QueueUrl);
      if (++queuesReady === (config.numQueues * 2)) {
        // all producers and consumers are ready
        readyBenchmark();
      }
    }
  });
}

function sendMessage(queueURL, message){
  var params = {
    DelaySeconds: 0,
    MessageAttributes: {
      "Title": {
        DataType: "String",
        StringValue: "The Whistler"
      },
      "Author": {
        DataType: "String",
        StringValue: "John Grisham"
      },
      "WeeksOn": {
        DataType: "Number",
        StringValue: "6"
      }
    },
    MessageBody: message,
    QueueUrl: queueURL
  };

  sqs.sendMessage(params, function(err, data) {
    if (err) {
      console.log("Error", err);
    } else {
//      console.log("Success", data.MessageId);
    }
  });
}

function recieveMessages(queueURL){
  function recieve(){
    var params = {
      AttributeNames: [
        "SentTimestamp"
      ],
      MaxNumberOfMessages: 1,
      MessageAttributeNames: [
        "All"
      ],
      QueueUrl: queueURL,
      VisibilityTimeout: 0,
      WaitTimeSeconds: 0
    };

    sqs.receiveMessage(params, function(err, data) {
      if (err) {
        console.log("Receive Error", err);
      } else if (data.Messages) {
        ++totalConsumed;
        setTimeout(recieve,0);
        var deleteParams = {
          QueueUrl: queueURL,
          ReceiptHandle: data.Messages[0].ReceiptHandle
        };
        sqs.deleteMessage(deleteParams, function(err, data) {
          if (err) {
            console.log("Delete Error", err);
          } else {
            //console.log("Message Deleted", data);
          }
        });
      }
    });
  }

  for (var i = 0; i < 10; ++i) {
    recieve();
  }
}

// -- start the benchmark
function readyBenchmark() {
  if (cluster.isWorker) {
    process.on('message', function(message) {
      switch (message) {
        case 'start':
          startBenchmark();
          break;
      }
    })
    process.send('ready');
  } else {
    startBenchmark()
  }
}

function startBenchmark() {
  producers.forEach(function(p) {
    pump(p);
  });
  setInterval(reportBenchmark, 2000);
}

function reportBenchmark() {
  if (cluster.isWorker) {
    var pushed = totalPushed;
    var consumed = totalConsumed;
    totalPushed = 0;
    totalConsumed = 0;
    process.send(JSON.stringify({p: pushed, c: consumed}));

  }
}

// -- pump messages on a producer
function pump(p) {
  function push() {
    ++totalPushed;
    sendMessage(p, config.message);
    setTimeout(push,0);
  }
  push();
}

var workerId = _workerId();
function _workerId() {
  if (cluster.isWorker) {
    return parseInt(cluster.worker.id) - 1;
  }
  return 0;
}



