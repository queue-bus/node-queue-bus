require "bundler/setup"
Bundler.require(:default)
require 'sinatra'
require 'resque/server'
require 'resque_scheduler/server'
require 'resque_bus/server'

run Rack::URLMap.new \
  "/" => Resque::Server.new