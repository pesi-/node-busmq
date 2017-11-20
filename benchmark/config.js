var crypto = require('crypto');

var messageLength = 32;
var message = crypto.randomBytes(messageLength/2).toString('hex');
var logLevel = 'info';

exports.redis = {
  system: 'redis',
  urls: ['redis://127.0.0.1:6379'],
  numWorkers: 4,
  numQueues: 100,
  messageLength: messageLength,
  message: message,
  logLevel: logLevel
}

exports.rabbitmq = {
  system: 'rabbitmq',
  urls: 'amqp://127.0.0.1:5672',
  numWorkers: 4,
  numQueues: 100,
  messageLength: messageLength,
  message: message,
  logLevel: logLevel
}

exports.sqs = {
  system: 'sqs',
  urls: '',
  region: 'eu-west-1',
  numWorkers: 1,
  numQueues: 1,
  messageLength: messageLength,
  message: message,
  logLevel: logLevel
}
