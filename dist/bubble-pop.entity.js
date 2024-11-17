"use strict";

var __assign = this && this.__assign || function () {
  __assign = Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];

      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }

    return t;
  };

  return __assign.apply(this, arguments);
};

(function () {
  var transition_manager_1 = Script.require(Script.resolvePath("./lib/transition-manager.js?1601171789961"));
  var signal_manager_1 = Script.require(Script.resolvePath("./lib/signal-manager.js?1601171789961"));
  var WIDTH = 7;
  var HEIGHT = 12;
  var BUBBLE_SIZE = 0.2;
  var BUBBLE_OFFSET_X = -0.6;
  var BUBBLE_OFFSET_Y = -0.875;
  var SCORE_MAX_LENGTH = 7;
  var SCORE_HEIGHT = 0.2;
  var SCORE_OFFSET_Y = -1.185;
  var SCORE_OFFSET_Z = 0.105;
  var TRANSITION_TIME = 100;
  var TRANSITION_INTERPOLATION = transition_manager_1.standardEasing;
  var ENTITY_HOST_TYPE = Script.context == "entity_server" ? "domain" : "local";
  var COLORS = ["f44336", "ff9800", "ffeb3b", "8bc34a", "03a9f4", "3f51b5", "9c27b0"];
  var POP_SOUND = SoundCache.getSound(Script.resolvePath("./assets/pop.wav"));
  var DING_SOUND = SoundCache.getSound(Script.resolvePath("./assets/ding.wav"));

  var hexToRgb = function (hex) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  };

  var getRandomColorKey = function () {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  };

  var objectValues = function (object) {
    return Object.keys(object).map(function (key) {
      return object[key];
    });
  };

  var Bubble = function () {
    function Bubble(bubblePopper, x, y, dontTransitionIn) {
      var _this = this;

      if (dontTransitionIn === void 0) {
        dontTransitionIn = false;
      }

      this.bubblePopper = bubblePopper;
      this.x = x;
      this.y = y;
      this.transitions = new transition_manager_1.TransitionManager();
      this.popped = false;
      this.color = getRandomColorKey();
      this.entityId = Entities.addEntity({
        type: "Sphere",
        parentID: this.bubblePopper.entityId,
        dimensions: {
          x: dontTransitionIn ? BUBBLE_SIZE : 0,
          y: dontTransitionIn ? BUBBLE_SIZE : 0,
          z: dontTransitionIn ? BUBBLE_SIZE : 0
        },
        localPosition: {
          x: x * BUBBLE_SIZE + BUBBLE_OFFSET_X,
          y: y * BUBBLE_SIZE + BUBBLE_OFFSET_Y,
          z: 0
        },
        color: hexToRgb(this.color),
        collisionless: false,
        grab: {
          grabbable: false,
          triggerable: true
        },
        script: Script.resolvePath((ENTITY_HOST_TYPE == "local" ? "./bubble-local.client.js?" : "./bubble.client.js?") + Date.now())
      }, ENTITY_HOST_TYPE);

      if (!dontTransitionIn) {
        this.transitions.startTransition({
          from: 0,
          to: BUBBLE_SIZE,
          time: TRANSITION_TIME,
          interpolationFn: TRANSITION_INTERPOLATION,
          transitionFn: function (size) {
            Entities.editEntity(_this.entityId, {
              dimensions: {
                x: size,
                y: size,
                z: size
              }
            });
          }
        });
      }
    }

    Bubble.prototype.draw = function () {
      var _this = this;

      var localPosition = Entities.getEntityProperties(this.entityId).localPosition;
      var newY = this.y * BUBBLE_SIZE + BUBBLE_OFFSET_Y;

      if (Math.abs(localPosition.y - newY) > BUBBLE_SIZE / 2) {
        this.transitions.startTransition({
          from: localPosition.y,
          to: newY,
          time: TRANSITION_TIME,
          interpolationFn: TRANSITION_INTERPOLATION,
          transitionFn: function (y) {
            Entities.editEntity(_this.entityId, {
              localPosition: {
                x: localPosition.x,
                y: y,
                z: localPosition.z
              }
            });
          }
        });
      }
    };

    Bubble.prototype.pop = function (dontTransition) {
      var _this = this;

      if (dontTransition === void 0) {
        dontTransition = false;
      }

      this.popped = true;
      var time = dontTransition ? 0 : TRANSITION_TIME;
      this.transitions.startTransition({
        from: BUBBLE_SIZE,
        to: 0,
        time: time,
        interpolationFn: TRANSITION_INTERPOLATION,
        transitionFn: function (size) {
          Entities.editEntity(_this.entityId, {
            dimensions: {
              x: size,
              y: size,
              z: size
            }
          });
        }
      });
      Script.setTimeout(function () {
        Entities.deleteEntity(_this.entityId);

        _this.transitions.cleanup();
      }, time);
    };

    return Bubble;
  }();

  var BubblePopper = function () {
    function BubblePopper() {
      this.signals = new signal_manager_1.SignalManager();
      this.popped = 0;
      this.inGameOverAnimation = false;
    }

    BubblePopper.prototype.createBubbles = function () {
      var _this = this;

      this.bubbles = Array.apply(null, Array(WIDTH)).map(function (_, x) {
        return Array.apply(null, Array(HEIGHT)).map(function (_, y) {
          return new Bubble(_this, x, y, true);
        });
      });
    };

    BubblePopper.prototype.findSameBubblesAround = function (bubble, lastSameBubblesHashed) {
      if (lastSameBubblesHashed === void 0) {
        lastSameBubblesHashed = {};
      }

      var x = bubble.x;
      var y = bubble.y;
      var bubs = [bubble];
      if (x > 0) bubs.push(this.bubbles[x - 1][y]);
      if (x < WIDTH - 1) bubs.push(this.bubbles[x + 1][y]);
      if (y > 0) bubs.push(this.bubbles[x][y - 1]);
      if (y < HEIGHT - 1) bubs.push(this.bubbles[x][y + 1]);

      var sameBubblesHashed = __assign(__assign({}, lastSameBubblesHashed), bubs.filter(function (b) {
        return b.color == bubble.color;
      }).reduce(function (obj, b) {
        obj[b.x + "," + b.y] = b;
        return obj;
      }, {}));

      for (var _i = 0, _a = Object.keys(sameBubblesHashed); _i < _a.length; _i++) {
        var hash = _a[_i];

        if (lastSameBubblesHashed[hash] == null) {
          sameBubblesHashed = this.findSameBubblesAround(sameBubblesHashed[hash], sameBubblesHashed);
        }
      }

      return sameBubblesHashed;
    };

    BubblePopper.prototype.moveBubblesDown = function () {
      for (var x = 0; x < this.bubbles.length; x++) {
        this.bubbles[x] = this.bubbles[x].filter(function (bubble) {
          return !bubble.popped;
        });

        if (this.bubbles[x].length != HEIGHT) {
          var leftToAdd = HEIGHT - this.bubbles[x].length;

          for (var i = 0; i < leftToAdd; i++) {
            this.bubbles[x].push(new Bubble(this, x, this.bubbles[x].length));
          }
        }

        for (var y = 0; y < this.bubbles[x].length; y++) {
          var bubble = this.bubbles[x][y];

          if (bubble.y != y) {
            bubble.y = y;
            bubble.draw();
          }
        }
      }
    };

    BubblePopper.prototype.isGameOver = function () {
      for (var x = 0; x < this.bubbles.length; x++) {
        for (var y = 0; y < this.bubbles[x].length; y++) {
          if (Object.keys(this.findSameBubblesAround(this.bubbles[x][y])).length > 1) {
            return false;
          }
        }
      }

      return true;
    };

    BubblePopper.prototype.updateScore = function () {
      var poppedStr = String(this.popped);
      var text = Array.apply(null, Array(Math.min(SCORE_MAX_LENGTH - poppedStr.length, SCORE_MAX_LENGTH))).map(function () {
        return "0";
      }).join("") + poppedStr;
      Entities.editEntity(this.scoreTextId, {
        text: text,
        dimensions: {
          x: 0.7,
          y: SCORE_HEIGHT
        }
      });
    };

    BubblePopper.prototype.gameOver = function () {
      var _this = this;

      if (this.inGameOverAnimation) return;
      this.inGameOverAnimation = true;
      var position = Entities.getEntityProperties(this.entityId).position;

      if (DING_SOUND.downloaded) {
        Audio.playSound(DING_SOUND, {
          volume: 0.1,
          position: position,
          localOnly: ENTITY_HOST_TYPE == "local"
        });
      }

      for (var _i = 0, _a = this.bubbles; _i < _a.length; _i++) {
        var column = _a[_i];

        for (var _b = 0, column_1 = column; _b < column_1.length; _b++) {
          var bubble = column_1[_b];
          Entities.editEntity(bubble.entityId, {
            name: "Bubble",
            parentID: "",
            dynamic: true,
            gravity: {
              x: 0,
              y: -9.8,
              z: 0
            },
            velocity: {
              x: Math.random() - 0.5,
              y: -1,
              z: Math.random() - 0.5
            },
            lifetime: 3
          });
        }
      }

      Script.setTimeout(function () {
        _this.createBubbles();

        _this.popped = 0;

        _this.updateScore();

        _this.inGameOverAnimation = false;
      }, 1000 * 2);
    };

    BubblePopper.prototype.onClick = function (bubble) {
      if (this.inGameOverAnimation) return;
      var sameBubbles = objectValues(this.findSameBubblesAround(bubble));

      if (sameBubbles.length <= 1) {
        if (this.isGameOver()) this.gameOver();
        return;
      }

      for (var _i = 0, sameBubbles_1 = sameBubbles; _i < sameBubbles_1.length; _i++) {
        var b = sameBubbles_1[_i];
        b.pop();
        this.popped++;
      }

      var bubblePosition = Entities.getEntityProperties(bubble.entityId).position;

      if (POP_SOUND.downloaded) {
        Audio.playSound(POP_SOUND, {
          volume: 0.1,
          position: bubblePosition,
          localOnly: ENTITY_HOST_TYPE == "local"
        });
      }

      this.moveBubblesDown();
      this.updateScore();
    };

    BubblePopper.prototype.preCleanup = function () {
      var _this = this;

      Entities.findEntities(Entities.getEntityProperties(this.entityId).position, 4).forEach(function (entityId) {
        var parentId = Entities.getEntityProperties(entityId).parentID;

        if (parentId == _this.entityId) {
          Entities.deleteEntity(entityId);
        }
      });
    };

    BubblePopper.prototype.createScore = function () {
      var _this = this;

      this.scoreTextId = Entities.addEntity({
        type: "Text",
        font: "Roboto",
        parentID: this.entityId,
        lineHeight: SCORE_HEIGHT,
        unlit: true,
        localPosition: {
          x: 0,
          y: SCORE_OFFSET_Y,
          z: SCORE_OFFSET_Z
        },
        backgroundAlpha: 0,
        grab: {
          grabbable: false
        }
      }, ENTITY_HOST_TYPE);
      Script.setTimeout(function () {
        _this.updateScore();
      }, 100);
    };

    BubblePopper.prototype.listenToClicks = function () {
      var _this = this;

      Messages.subscribe(this.entityId);
      this.signals.connect(Messages.messageReceived, function (channel, message, senderId, localOnly) {
        if (channel != _this.entityId) return;
        if (ENTITY_HOST_TYPE == "local" && !localOnly) return;

        for (var _i = 0, _a = _this.bubbles; _i < _a.length; _i++) {
          var column = _a[_i];

          for (var _b = 0, column_2 = column; _b < column_2.length; _b++) {
            var bubble = column_2[_b];

            if (bubble.entityId == message) {
              _this.onClick(bubble);

              return;
            }
          }
        }
      });
    };

    BubblePopper.prototype.preload = function (entityId) {
      this.entityId = entityId;
      this.preCleanup();
      this.createBubbles();
      this.createScore();
      this.listenToClicks();
    };

    BubblePopper.prototype.unload = function () {
      this.signals.cleanup();
      Messages.unsubscribe(this.entityId);
      Entities.deleteEntity(this.scoreTextId);

      for (var _i = 0, _a = this.bubbles; _i < _a.length; _i++) {
        var column = _a[_i];

        for (var _b = 0, column_3 = column; _b < column_3.length; _b++) {
          var bubble = column_3[_b];
          bubble.pop(true);
        }
      }
    };

    return BubblePopper;
  }();

  return new BubblePopper();
});