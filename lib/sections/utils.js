var defaults = function(){
  return {
    incommigQueue:             "resquebus_incoming",
    busDriverClassKey:         "::ResqueBus::Driver",
    busPublisherClassKey:      "::ResqueBus::Publisher",
    appPrefix:                 "resque:resquebus_app:",
    subscriptionSet:           "resque:resquebus_apps",
    subscriptionCacheDuration: 1000,
  }
}

var timestamp = function(){
  return Math.floor((new Date().getTime()) / 1000);
}

var hashKey = function(appKey, priority, job){
  appKey = normalize(appKey);
  return appKey + "_" + priority + "_" + job;
}

var normalize = function(s){
  s = String(s);
  s = s.replace(/ +?/g, '_');
  s = s.toLowerCase();
  return s;
}

exports.defaults  = defaults;
exports.timestamp = timestamp;
exports.hashKey   = hashKey;
exports.normalize = normalize;