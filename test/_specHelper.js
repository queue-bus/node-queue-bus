var redis = require('redis');
var namespace = "resque_test";

exports.specHelper = {
  BusPrototype: require(__dirname + "/../index.js").bus,
  RiderPrototype: require(__dirname + "/../index.js").rider,
  namespace: namespace,
  timeout: 500,
  connectionDetails: {
    package:  'redis',
    host:      "127.0.0.1",
    password:  "",
    port:      6379,
    database:  1,
    namespace: namespace,
    // looping: true
  },
  connect: function(callback){
    var self = this;
    self.redis = redis.createClient(self.connectionDetails.port, self.connectionDetails.host, self.connectionDetails.options);
    if(self.connectionDetails.password && self.connectionDetails.password !== ""){
      self.redis.auth(self.connectionDetails.password, function(err){
        self.redis.select(self.connectionDetails.database, function(err){
          callback(err);
        });
      }); 
    }else{
      self.redis.select(self.connectionDetails.database, function(err){
        callback(err);
      });
    }
  },
  cleanup: function(callback){
    var self = this;
    self.redis.keys(self.namespace + "*", function(err, keys){
      if(keys.length == 0){ 
        callback(); 
      }else{
        self.redis.del(keys, function(){
          callback();
        });
      }
    });
  }
}