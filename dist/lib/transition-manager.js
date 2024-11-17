"use strict";

module.exports.TransitionManager = exports.accelerateEasing = exports.decelerateEasing = exports.standardEasing = void 0;
var signal_manager_1 = Script.require(Script.resolvePath("./signal-manager.js?1600920901354"));

function clamp(n, min, max) {
  return n <= min ? min : n >= max ? max : n;
}

function lerp(a, b, n) {
  return (1 - n) * a + n * b;
}

function lerp2D(a, b, n) {
  return [lerp(a[0], b[0], n), lerp(a[1], b[1], n)];
}

function cubicBezier(_1, _2, _3, _4, n) {
  var a = [0, 0];
  var b = [_1, _2];
  var c = [_3, _4];
  var d = [1, 1];
  var ab = lerp2D(a, b, n);
  var bc = lerp2D(b, c, n);
  var cd = lerp2D(c, d, n);
  var abbc = lerp2D(ab, bc, n);
  var bccd = lerp2D(bc, cd, n);
  var dest = lerp2D(abbc, bccd, n);
  return dest[1];
}

function standardEasing(n) {
  return cubicBezier(0.4, 0, 0.2, 1, n);
}

module.exports.standardEasing = standardEasing;

function decelerateEasing(n) {
  return cubicBezier(0, 0, 0.2, 1, n);
}

module.exports.decelerateEasing = decelerateEasing;

function accelerateEasing(n) {
  return cubicBezier(0.4, 0, 1, 1, n);
}

module.exports.accelerateEasing = accelerateEasing;

var TransitionManager = function () {
  function TransitionManager() {
    var _this = this;

    this.signals = new signal_manager_1.SignalManager();
    this.transitions = [];

    this.update = function () {
      var continuingTransitions = [];

      for (var _i = 0, _a = _this.transitions; _i < _a.length; _i++) {
        var t = _a[_i];
        var currentMs = +new Date() - t.startDate;
        var currentValue = clamp(currentMs / t.time, 0, 1);
        var interpolatedValue = lerp(t.from, t.to, t.interpolationFn(currentValue));
        t.transitionFn(interpolatedValue);

        if (currentValue < 1) {
          continuingTransitions.push(t);
        }
      }

      _this.transitions = continuingTransitions;
    };

    this.signals.connect(Script.update, this.update);
  }

  TransitionManager.prototype.cleanup = function () {
    this.signals.cleanup();
  };

  TransitionManager.prototype.startTransition = function (t) {
    if (t.interpolationFn == null) t.interpolationFn = standardEasing;
    t.startDate = +new Date();
    this.transitions.push(t);
  };

  return TransitionManager;
}();

module.exports.TransitionManager = TransitionManager;