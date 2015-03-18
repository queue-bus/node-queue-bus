var specHelper = require(__dirname + "/_specHelper.js").specHelper;
var should = require('should');
var os = require('os');
var SchedulerPrototype = require("node-resque").scheduler;
var bus;
var driver;

var priority = 'default';
var job      = 'testEvent';

var subscribe_a = function(callback){
  bus.subscribe('app_a', priority, 'job_a', { bus_event_type : "event_a" }, function(){
    callback();
  });
};

var subscribe_b = function(callback){
  bus.subscribe('app_b', priority, 'job_b', { bus_event_type : "event_b" }, function(){
    callback();
  });
};

var subscribe_c = function(callback){
  bus.subscribe('app_c', priority, 'job_c', { bus_event_type : "bus_special_value_present" }, function(){
    callback();
  });
};

var subscribe_d = function(callback){
  bus.subscribe('app_d', priority, 'job_d', { bus_event_type : /^.*matcher.*$/g }, function(){
    callback();
  });
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

describe('driver', function(){

  beforeEach(function(done){
    specHelper.connect(function(){
      specHelper.cleanup(function(){
        bus = new specHelper.BusPrototype({connection: specHelper.connectionDetails}, function(){
          driver = new specHelper.DriverPrototype({connection: specHelper.connectionDetails, timeout: specHelper.timeout}, function(){
            done();
          });
        });
      });
    });
  });

  afterEach(function(done){
    driver.end(function(){
      done();
    });
  });

  it('will append metadata to driven events', function(done){
    subscribe_all(function(){
      bus.publish('event_a', {thing: 'stuff'}, function(){
        driver.start();
        setTimeout(function(){
          getAllQueues(function(data){
            var e = JSON.parse(data.a);
            should.exist(e.args[0].bus_driven_at);
            e.args[0].bus_rider_queue.should.equal('app_a_default');
            e.args[0].bus_rider_app_key.should.equal('app_a');
            e.args[0].bus_rider_sub_key.should.equal('app_a_default_job_a');
            e.args[0].bus_rider_class_name.should.equal('job_a');
            e.args[0].bus_event_type.should.equal('event_a');
            done();
          });
        }, (specHelper.timeout * 3));
      });
    });
  });

  it('subscriptions: direct events', function(done){
    subscribe_all(function(){
      bus.publish('event_a', {thing: 'stuff'}, function(){
        driver.start();
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
        driver.start();
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
        driver.start();
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
        driver.start();
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
        driver.start();
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
    var scheduler = new SchedulerPrototype({connection: specHelper.connectionDetails, timeout: specHelper.timeout}, function(){
      scheduler.start();
      subscribe_all(function(){
        bus.publishIn(100, 'event_a', {thing: 'stuff'}, function(){
          driver.start();
          setTimeout(function(){
            getAllQueues(function(data){
              data.a.length.should.equal(1);
              data.b.length.should.equal(0);
              data.c.length.should.equal(1);
              data.d.length.should.equal(0);
              scheduler.end(function(){
                done();
              });
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
          driver.start();
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

});