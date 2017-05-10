var redisHelper = require('./redis-helper');
var fs = require('fs');
var spawn = require('child_process').spawn;

function startRedisCluster(args, done) {
  const pr = spawn(__dirname+'/redis-trib.rb', args);

  var d = '';
  pr.stdout.on('data', function(data) {
    d = d + data.toString();
    if (d.indexOf("type 'yes' to accept") !== -1) {
      pr.stdin.write('yes\n');
    }
  });

  pr.stderr.on('data', function(data) {
    console.log('stderr: ' + data);
  });

  pr.on('close', function(code) {
    done(null, code);
  });

  pr.on('error', function(err) {
    done(err);
  });
}


function RedisCluster(port) {
  this.port = port;
  this.redises= {};
}

function deleteFolderRecursive(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

function startInstance(port, index, done) {
  var dir = __dirname+'/../tmp/cluster'+port+'/'+(port+index);
  fs.mkdirSync(dir);
  fs.writeFileSync(dir+'/redis.conf',
      'port '+(port+index)+'\n'+
      'maxclients 200\n'+
      'cluster-enabled yes'+'\n'+
      'cluster-config-file nodes.conf'+'\n'+
      'cluster-node-timeout 5000'+'\n'+
      'appendonly yes'+'\n'+
      'dir '+dir
  );
  redisHelper.open([dir+'/redis.conf'],done);
}

function initializeCluster(port, done) {
  console.log('--Please wait, initializing cluster on base port ' + port);
  startRedisCluster(['create', '--replicas', '1', '127.0.0.1:'+port, '127.0.0.1:'+(port+1), '127.0.0.1:'+(port+2), '127.0.0.1:'+(port+3), '127.0.0.1:'+(port+4), '127.0.0.1:'+(port+5)], function(err) {
    if (err) {
      done && done(err);
      return;
    }
    setTimeout(function() {
      console.log('... cluster ready --');
      done && done();
    }, 1500);
  });
}



RedisCluster.prototype.start = function(done) {
  if( !fs.existsSync(__dirname+'/../tmp') ) {
    fs.mkdirSync(__dirname+'/../tmp');
  }
  //cleanup
  deleteFolderRecursive(__dirname+'/../tmp/cluster'+this.port);
  fs.mkdirSync(__dirname+'/../tmp/cluster'+this.port);

  var _this = this;
  var index = 0;
  function startNext(index) {
    startInstance(_this.port, index, function ( err, redis ) {
      if ( err ) {
        _this.stop();
        done && done( err );
        return;
      }
      _this.redises[(_this.port + index)] = redis;
      if ( index < 5 ) {
        startNext(index+1);
        return
      }
      initializeCluster(_this.port, done);
    } );
  }
  startNext(index);
};

RedisCluster.prototype.stop = function(done) {

  var _this = this;
  var index = 0;

  function stopNext( index ) {
    setTimeout(function() {
      var redis = _this.redises[(_this.port + index)];
      if ( redis ) {
        redis.close( function () {
          delete _this.redises[(_this.port + index)];
          /* ignore errors */
          if ( index === 5 ) {
            _this.redises = {};
            console.log('--cluster stopped');
            done && done();
            return;
          }
          stopNext( index + 1 );
        } );
      } else {
        //partial start
        console.log('--cluster hopefully stopped');
        done && done();
      }
    }, 2000);
  }
  stopNext( index );
};

exports = module.exports = RedisCluster;
