/////////////////////////
// REQUIRE THE PACKAGE //
/////////////////////////

var BusPrototype       = require(__dirname + '/../index.js').bus;
var DriverPrototype    = require(__dirname + '/../index.js').driver;
var SchedulerPrototype = require("node-resque").scheduler;
var WorkerPrototype    = require("node-resque").worker;

///////////////////////////
// SET UP THE CONNECTION //
///////////////////////////

var connectionDetails = {
  package:   "redis",
  host:      "127.0.0.1",
  password:  "",
  port:      6379,
  database:  0,
  // namespace: "resque",
  // looping: true
};

//////////////////////////////
// DEFINE YOUR WORKER TASKS //
//////////////////////////////

var jobs = {
  "remoteEventAdd": {
    perform: function(payload, callback){
      var answer = payload.a + payload.b; 
      callback(null, answer);

      jobsToComplete--;
      shutdown();
    },
  },
  "remoteEventSubtract": {
    perform: function(payload, callback){
      var answer = payload.a - payload.b; 
      callback(null, answer);

      jobsToComplete--;
      shutdown();
    },
  },
};

/////////////////////
// START SCHEDULER //
/////////////////////

var scheduler = new SchedulerPrototype({connection: connectionDetails}, function(){
  scheduler.start();
});

//////////////////
// START DRIVER //
//////////////////

var driver = new DriverPrototype({connection: connectionDetails}, jobs, function(){
  driver.workerCleanup(); // optional: cleanup any previous improperly shutdown workers
  driver.start();
});

/////////////
// CONNECT //
/////////////

var bus = new BusPrototype({connection: connectionDetails}, jobs, function(){

  var appKey   = 'exampleApp';
  var priority = 'default';
  // appKey is always lower-cased by resque-bus
  // These subscriptions will put work to do in a "exampleApp_default" queue in resque: "(app_key)_(priority)"
  var bus_queue = 'exampleapp_default';

  ///////////////
  // SUBSCRIBE //
  ///////////////

  bus.subscribe(appKey, priority,      'remoteEventAdd', { bus_event_type : /^.*add.*/ }     );
  bus.subscribe(appKey, priority, 'remoteEventSubtract', { bus_event_type : /^.*subtract.*/ });

  ////////////////////
  // START A WORKER //
  ////////////////////

  worker = new WorkerPrototype({connection: connectionDetails, queues: [bus_queue]}, jobs, function(){
    worker.workerCleanup(); // optional: cleanup any previous improperly shutdown workers
    worker.start();
  });

  /////////////////////////
  // REGESTER FOR EVENTS //
  /////////////////////////

  driver.on('start',           function(){ console.log("worker started"); });
  driver.on('end',             function(){ console.log("worker ended"); });
  driver.on('cleaning_worker', function(worker, pid){ console.log("cleaning old worker " + worker); });
  driver.on('poll',            function(queue){ console.log("worker polling " + queue); });
  driver.on('job',             function(queue, job){ console.log("working job " + queue + " " + JSON.stringify(job)); });
  driver.on('reEnqueue',       function(queue, job, plugin){ console.log("reEnqueue job (" + plugin + ") " + queue + " " + JSON.stringify(job)); });
  driver.on('success',         function(queue, job, result){ console.log("job success " + queue + " " + JSON.stringify(job) + " >> " + result); });
  driver.on('failure',         function(queue, job, failure){ console.log("job failure " + queue + " " + JSON.stringify(job) + " >> " + failure); });
  driver.on('error',           function(queue, job, error){ console.log("error " + queue + " " + JSON.stringify(job) + " >> " + error); });
  driver.on('pause',           function(){ console.log("worker paused"); });

  worker.on('start',           function(){ console.log("worker started"); });
  worker.on('end',             function(){ console.log("worker ended"); });
  worker.on('cleaning_worker', function(worker, pid){ console.log("cleaning old worker " + worker); });
  worker.on('poll',            function(queue){ console.log("worker polling " + queue); });
  worker.on('job',             function(queue, job){ console.log("working job " + queue + " " + JSON.stringify(job)); });
  worker.on('reEnqueue',       function(queue, job, plugin){ console.log("reEnqueue job (" + plugin + ") " + queue + " " + JSON.stringify(job)); });
  worker.on('success',         function(queue, job, result){ console.log("job success " + queue + " " + JSON.stringify(job) + " >> " + result); });
  worker.on('failure',         function(queue, job, failure){ console.log("job failure " + queue + " " + JSON.stringify(job) + " >> " + failure); });
  worker.on('error',           function(queue, job, error){ console.log("error " + queue + " " + JSON.stringify(job) + " >> " + error); });
  worker.on('pause',           function(){ console.log("worker paused"); });

  scheduler.on('start',             function(){ console.log("scheduler started"); });
  scheduler.on('end',               function(){ console.log("scheduler ended"); });
  scheduler.on('poll',              function(){ console.log("scheduler polling"); });
  scheduler.on('working_timestamp', function(timestamp){ console.log("scheduler working timestamp " + timestamp); });
  scheduler.on('transferred_job',   function(timestamp, job){ console.log("scheduler enquing job " + timestamp + " >> " + JSON.stringify(job)); });

  ///////////////////
  // PUBLISH EVENT //
  ///////////////////

  bus.publish('add', {
    a: 5,
    b: 10,
  });
  
  bus.publishAt(1000, 'subtract', {
    a: 10,
    b: 5,
  });
});

var jobsToComplete = 2;
var shutdown = function(){
  if(jobsToComplete === 0){
    setTimeout(function(){
      scheduler.end(function(){
        worker.end(function(){
          driver.end(function(){
            process.exit();
          });
        });
      });
    }, 500);
  }
};