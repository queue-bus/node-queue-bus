var driverJob = function(){
  return {
    plugins: [],
    pluginOptions: [],
    perform: function(args, callback){
      var self = this;

      var started = 0;
      var matches = [];
      self.subscriptions(function(err, subscriptions, count){
        if(count == 0){
          if(started === 0 && typeof callback === 'function'){ callback(null, matches); }
        }else{    
          for(var app in subscriptions){
            for(var i in subscriptions[app]){
              started++;
              var subscription = subscriptions[app][i];
              var matched = subscriptionMatch(args, subscription);
              if(matched === true){
                matches.push(subscription['queue_name']);
                var decoratedArgs = buildBusMetadata(args, subscription.queue_name, app, i, subscription.class, args.bus_event_type);
                self.queueObject.enqueue(subscription.queue_name, subscription.class, decoratedArgs, function(err, toRun){
                  started--;
                  if(started === 0 && typeof callback === 'function'){ callback(null, matches); }
                });
              }else{
                process.nextTick(function(){
                  started--;
                  if(started === 0 && typeof callback === 'function'){ callback(null, matches); }
                });
              }
            }
          }
        }
      });
    } 
  }
}

var buildBusMetadata = function(args, bus_rider_queue, bus_rider_app_key, bus_rider_sub_key, bus_rider_class_name, bus_event_type){
  if(args['bus_driven_at']        == null){ args['bus_driven_at']        = Math.floor(new Date().getTime()/1000); }
  if(args['bus_rider_queue']      == null){ args['bus_rider_queue']      = bus_rider_queue; }
  if(args['bus_rider_app_key']    == null){ args['bus_rider_app_key']    = bus_rider_app_key; }
  if(args['bus_rider_sub_key']    == null){ args['bus_rider_sub_key']    = bus_rider_sub_key; }
  if(args['bus_rider_class_name'] == null){ args['bus_rider_class_name'] = bus_rider_class_name; }
  if(args['bus_event_type']       == null){ args['bus_event_type']       = bus_event_type; }

  return args;
} 

var subscriptionMatch = function(args, subscription){
  var specialPrepend = "bus_special_value_";
  var matched = true;
  var parts = 0;

  for(var key in subscription.matcher){
    parts++;
    var value = subscription.matcher[key];
    if(matched === true){
      if(value === specialPrepend + "key"){
        if( args[key] != null ){ matched = true; }
        else{ matched = false; }
      }
      else if(value === specialPrepend + "blank"){
        if( args[key] != null && args[key].trim().length == 0 ){ matched = true; }
        else{ matched = false; }
      }
      else if(value === specialPrepend + "empty"){
        if( args[key] == null ){ matched = true; }
        else{ matched = false; }
      }
      else if(value === specialPrepend + "nil"){
        if( args[key] === undefined ){ matched = true; }
        else{ matched = false; }
      }
      else if(value === specialPrepend + "value"){
        if( args[key] != null ){ matched = true; }
        else{ matched = false; }
      }
      else if(value === specialPrepend + "present"){
        if( args[key] != null && args[key].trim().length > 0 ){ matched = true; }
        else{ matched = false; }
      }
      else{
        var matches = args[key].match(new RegExp(value, 'g'));
        if (matches != null ){ matched = true; }
        else{ matched = false; }
      }
    }
  }

  if(parts === 0){
    matched = false;
  }

  return matched;
}

exports.driverJob = driverJob;