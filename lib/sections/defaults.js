var defaults = function(){
  return {
    incommigQueue:             "resquebus_incoming",
    busDriverClassKey:         "::ResqueBus::Driver",
    appPrefix:                 "resque:resquebus_app:",
    subscriptionSet:           "resque:resquebus_apps",
    subscriptionCacheDuration: 1000,
  }
}

exports.defaults = defaults;