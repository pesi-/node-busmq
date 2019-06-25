var util = require('util');
var _url = require('url');

/**
 * Base driver
 * @param name name of the driver
 * @constructor
 */
function Driver(name, driver) {
  this.name = name;
  this.driver = driver;
}

Driver.prototype.direct = function(url, options) {
  throw new Error(this.name + ' driver does not support direct');
};

Driver.prototype.sentinels = function(urls, options) {
  throw new Error(this.name + ' driver does not support sentinels');
};

Driver.prototype.cluster = function(urls, options) {
  throw new Error(this.name + ' driver does not support cluster');
};

/**
 * node-redis driver
 * @constructor
 */
function NodeRedisDriver() {
  Driver.call(this, 'node-redis', require('redis'));
}

util.inherits(NodeRedisDriver, Driver);

NodeRedisDriver.prototype.direct = function(url, options) {
  var opts = options || {};
  var parsed = _url.parse(url);
  if (parsed.auth) {
    opts.auth_pass = parsed.auth;
  }
  if (parsed.protocol === "rediss:") {
    opts.tls = opts.tls || {};
  }
  var client = this.driver.createClient(parsed.port || 6379, parsed.hostname, opts);
  client.retry_delay = 1000;
  client.retry_backoff = 1;
  client.getServerInfo = function() {
    return client.server_info;
  };
  return client;
};

/**
 * ioredis driver
 * @constructor
 */
function IORedisDriver() {
  Driver.call(this, 'ioredis', require('ioredis'));
}

util.inherits(IORedisDriver, Driver);

IORedisDriver.prototype._client = function(client) {
  client.getServerInfo = function() {
    return client.serverInfo
  };
  return client;
};

IORedisDriver.prototype._directOptions = function(url, options) {
  var opts = options || {};

  var parsed = _url.parse(url);
  opts.port = parsed.port || 6379;
  opts.host = parsed.hostname;
  if (parsed.auth) {
    opts.password = parsed.auth;
  }
  if (parsed.protocol === "rediss:") {
    opts.tls = opts.tls || {};
  }
  opts.retryStrategy = function(times) {
    return 1000;
  };
  return opts;
};

IORedisDriver.prototype._sentinelsOptions = function(urls, options) {
  var us = Array.isArray(urls) ? urls : [urls];
  var sentinels = us.map(function(u) {
    var parsed = _url.parse(u);
    var tls = options.tls;
    if (parsed.protocol === "rediss:") {
      tls = tls || {};
    }
    return {
      host: parsed.hostname, 
      port: parsed.port || 26379, 
      password: parsed.auth, 
      tls: tls
    };
  });

  var opts = options || {};
  opts.sentinels = sentinels;
  opts.name = options.name || 'mymaster';
  opts.retryStrategy = function(times) {
    return 1000;
  };
  opts.sentinelRetryStrategy = function(times) {
    return 1000;
  };
  return opts;
};

IORedisDriver.prototype._clusterOptions = function(urls, options) {
  var opts = options || {};
  opts.retryStrategy = function(times) {
    return 1000;
  };
  opts.clusterRetryStrategy = function(times) {
    return 1000;
  };
  opts.retryDelayOnClusterDown = 1000;
  return opts;
};

IORedisDriver.prototype.direct = function(url, options) {
  return this._client(new this.driver(this._directOptions(url, options)));
};

IORedisDriver.prototype.sentinels = function(urls, options) {
  return this._client(new this.driver(this._sentinelsOptions(urls, options)));
};

IORedisDriver.prototype.cluster = function(urls, options) {
  var us = Array.isArray(urls) ? urls : [urls];
  var nodes = us.map(function(u) {
    var parsed = _url.parse(u);
    var tls = options.tls;
    if (parsed.protocol === "rediss:") {
      tls = tls || {};
    }
    return {
      host: parsed.hostname, 
      port: parsed.port || 26379, 
      password: parsed.auth, 
      tls: tls
    };
  });
  return this._client(new this.driver.Cluster(nodes, this._clusterOptions(options)));
};

function driver(name) {
  switch (name) {
    case 'node-redis':
      return new NodeRedisDriver();
    case 'ioredis':
      return new IORedisDriver();
    default:
      throw 'unsupported driver: ' + name;
  }
}

exports = module.exports = driver;
