// this file is part of the v0.2.1 easel local OS X install.
// you can find out more about easel and the x-carve at
// inventables.com & easel.inventables.com

var errorHandler = require('./error_handler')
    , SP = require('serialport')
    , Debugger = require('./debugger')
    , eventDispatcher = require('./event_dispatcher')
    , Parser = require('./parser');

var SerialPortController = function() {
  var that = {}

  var port = null;

  var isWindows = false;
  var parser = Parser();
  var logger = Debugger.logger("Serial port controller");

  var connected = function() {
    return (port !== null);
  };

  var write = function(data) {
    if (connected()) {
      port.write(data);
    }
  };

  var close = function() {
    if (connected()) {
      if (port.fd) {
        logger.log("Closing port");
        port.close();
      }
      port = null;
    }
  };

  var listPorts = function (callback) {
    // TODO: fix listing ports on windows
    if(isWindows){
      callback([]);
    } else {
      SP.list(function(err,ports) {
        if (err) {
          // TODO: catch and handle errors
          errorHandler.trigger(err);
          return null;
        } else {
          // TODO: scope for callback?
          callback(ports);
        }
      });
    }
  };

  var initPortWithConfigs = function(comName, config) {
    close();

    logger.log("Opening port '" + comName + "'");

    var thisPort = new SP.SerialPort(comName, {
      baudrate: config.baud,
      parser: SP.parsers.readline(config.separator),
      errorCallback : function(err){
        logger.log("ERROR: " + err, Debugger.logger.RED);
        return;
      }
    });

    thisPort.on('open', function() {
      if (port !== thisPort) {
        return;
      }
      logger.log("Port opened");
      parser.dispatchEvent('portOpened');
    });

    thisPort.on('data', function(d) {
      if (port !== thisPort) {
        return;
      }
      parser.parseData(d, config);
    });

    thisPort.on('error', function(d) {
      if (port !== thisPort) {
        return;
      }
      if (port !== null) {
        logger.log('On error');
        logger.log('error: ' + d);
        logger.log('CODE: ' + d.code);
        if (d.code === 'UNKNOWN' || d.code === 'ENXIO' || d.code === undefined) {
          close();
          that.dispatchEvent("close");
        }
      }
    });

    thisPort.on('close', function() {
      if (port !== thisPort) {
        return;
      }
      logger.log('On close');
      port = null;
      that.dispatchEvent("close");
    });

    port = thisPort;
  };

  that.listPorts = listPorts;
  that.initPortWithConfigs = initPortWithConfigs;
  that.write = write;
  that.parser = function() { return parser; };
  that.connected = connected;
  that.close = close;

  eventDispatcher(that);

  return that;
};

module.exports = SerialPortController;
