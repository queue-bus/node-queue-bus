var specHelper = require(__dirname + "/_specHelper.js").specHelper;
var should = require('should');
var os = require('os');
var SchedulerPrototype = require("node-resque").scheduler;
var bus;
var rider;

var priority = 'default';
var job      = 'testEvent';

var subscribe_a = function(callback){
  bus.subscribe('app_a', priority, 'job_a', { bus_event_type : "event_a" }, callback);
};

var subscribe_b = function(callback){
  bus.subscribe('app_b', priority, 'job_b', { bus_event_type : "event_b" }, callback);
};

var subscribe_c = function(callback){
  bus.subscribe('app_c', priority, 'job_c', { bus_event_type : "bus_special_value_present" }, callback);
};

var subscribe_d = function(callback){
  bus.subscribe('app_d', priority, 'job_d', { bus_event_type : /^.*matcher.*$/g }, callback);
};

var subscribe_all = function(callback){
  subscribe_a(function(){
  subscribe_b(function(){
  subscribe_c(function(){
  subscribe_d(function(){
    callback();
  });
  });
  });
  });
};

var getAllQueues = function(callback){
  specHelper.redis.lrange(specHelper.namespace + ":queue:app_a_default", 0, 9999, function(err, events_a){
  specHelper.redis.lrange(specHelper.namespace + ":queue:app_b_default", 0, 9999, function(err, events_b){
  specHelper.redis.lrange(specHelper.namespace + ":queue:app_c_default", 0, 9999, function(err, events_c){
  specHelper.redis.lrange(specHelper.namespace + ":queue:app_d_default", 0, 9999, function(err, events_d){
      callback({
        a: events_a,
        b: events_b,
        c: events_c,
        d: events_d,
      });
  });
  });
  });
  });
};

describe('rider', function(){

  beforeEach(function(done){
    specHelper.connect(function(){
      specHelper.cleanup(function(){
        bus = new specHelper.BusPrototype({connection: specHelper.connectionDetails});
        rider = new specHelper.RiderPrototype({connection: specHelper.connectionDetails, timeout: specHelper.timeout});
        bus.connect(function(){ rider.connect(done); });
      });
    });
  });

  afterEach(function(done){
    rider.end(function(){
      done();
    });
  });

  it('will append metadata to driven events', function(done){
    subscribe_all(function(){
      bus.publish('event_a', {thing: 'stuff'}, function(){
        rider.start();
        setTimeout(function(){
          getAllQueues(function(data){
            var e = JSON.parse(data.a);
            var paylaod = JSON.parse(e.args[0]);
            should.exist(paylaod.bus_driven_at);
            paylaod.bus_rider_queue.should.equal('app_a_default');
            paylaod.bus_rider_app_key.should.equal('app_a');
            paylaod.bus_rider_sub_key.should.equal('app_a_default_job_a');
            paylaod.bus_rider_class_name.should.equal('job_a');
            paylaod.bus_event_type.should.equal('event_a');
            done();
          });
        }, (specHelper.timeout * 3));
      });
    });
  });

  it('subscriptions: direct events', function(done){
    subscribe_all(function(){
      bus.publish('event_a', {thing: 'stuff'}, function(){
        rider.start();
        setTimeout(function(){
          getAllQueues(function(data){
            data.a.length.should.equal(1);
            data.b.length.should.equal(0);
            data.c.length.should.equal(1);
            data.d.length.should.equal(0);
            done();
          });
        }, (specHelper.timeout * 3));
      });
    });
  });

  it('subscriptions: special values', function(done){
    subscribe_all(function(){
      bus.publish('event_xx', {thing: 'stuff'}, function(){
        rider.start();
        setTimeout(function(){
          getAllQueues(function(data){
            data.a.length.should.equal(0);
            data.b.length.should.equal(0);
            data.c.length.should.equal(1);
            data.d.length.should.equal(0);
            done();
          });
        }, (specHelper.timeout * 3));
      });
    });
  });

  it('subscriptions: regexp (normal, negative)', function(done){
    subscribe_all(function(){
      bus.publish('event_d', {thing: 'stuff'}, function(){
        rider.start();
        setTimeout(function(){
          getAllQueues(function(data){
            data.a.length.should.equal(0);
            data.b.length.should.equal(0);
            data.c.length.should.equal(1);
            data.d.length.should.equal(0);
            done();
          });
        }, (specHelper.timeout * 3));
      });
    });
  });
  it('subscriptions: regexp (normal, positive)', function(done){
    subscribe_all(function(){
      bus.publish('event_matcher_should_work', {thing: 'stuff'}, function(){
        rider.start();
        setTimeout(function(){
          getAllQueues(function(data){
            data.a.length.should.equal(0);
            data.b.length.should.equal(0);
            data.c.length.should.equal(1);
            data.d.length.should.equal(1);
            done();
          });
        }, (specHelper.timeout * 3));
      });
    });
  });

  it('will ignore events that do not match any subscriptions', function(done){
    bus.subscribe('app_a', priority, 'job_a', { bus_event_type : "event_a" }, function(){
      bus.publish('something_crazy', {thing: 'stuff'}, function(){
        rider.start();
        setTimeout(function(){
          getAllQueues(function(data){
            data.a.length.should.equal(0);
            data.b.length.should.equal(0);
            data.c.length.should.equal(0);
            data.d.length.should.equal(0);
            done();
          });
        }, (specHelper.timeout * 3));
      });
    });
  });

  it('can publish a delayed job', function(done){
    var scheduler = new SchedulerPrototype({connection: specHelper.connectionDetails, timeout: specHelper.timeout});
    scheduler.connect(function(){
      scheduler.start();
      subscribe_all(function(){
        bus.publishIn(100, 'event_a', {thing: 'stuff'}, function(){
          rider.start();
          setTimeout(function(){
            getAllQueues(function(data){
              data.a.length.should.equal(1);
              data.b.length.should.equal(0);
              data.c.length.should.equal(1);
              data.d.length.should.equal(0);
              scheduler.end(done);
            });
          }, (specHelper.timeout * 5));
        });
      });
    });
  });

  describe('matchers & special patterns', function(){

    var matcherHelper = function(matcher, key, value, callback){
      bus.subscribe('app_a', priority, 'job_a', { key : matcher}, function(){
        var data = {};
        data[key] = value;
        bus.publish('event_xxx', data, function(){
          rider.start();
          setTimeout(function(){
            specHelper.redis.lrange(specHelper.namespace + ":queue:app_a_default", 0, 9999, function(err, events){
              callback(err, events);
            });
          }, (specHelper.timeout * 3));
        });
      });
    };

    it(':key', function(done){
      matcherHelper('bus_special_value_key', 'key', 'value', function(err, events){
        events.length.should.equal(1);
        done();
      });
    });
    it(':blank', function(done){
      matcherHelper('bus_special_value_blank', 'key', '', function(err, events){
        events.length.should.equal(1);
        done();
      });
    });
    it(':empty', function(done){
      matcherHelper('bus_special_value_empty', 'key', null, function(err, events){
        events.length.should.equal(1);
        done();
      });
    });
    it(':nil', function(done){
      matcherHelper('bus_special_value_nil', 'Otherkey', 'thing', function(err, events){
        events.length.should.equal(1);
        done();
      });
    });
    it(':value', function(done){
      matcherHelper('bus_special_value_value', 'key', 'x', function(err, events){
        events.length.should.equal(1);
        done();
      });
    });
    it(':present', function(done){
      matcherHelper('bus_special_value_present', 'key', 'x', function(err, events){
        events.length.should.equal(1);
        done();
      });
    });
  });

  describe('heartbeat', function(){

    it('can work out the QueueBus::Heartbeat job', function(done){
      var now = new Date();
      bus.subscribe('time_app', priority, 'time_job', { bus_event_type : "heartbeat_minutes" }, function(){
        bus.publishHeartbeat(function(){
          rider.start();
          setTimeout(function(){
            specHelper.redis.lrange(specHelper.namespace + ":queue:time_app_default", 0, 9999, function(err, events){
              events.length.should.equal(1);
              var event = JSON.parse(events[0]);
              var args = JSON.parse(event.args[0]);

              event.class.should.equal('QueueBus::Worker');
              event.queue.should.equal('time_app_default');
              args.bus_rider_sub_key.should.equal('time_app_default_time_job');
              args.minute.should.equal( now.getMinutes() );
              args.hour.should.equal( now.getHours() );
              args.day.should.equal( now.getDate() );
              args.month.should.equal( now.getMonth() + 1 );
              args.year.should.equal( now.getFullYear() );

              done();
            });
          }, 1000);
        });
      });
    });

    it('will only heartbeat up to the present time, no matter how many calls', function(){
      var now = new Date();
      bus.subscribe('time_app', priority, 'time_job', { bus_event_type : "heartbeat_minutes" }, function(){
        bus.publishHeartbeat(function(){
        bus.publishHeartbeat(function(){
        bus.publishHeartbeat(function(){
          rider.start();
          setTimeout(function(){
            specHelper.redis.lrange(specHelper.namespace + ":queue:time_app_default", 0, 9999, function(err, events){
              events.length.should.equal(1);
              done();
            });
          }, 1000);
        });
        });
        });
      });
    });

  });

});