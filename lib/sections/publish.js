var utils  = require(__dirname + '/utils.js');
var uuid   = require('node-uuid');
var os     = require('os');
var child_process = require('child_process');

var publish = function(eventType, args, callback){
  var self = this;
  var queue = self.options.incomingQueue;
  var klass = self.options.busClassKey;
  var payload = publishMetadata(eventType, args);
  payload.bus_class_proxy  = 'QueueBus::Driver';

  self.enqueue(queue, klass, JSON.stringify(payload), function(err, toRun){
    if(typeof callback === 'function'){ callback(err, toRun); }
  });
};

var publishHeartbeat = function(callback){
  var self = this;
  var queue = self.options.incomingQueue;
  var klass = self.options.busClassKey;
  var payload = publishMetadata('QueueBus::Heartbeat', {});
  payload.bus_class_proxy  = 'QueueBus::Heartbeat';

  self.enqueue(queue, klass, JSON.stringify(payload), function(err, toRun){
    if(typeof callback === 'function'){ callback(err, toRun); }
  });
};

var publishAt = function(timestamp, eventType, args, callback){
  var self    = this;
  var queue   = self.options.incomingQueue;
  var klass   = self.options.busClassKey;
  var payload = publishMetadata(eventType, args);
  payload.bus_class_proxy  = 'QueueBus::Publisher';

  if(payload.bus_delayed_until === undefined){
    payload.bus_delayed_until = Math.floor(timestamp/1000);
  }

  delete payload.bus_published_at; // will get re-added upon re-publish

  self.enqueueAt(timestamp, queue, klass, JSON.stringify(payload), function(err){
    if(typeof callback === 'function'){ callback(err); }
  });
};

var publishIn = function(time, eventType, args, callback){
  var self = this;
  var timestamp = new Date().getTime() + time;
  self.publishAt(timestamp, eventType, args, callback);
};

var publishMetadata = function(eventType, args){
  var payload = {};
  if(eventType){
    payload.bus_event_type = eventType;
  } else {
    payload.bus_event_type = null;
  }
  payload.bus_published_at = utils.timestamp();
  payload.bus_id           = utils.timestamp() + "-" + uuid.v4();
  payload.bus_app_hostname = os.hostname();
  payload.bus_timezone     = systemTimezone;
  try{
    payload.bus_locale     = process.env.LANG.split('.')[0];
  }catch(e){
    payload.bus_locale     = process.env.LANG;
  }

  // overwrite defaults
  for(var i in args){
    payload[i] = args[i];
  }

  return payload;
};

var getSystemTimezone = function(){
  // THIS IS TERRIBLE, but there is no way to get this from node directly... 
  // This only works on *nix hosts
  // shelling out is slow
  var command = '';
  command += 'if [ -f /etc/timezone ]; then\n';
  command += '  cat /etc/timezone\n';
  command += 'elif [ -h /etc/localtime ]; then\n';
  command += '  readlink /etc/localtime | sed "s/\\/usr\\/share\\/zoneinfo\\///"\n';
  command += 'else';
  command += '  checksum=\`md5sum /etc/localtime | cut -d\' \' -f1\`\n';
  command += '  find /usr/share/zoneinfo/ -type f -exec md5sum {} \\; | grep "^$checksum" | sed "s/.*\\/usr\\/share\\/zoneinfo\\///" | head -n 1\n';
  command += 'fi';
  if(child_process.execSync){
    try{
      var stdout  = child_process.execSync(command).toString();
      return stdout.replace(/\n/g, '');
    }catch(e){
      console.log(e);
      throw(e);
    }
  }else{
    child_process.exec(command, function(error, stdout, stderr){
      if(error){ throw(error); }
      if(stderr){ throw(new Error(stderr)); }
      systemTimezone = stdout.replace(/\n/g, '');
    });
  }
};

var systemTimezone = getSystemTimezone();

exports.publish          = publish;
exports.publishAt        = publishAt;
exports.publishIn        = publishIn;
exports.publishHeartbeat = publishHeartbeat;