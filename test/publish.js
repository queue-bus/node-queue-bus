var specHelper = require(__dirname + "/_specHelper.js").specHelper;
var should = require('should');
var os = require('os');
var SchedulerPrototype = require("node-resque").scheduler;
var bus;

var appKey   = 'testapp';
var priority = 'default';
var job      = 'testEvent';

describe('publish', function(){

  beforeEach(function(done){
    specHelper.connect(function(){
      specHelper.cleanup(function(){
        bus = new specHelper.BusPrototype({connection: specHelper.connectionDetails});
        bus.connect(done);
      });
    });
  });

  it('can publish', function(done){
    bus.publish(job, {'thing': 'stuff'}, function(err, toRun){
      should.not.exist(err);
      toRun.should.equal(true);
      done();
    });
  });

  it('will append metadata to published events', function(done){
    var now = Math.floor(new Date().getTime() / 1000);
    bus.publish(job, {'thing': 'stuff'}, function(err, toRun){
      var key = specHelper.namespace + ':queue:bus_incoming';
      specHelper.redis.lpop(key, function(err, elem){
        elem = JSON.parse(elem);
        var payload = JSON.parse(elem.args[0]);
        elem.class.should.equal("QueueBus::Worker");
        payload.bus_class_proxy.should.equal("QueueBus::Driver");
        elem.queue.should.equal("bus_incoming");
        payload.thing.should.equal('stuff');
        payload.bus_event_type.should.equal("testEvent");
        payload.bus_published_at.should.equal(now);
        should.exist(payload.bus_id);
        payload.bus_app_hostname.should.equal(os.hostname());
        done();
      });
    });
  });

  it('can publishAt', function(done){
    var t = (new Date().getTime()) + 1000;
    var timestamp = Math.round(t/1000);
    bus.publishAt(t, job, {'thing': 'stuff'}, function(){
      var key = (specHelper.namespace + ':delayed_queue_schedule');
      specHelper.redis.zscore(key, timestamp, function(err, score){
        score.should.equal(String(timestamp));
        var key = (specHelper.namespace + ':delayed:' + timestamp);
        specHelper.redis.lpop(key, function(err, elem){
          elem = JSON.parse(elem);
          var payload = JSON.parse(elem.args[0]);
          elem.class.should.equal("QueueBus::Worker");
          payload.bus_class_proxy.should.equal("QueueBus::Publisher");
          elem.queue.should.equal("bus_incoming");
          done();
        });
      });
    });
  });

  it('can publishIn', function(done){
    var t = 1000;
    var timestamp = Math.round((new Date().getTime() + t) / 1000);
    bus.publishIn(t, job, {'thing': 'stuff'}, function(){
      var key = (specHelper.namespace + ':delayed_queue_schedule');
      specHelper.redis.zscore(key, timestamp, function(err, score){
        score.should.equal(String(timestamp));
        var key = (specHelper.namespace + ':delayed:' + timestamp);
        specHelper.redis.lpop(key, function(err, elem){
          elem = JSON.parse(elem);
          var payload = JSON.parse(elem.args[0]);
          elem.class.should.equal("QueueBus::Worker");
          payload.bus_class_proxy.should.equal("QueueBus::Publisher");
          elem.queue.should.equal("bus_incoming");
          done();
        });
      });
    });
  });

  it('delayed publish jobs will be moved to incomming eventually', function(done){
    this.timeout(specHelper.timeout * 4);
    var scheduler = new SchedulerPrototype({connection: specHelper.connectionDetails, timeout: specHelper.timeout});
    scheduler.connect(function(){
      scheduler.start();
      var t = (new Date().getTime()) + 1000;
      var timestamp = Math.round(t/1000);
      bus.publishAt(t, job, {'thing': 'stuff'}, function(){
        setTimeout(function(){
          var key = specHelper.namespace + ':queue:bus_incoming';
          specHelper.redis.lpop(key, function(err, elem){
            elem = JSON.parse(elem);
            var payload = JSON.parse(elem.args[0]);
            elem.class.should.equal("QueueBus::Worker");
            payload.bus_class_proxy.should.equal("QueueBus::Publisher");
            elem.queue.should.equal("bus_incoming");
            payload.thing.should.equal('stuff');
            scheduler.end(function(){
              done();
            });
          });
        }, (specHelper.timeout * 3));
      });
    });
  });

});