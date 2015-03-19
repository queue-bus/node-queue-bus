/////////////////////////
// REQUIRE THE PACKAGE //
/////////////////////////

var BusPrototype       = require(__dirname + '/../index.js').bus;
var DriverPrototype    = require(__dirname + '/../index.js').driver;
var SchedulerPrototype = require("node-resque").scheduler;

///////////////////////////
// SET UP THE CONNECTION //
///////////////////////////

var connectionDetails = {
  package:   "redis",
  host:      "127.0.0.1",
  password:  "",
  port:      6379,
  database:  0,
};

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
  },
};

/////////////
// CONNECT //
/////////////

var bus = new BusPrototype({connection: connectionDetails}, jobs, function(){

  var appKey   = 'myApp';
  // appKey is always lower-cased by resque-bus
  // These subscriptions will put work to do in a "exampleApp_default" queue in resque: "(app_key)_(priority)"
  var bus_queue = 'myapp_default';

  ///////////////
  // SUBSCRIBE //
  ///////////////

  bus.subscribe(appKey, 'default',    'newUserJob', { bus_event_type : /^user_created/   });
  bus.subscribe(appKey, 'default', 'deleteUserJob', { bus_event_type : /^user_destroyed/ });

  /////////////////////
  // START SCHEDULER //
  /////////////////////

  var scheduler = new SchedulerPrototype({connection: connectionDetails}, function(){
    scheduler.start();
  });

  //////////////////
  // START DRIVER //
  //////////////////

  // a driver is just like a normal node-resque worker, but will also work the incomming queues when idle
  var driver = new DriverPrototype({connection: connectionDetails, queues: [bus_queue]}, jobs, function(){
    driver.workerCleanup(); // optional: cleanup any previous improperly shutdown workers
    driver.start();
  });

  // converly, you could also just start a worker:
  // var WorkerPrototype = require("node-resque").worker;
  // worker = new WorkerPrototype({connection: connectionDetails, queues: [bus_queue]}, jobs, function(){
  //   worker.workerCleanup(); // optional: cleanup any previous improperly shutdown workers
  //   worker.start();
  // });

  /////////////////////////
  // REGESTER FOR EVENTS //
  /////////////////////////

  driver.on('start',           function(){ console.log("driver started"); });
  driver.on('end',             function(){ console.log("driver ended"); });
  driver.on('cleaning_worker', function(worker, pid){ console.log("cleaning old worker " + worker); });
  driver.on('poll',            function(queue){ console.log("driver polling " + queue); });
  driver.on('job',             function(queue, job){ console.log("working job " + queue + " " + JSON.stringify(job)); });
  driver.on('reEnqueue',       function(queue, job, plugin){ console.log("reEnqueue job (" + plugin + ") " + queue + " " + JSON.stringify(job)); });
  driver.on('success',         function(queue, job, result){ console.log("job success " + queue + " " + JSON.stringify(job) + " >> " + result); });
  driver.on('failure',         function(queue, job, failure){ console.log("job failure " + queue + " " + JSON.stringify(job) + " >> " + failure); });
  driver.on('error',           function(queue, job, error){ console.log("error " + queue + " " + JSON.stringify(job) + " >> " + error); });
  driver.on('pause',           function(){ console.log("worker paused"); });

  scheduler.on('start',             function(){ console.log("scheduler started"); });
  scheduler.on('end',               function(){ console.log("scheduler ended"); });
  scheduler.on('poll',              function(){ console.log("scheduler polling"); });
  scheduler.on('working_timestamp', function(timestamp){ console.log("scheduler working timestamp " + timestamp); });
  scheduler.on('transferred_job',   function(timestamp, job){ console.log("scheduler enquing job " + timestamp + " >> " + JSON.stringify(job)); });

  ///////////////////
  // PUBLISH EVENT //
  ///////////////////

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