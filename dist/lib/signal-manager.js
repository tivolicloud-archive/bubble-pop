"use strict";

module.exports.SignalManager = void 0;

var SignalManager = function () {
  function SignalManager() {
    this.instances = [];
  }

  SignalManager.prototype.connect = function (signal, func) {
    try {
      this.instances.push({
        signal: signal,
        func: func
      });
      signal.connect(func);
    } catch (err) {}
  };

  SignalManager.prototype.cleanup = function () {
    for (var _i = 0, _a = this.instances; _i < _a.length; _i++) {
      var instance = _a[_i];

      try {
        var signal = instance.signal,
            func = instance.func;
        signal.disconnect(func);
      } catch (err) {}
    }
  };

  return SignalManager;
}();

module.exports.SignalManager = SignalManager;