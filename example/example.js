/////////////////////////
// REQUIRE THE PACKAGE //
/////////////////////////

var BusPrototype       = require(__dirname + '/../index.js').bus;
var RiderPrototype     = require(__dirname + '/../index.js').rider;
var SchedulerPrototype = require("node-resque").scheduler;

///////////////////////////
// SET UP THE CONNECTION //
///////////////////////////

var connectionDetails = {
  package:   "ioredis",
  host:      "127.0.0.1",
  password:  "",
  port:      6379,
  database:  0,
};

var appKey   = 'myApp';
// appKey is always lower-cased by resque-bus
// These subscriptions will put work to do in a "exampleApp_default" queue in resque: "(app_key)_(priority)"
var bus_queue = 'myapp_default';

//////////////////////////////
// DEFINE YOUR WORKER TASKS //
//////////////////////////////

var jobs = {
  "newUserJob": {
    perform: function(payload, callback){
      console.log("*** HELLO USER " + payload.email + " ***");
      callback();
    },
  },
  "deleteUserJob": {
    perform: function(payload, callback){
      console.log("*** GOODBYE USER " + payload.email + " ***");
      callback();
    },
  }
};

/////////////
// CONNECT //
/////////////

var scheduler = new SchedulerPrototype({connection: connectionDetails});
scheduler.connect(function(){
  scheduler.start();
});

var bus = new BusPrototype({connection: connectionDetails}, jobs);
bus.connect(function(){  

  bus.subscribe(appKey, 'default',    'newUserJob', { bus_event_type : /^user_created/   });
  bus.subscribe(appKey, 'default', 'deleteUserJob', { bus_event_type : /^user_destroyed/ });

  bus.publish('user_created', {
    email: 'evan@site.com'
  });
  
  bus.publishIn(1000, 'user_created', {
    email: 'brian@site.com'
  });

  bus.publishIn(2000, 'user_destroyed', {
    email: 'brian@site.com'
  });
});


var rider = new RiderPrototype({connection: connectionDetails, queues: [bus_queue], toDrive: true}, jobs);
rider.connect(function(){
  rider.workerCleanup(); // optional: cleanup any previous improperly shutdown workers
  rider.start();
});

/////////////////////////
// REGESTER FOR EVENTS //
/////////////////////////

rider.on('start',           function(){ console.log("rider started"); });
rider.on('end',             function(){ console.log("rider ended"); });
rider.on('cleaning_worker', function(worker, pid){ console.log("cleaning old worker " + worker); });
// rider.on('poll',            function(queue){ console.log("rider polling " + queue); });
// rider.on('job',             function(queue, job){ console.log("working job " + queue + " " + JSON.stringify(job)); });
// rider.on('reEnqueue',       function(queue, job, plugin){ console.log("reEnqueue job (" + plugin + ") " + queue + " " + JSON.stringify(job)); });
// rider.on('success',         function(queue, job, result){ console.log("job success " + queue + " " + JSON.stringify(job) + " >> " + result); });
rider.on('failure',         function(queue, job, failure){ console.log("job failure " + queue + " " + JSON.stringify(job) + " >> " + failure); });
rider.on('error',           function(queue, job, error){ console.log("error " + queue + " " + JSON.stringify(job) + " >> " + error); });
// rider.on('pause',           function(){ console.log("worker paused"); });

scheduler.on('start',             function(){ console.log("scheduler started"); });
scheduler.on('end',               function(){ console.log("scheduler ended"); });
// scheduler.on('poll',              function(){ console.log("scheduler polling"); });
// scheduler.on('working_timestamp', function(timestamp){ console.log("scheduler working timestamp " + timestamp); });
// scheduler.on('transferred_job',   function(timestamp, job){ console.log("scheduler enquing job " + timestamp + " >> " + JSON.stringify(job)); });
