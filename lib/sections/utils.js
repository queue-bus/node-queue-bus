var defaults = function(){
  return {
    incommigQueue:   "bus_incoming",
    busClassKey:     "QueueBus::Worker",
    appPrefix:       ":bus_app:",
    subscriptionSet: ":bus_apps",
    toDrive:         true,
  };
};

var timestamp = function(){
  return Math.floor((new Date().getTime()) / 1000);
};

var hashKey = function(appKey, priority, job){
  appKey = normalize(appKey);
  return appKey + "_" + priority + "_" + job;
};

var normalize = function(s){
  s = String(s);
  s = s.replace(/ +?/g, '_');
  s = s.toLowerCase();
  return s;
};

var uniqueArray = function(arr){
  arr = arr.filter(function (e, i, arr) {
    return arr.lastIndexOf(e) === i;
  });
  return arr;
};

// Ruby Style: (?-mix:^.*thing.*$)
// JS Style:   /^.*thing.*$/
var toRubyRegExp = function(r){
  if(r instanceof RegExp){
    var s = String(r);
    var modifiers = ['g'];
    var allowedModifiers = ['m', 'i', 'x'];
    s = s.slice(1); // RegExp always starts with /
    var chars = s.split('');
    var ended = false;
    while(ended === false){
      var letter = chars.pop();
      if(letter === "/"){
        ended = true;
      }else{
        modifiers.push(letter);
      }
    }
    modifiers = uniqueArray(modifiers);
    s = chars.join('');
    var selectedModifiers = ['?'];
    var remainingModifiers = [];
    modifiers.forEach(function(i){
      if(allowedModifiers.indexOf(i) >= 0){
        selectedModifiers.push(i);
      }
    });
    allowedModifiers.forEach(function(i){
      if(selectedModifiers.indexOf(i) < 0){
        remainingModifiers.push(i);
      }
    });
    s = '(' + selectedModifiers.join('') + '-' + remainingModifiers.join('') + ':' + s + ')';
    return s;
  }else{
    return r;
  }
};

var toJSRegExp = function(s){
  if(s instanceof RegExp){
    return s;
  }else if(s.substring(0,2) === '(?' && s.substring((s.length - 1) , s.length) === ")"){
    var modifiers = ['g'];
    var parts = s.split(':');
    var modCollection = parts.shift().split('-')[0];
    s = parts.join(':');
    s = s.substring(0, (s.length - 1));
    modCollection = modCollection.replace("(?","");
    modCollection.split('').forEach(function(letter){
      if(letter !== ''){ modifiers.push(letter); }
    });
    return new RegExp(s, uniqueArray(modifiers).join(''));
  }else{
    return new RegExp(s,'g');
  }
};

exports.defaults     = defaults;
exports.timestamp    = timestamp;
exports.hashKey      = hashKey;
exports.normalize    = normalize;
exports.toRubyRegExp = toRubyRegExp;
exports.toJSRegExp   = toJSRegExp;
exports.uniqueArray  = uniqueArray;