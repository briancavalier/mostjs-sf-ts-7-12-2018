(function () {
  'use strict';

  /** @license MIT License (c) copyright 2010-2016 original author or authors */

  // append :: a -> [a] -> [a]
  // a with x appended
  function append(x, a) {
    var l = a.length;
    var b = new Array(l + 1);
    for (var i = 0; i < l; ++i) {
      b[i] = a[i];
    }

    b[l] = x;
    return b;
  }

  // map :: (a -> b) -> [a] -> [b]
  // transform each element with f
  function map(f, a) {
    var l = a.length;
    var b = new Array(l);
    for (var i = 0; i < l; ++i) {
      b[i] = f(a[i]);
    }
    return b;
  }

  // reduce :: (a -> b -> a) -> a -> [b] -> a
  // accumulate via left-fold
  function reduce(f, z, a) {
    var r = z;
    for (var i = 0, l = a.length; i < l; ++i) {
      r = f(r, a[i], i);
    }
    return r;
  }

  // removeAll :: (a -> boolean) -> [a] -> [a]
  // remove all elements matching a predicate
  function removeAll(f, a) {
    var l = a.length;
    var b = new Array(l);
    var j = 0;
    for (var x, i = 0; i < l; ++i) {
      x = a[i];
      if (!f(x)) {
        b[j] = x;
        ++j;
      }
    }

    b.length = j;
    return b;
  }

  // findIndex :: a -> [a] -> Int
  // find index of x in a, from the left
  function findIndex(x, a) {
    for (var i = 0, l = a.length; i < l; ++i) {
      if (x === a[i]) {
        return i;
      }
    }
    return -1;
  }

  // compose :: (b -> c) -> (a -> b) -> (a -> c)
  var compose = function compose(f, g) {
    return function (x) {
      return f(g(x));
    };
  };

  // curry2 :: ((a, b) -> c) -> (a -> b -> c)
  function curry2(f) {
    function curried(a, b) {
      switch (arguments.length) {
        case 0:
          return curried;
        case 1:
          return function (b) {
            return f(a, b);
          };
        default:
          return f(a, b);
      }
    }
    return curried;
  }

  // curry3 :: ((a, b, c) -> d) -> (a -> b -> c -> d)
  function curry3(f) {
    function curried(a, b, c) {
      // eslint-disable-line complexity
      switch (arguments.length) {
        case 0:
          return curried;
        case 1:
          return curry2(function (b, c) {
            return f(a, b, c);
          });
        case 2:
          return function (c) {
            return f(a, b, c);
          };
        default:
          return f(a, b, c);
      }
    }
    return curried;
  }

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var ScheduledTask = /*#__PURE__*/function () {
    function ScheduledTask(time, localOffset, period, task, scheduler) {
      classCallCheck(this, ScheduledTask);

      this.time = time;
      this.localOffset = localOffset;
      this.period = period;
      this.task = task;
      this.scheduler = scheduler;
      this.active = true;
    }

    ScheduledTask.prototype.run = function run() {
      return this.task.run(this.time - this.localOffset);
    };

    ScheduledTask.prototype.error = function error(e) {
      return this.task.error(this.time - this.localOffset, e);
    };

    ScheduledTask.prototype.dispose = function dispose() {
      this.scheduler.cancel(this);
      return this.task.dispose();
    };

    return ScheduledTask;
  }();

  var RelativeScheduler = /*#__PURE__*/function () {
    function RelativeScheduler(origin, scheduler) {
      classCallCheck(this, RelativeScheduler);

      this.origin = origin;
      this.scheduler = scheduler;
    }

    RelativeScheduler.prototype.currentTime = function currentTime() {
      return this.scheduler.currentTime() - this.origin;
    };

    RelativeScheduler.prototype.scheduleTask = function scheduleTask(localOffset, delay, period, task) {
      return this.scheduler.scheduleTask(localOffset + this.origin, delay, period, task);
    };

    RelativeScheduler.prototype.relative = function relative(origin) {
      return new RelativeScheduler(origin + this.origin, this.scheduler);
    };

    RelativeScheduler.prototype.cancel = function cancel(task) {
      return this.scheduler.cancel(task);
    };

    RelativeScheduler.prototype.cancelAll = function cancelAll(f) {
      return this.scheduler.cancelAll(f);
    };

    return RelativeScheduler;
  }();

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var defer = function defer(task) {
    return Promise.resolve(task).then(runTask);
  };

  function runTask(task) {
    try {
      return task.run();
    } catch (e) {
      return task.error(e);
    }
  }

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var Scheduler = /*#__PURE__*/function () {
    function Scheduler(timer, timeline) {
      var _this = this;

      classCallCheck(this, Scheduler);

      this.timer = timer;
      this.timeline = timeline;

      this._timer = null;
      this._nextArrival = Infinity;

      this._runReadyTasksBound = function () {
        return _this._runReadyTasks(_this.currentTime());
      };
    }

    Scheduler.prototype.currentTime = function currentTime() {
      return this.timer.now();
    };

    Scheduler.prototype.scheduleTask = function scheduleTask(localOffset, delay, period, task) {
      var time = this.currentTime() + Math.max(0, delay);
      var st = new ScheduledTask(time, localOffset, period, task, this);

      this.timeline.add(st);
      this._scheduleNextRun();
      return st;
    };

    Scheduler.prototype.relative = function relative(offset) {
      return new RelativeScheduler(offset, this);
    };

    Scheduler.prototype.cancel = function cancel(task) {
      task.active = false;
      if (this.timeline.remove(task)) {
        this._reschedule();
      }
    };

    Scheduler.prototype.cancelAll = function cancelAll(f) {
      this.timeline.removeAll(f);
      this._reschedule();
    };

    Scheduler.prototype._reschedule = function _reschedule() {
      if (this.timeline.isEmpty()) {
        this._unschedule();
      } else {
        this._scheduleNextRun(this.currentTime());
      }
    };

    Scheduler.prototype._unschedule = function _unschedule() {
      this.timer.clearTimer(this._timer);
      this._timer = null;
    };

    Scheduler.prototype._scheduleNextRun = function _scheduleNextRun() {
      // eslint-disable-line complexity
      if (this.timeline.isEmpty()) {
        return;
      }

      var nextArrival = this.timeline.nextArrival();

      if (this._timer === null) {
        this._scheduleNextArrival(nextArrival);
      } else if (nextArrival < this._nextArrival) {
        this._unschedule();
        this._scheduleNextArrival(nextArrival);
      }
    };

    Scheduler.prototype._scheduleNextArrival = function _scheduleNextArrival(nextArrival) {
      this._nextArrival = nextArrival;
      var delay = Math.max(0, nextArrival - this.currentTime());
      this._timer = this.timer.setTimer(this._runReadyTasksBound, delay);
    };

    Scheduler.prototype._runReadyTasks = function _runReadyTasks() {
      this._timer = null;
      this.timeline.runTasks(this.currentTime(), runTask);
      this._scheduleNextRun();
    };

    return Scheduler;
  }();

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var Timeline = /*#__PURE__*/function () {
    function Timeline() {
      classCallCheck(this, Timeline);

      this.tasks = [];
    }

    Timeline.prototype.nextArrival = function nextArrival() {
      return this.isEmpty() ? Infinity : this.tasks[0].time;
    };

    Timeline.prototype.isEmpty = function isEmpty() {
      return this.tasks.length === 0;
    };

    Timeline.prototype.add = function add(st) {
      insertByTime(st, this.tasks);
    };

    Timeline.prototype.remove = function remove$$1(st) {
      var i = binarySearch(getTime(st), this.tasks);

      if (i >= 0 && i < this.tasks.length) {
        var at = findIndex(st, this.tasks[i].events);
        if (at >= 0) {
          this.tasks[i].events.splice(at, 1);
          return true;
        }
      }

      return false;
    };

    Timeline.prototype.removeAll = function removeAll$$1(f) {
      for (var i = 0; i < this.tasks.length; ++i) {
        removeAllFrom(f, this.tasks[i]);
      }
    };

    Timeline.prototype.runTasks = function runTasks(t, runTask) {
      var tasks = this.tasks;
      var l = tasks.length;
      var i = 0;

      while (i < l && tasks[i].time <= t) {
        ++i;
      }

      this.tasks = tasks.slice(i);

      // Run all ready tasks
      for (var j = 0; j < i; ++j) {
        this.tasks = runReadyTasks(runTask, tasks[j].events, this.tasks);
      }
    };

    return Timeline;
  }();

  function runReadyTasks(runTask, events, tasks) {
    // eslint-disable-line complexity
    for (var i = 0; i < events.length; ++i) {
      var task = events[i];

      if (task.active) {
        runTask(task);

        // Reschedule periodic repeating tasks
        // Check active again, since a task may have canceled itself
        if (task.period >= 0 && task.active) {
          task.time = task.time + task.period;
          insertByTime(task, tasks);
        }
      }
    }

    return tasks;
  }

  function insertByTime(task, timeslots) {
    var l = timeslots.length;
    var time = getTime(task);

    if (l === 0) {
      timeslots.push(newTimeslot(time, [task]));
      return;
    }

    var i = binarySearch(time, timeslots);

    if (i >= l) {
      timeslots.push(newTimeslot(time, [task]));
    } else {
      insertAtTimeslot(task, timeslots, time, i);
    }
  }

  function insertAtTimeslot(task, timeslots, time, i) {
    var timeslot = timeslots[i];
    if (time === timeslot.time) {
      addEvent(task, timeslot.events, time);
    } else {
      timeslots.splice(i, 0, newTimeslot(time, [task]));
    }
  }

  function addEvent(task, events) {
    if (events.length === 0 || task.time >= events[events.length - 1].time) {
      events.push(task);
    } else {
      spliceEvent(task, events);
    }
  }

  function spliceEvent(task, events) {
    for (var j = 0; j < events.length; j++) {
      if (task.time < events[j].time) {
        events.splice(j, 0, task);
        break;
      }
    }
  }

  function getTime(scheduledTask) {
    return Math.floor(scheduledTask.time);
  }

  function removeAllFrom(f, timeslot) {
    timeslot.events = removeAll(f, timeslot.events);
  }

  function binarySearch(t, sortedArray) {
    // eslint-disable-line complexity
    var lo = 0;
    var hi = sortedArray.length;
    var mid = void 0,
        y = void 0;

    while (lo < hi) {
      mid = Math.floor((lo + hi) / 2);
      y = sortedArray[mid];

      if (t === y.time) {
        return mid;
      } else if (t < y.time) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    return hi;
  }

  var newTimeslot = function newTimeslot(t, events) {
    return { time: t, events: events };
  };

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  /* global setTimeout, clearTimeout */

  var ClockTimer = /*#__PURE__*/function () {
    function ClockTimer(clock) {
      classCallCheck(this, ClockTimer);

      this._clock = clock;
    }

    ClockTimer.prototype.now = function now() {
      return this._clock.now();
    };

    ClockTimer.prototype.setTimer = function setTimer(f, dt) {
      return dt <= 0 ? runAsap(f) : setTimeout(f, dt);
    };

    ClockTimer.prototype.clearTimer = function clearTimer(t) {
      return t instanceof Asap ? t.cancel() : clearTimeout(t);
    };

    return ClockTimer;
  }();

  var Asap = /*#__PURE__*/function () {
    function Asap(f) {
      classCallCheck(this, Asap);

      this.f = f;
      this.active = true;
    }

    Asap.prototype.run = function run() {
      return this.active && this.f();
    };

    Asap.prototype.error = function error(e) {
      throw e;
    };

    Asap.prototype.cancel = function cancel() {
      this.active = false;
    };

    return Asap;
  }();

  function runAsap(f) {
    var task = new Asap(f);
    defer(task);
    return task;
  }

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  /* global performance, process */

  var RelativeClock = /*#__PURE__*/function () {
    function RelativeClock(clock, origin) {
      classCallCheck(this, RelativeClock);

      this.origin = origin;
      this.clock = clock;
    }

    RelativeClock.prototype.now = function now() {
      return this.clock.now() - this.origin;
    };

    return RelativeClock;
  }();

  var HRTimeClock = /*#__PURE__*/function () {
    function HRTimeClock(hrtime, origin) {
      classCallCheck(this, HRTimeClock);

      this.origin = origin;
      this.hrtime = hrtime;
    }

    HRTimeClock.prototype.now = function now() {
      var hrt = this.hrtime(this.origin);
      return (hrt[0] * 1e9 + hrt[1]) / 1e6;
    };

    return HRTimeClock;
  }();

  var clockRelativeTo = function clockRelativeTo(clock) {
    return new RelativeClock(clock, clock.now());
  };

  var newPerformanceClock = function newPerformanceClock() {
    return clockRelativeTo(performance);
  };

  var newDateClock = function newDateClock() {
    return clockRelativeTo(Date);
  };

  var newHRTimeClock = function newHRTimeClock() {
    return new HRTimeClock(process.hrtime, process.hrtime());
  };

  var newPlatformClock = function newPlatformClock() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return newPerformanceClock();
    } else if (typeof process !== 'undefined' && typeof process.hrtime === 'function') {
      return newHRTimeClock();
    }

    return newDateClock();
  };

  // Schedule a task to run as soon as possible, but
  // not in the current call stack
  var asap = /*#__PURE__*/curry2(function (task, scheduler) {
    return scheduler.scheduleTask(0, 0, -1, task);
  });

  // Schedule a task to run after a millisecond delay
  var delay = /*#__PURE__*/curry3(function (delay, task, scheduler) {
    return scheduler.scheduleTask(0, delay, -1, task);
  });

  // Cancel all ScheduledTasks for which a predicate
  // is true
  var cancelAllTasks = /*#__PURE__*/curry2(function (predicate, scheduler) {
    return scheduler.cancelAll(predicate);
  });

  var schedulerRelativeTo = /*#__PURE__*/curry2(function (offset, scheduler) {
    return new RelativeScheduler(offset, scheduler);
  });

  var newDefaultScheduler = function newDefaultScheduler() {
    return new Scheduler(newDefaultTimer(), new Timeline());
  };

  var newDefaultTimer = function newDefaultTimer() {
    return new ClockTimer(newPlatformClock());
  };

  var classCallCheck$1 = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var disposeNone = function disposeNone() {
    return NONE;
  };
  var NONE = /*#__PURE__*/new (function () {
    function DisposeNone() {
      classCallCheck$1(this, DisposeNone);
    }

    DisposeNone.prototype.dispose = function dispose() {};

    return DisposeNone;
  }())();

  var isDisposeNone = function isDisposeNone(d) {
    return d === NONE;
  };

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  // Wrap an existing disposable (which may not already have been once()d)
  // so that it will only dispose its underlying resource at most once.
  var disposeOnce = function disposeOnce(disposable) {
    return new DisposeOnce(disposable);
  };

  var DisposeOnce = /*#__PURE__*/function () {
    function DisposeOnce(disposable) {
      classCallCheck$1(this, DisposeOnce);

      this.disposed = false;
      this.disposable = disposable;
    }

    DisposeOnce.prototype.dispose = function dispose() {
      if (!this.disposed) {
        this.disposed = true;
        this.disposable.dispose();
        this.disposable = undefined;
      }
    };

    return DisposeOnce;
  }();

  /** @license MIT License (c) copyright 2010 original author or authors */
  // Aggregate a list of disposables into a DisposeAll
  var disposeAll = function disposeAll(ds) {
    var merged = reduce(merge, [], ds);
    return merged.length === 0 ? disposeNone() : new DisposeAll(merged);
  };

  var merge = function merge(ds, d) {
    return isDisposeNone(d) ? ds : d instanceof DisposeAll ? ds.concat(d.disposables) : append(d, ds);
  };

  var DisposeAll = /*#__PURE__*/function () {
    function DisposeAll(disposables) {
      classCallCheck$1(this, DisposeAll);

      this.disposables = disposables;
    }

    DisposeAll.prototype.dispose = function dispose() {
      throwIfErrors(disposeCollectErrors(this.disposables));
    };

    return DisposeAll;
  }();

  // Dispose all, safely collecting errors into an array


  var disposeCollectErrors = function disposeCollectErrors(disposables) {
    return reduce(appendIfError, [], disposables);
  };

  // Call dispose and if throws, append thrown error to errors
  var appendIfError = function appendIfError(errors, d) {
    try {
      d.dispose();
    } catch (e) {
      errors.push(e);
    }
    return errors;
  };

  // Throw DisposeAllError if errors is non-empty
  var throwIfErrors = function throwIfErrors(errors) {
    if (errors.length > 0) {
      throw new DisposeAllError(errors.length + ' errors', errors);
    }
  };

  var DisposeAllError = /*#__PURE__*/function (Error) {
    function DisposeAllError(message, errors) {
      Error.call(this, message);
      this.message = message;
      this.name = DisposeAllError.name;
      this.errors = errors;

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, DisposeAllError);
      }

      this.stack = '' + this.stack + formatErrorStacks(this.errors);
    }

    DisposeAllError.prototype = /*#__PURE__*/Object.create(Error.prototype);

    return DisposeAllError;
  }(Error);

  var formatErrorStacks = function formatErrorStacks(errors) {
    return reduce(formatErrorStack, '', errors);
  };

  var formatErrorStack = function formatErrorStack(s, e, i) {
    return s + ('\n[' + (i + 1) + '] ' + e.stack);
  };

  /** @license MIT License (c) copyright 2010-2017 original author or authors */
  // Try to dispose the disposable.  If it throws, send
  // the error to sink.error with the provided Time value
  var tryDispose = /*#__PURE__*/curry3(function (t, disposable, sink) {
    try {
      disposable.dispose();
    } catch (e) {
      sink.error(t, e);
    }
  });

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  function fatalError(e) {
    setTimeout(rethrow, 0, e);
  }

  function rethrow(e) {
    throw e;
  }





  var classCallCheck$2 = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };











  var inherits = function (subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  };











  var possibleConstructorReturn = function (self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  };

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  var propagateTask$1 = function propagateTask(run, value, sink) {
    return new PropagateTask(run, value, sink);
  };

  var propagateEventTask$1 = function propagateEventTask(value, sink) {
    return propagateTask$1(runEvent, value, sink);
  };

  var propagateEndTask = function propagateEndTask(sink) {
    return propagateTask$1(runEnd, undefined, sink);
  };

  var PropagateTask = /*#__PURE__*/function () {
    function PropagateTask(run, value, sink) {
      classCallCheck$2(this, PropagateTask);

      this._run = run;
      this.value = value;
      this.sink = sink;
      this.active = true;
    }

    PropagateTask.prototype.dispose = function dispose$$1() {
      this.active = false;
    };

    PropagateTask.prototype.run = function run(t) {
      if (!this.active) {
        return;
      }
      var run = this._run;
      run(t, this.value, this.sink);
    };

    PropagateTask.prototype.error = function error(t, e) {
      // TODO: Remove this check and just do this.sink.error(t, e)?
      if (!this.active) {
        return fatalError(e);
      }
      this.sink.error(t, e);
    };

    return PropagateTask;
  }();

  var runEvent = function runEvent(t, x, sink) {
    return sink.event(t, x);
  };

  var runEnd = function runEnd(t, _, sink) {
    return sink.end(t);
  };

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var empty = function empty() {
    return EMPTY;
  };

  var isCanonicalEmpty = function isCanonicalEmpty(stream) {
    return stream === EMPTY;
  };

  var Empty = /*#__PURE__*/function () {
    function Empty() {
      classCallCheck$2(this, Empty);
    }

    Empty.prototype.run = function run(sink, scheduler$$1) {
      return asap(propagateEndTask(sink), scheduler$$1);
    };

    return Empty;
  }();

  var EMPTY = /*#__PURE__*/new Empty();

  var Never = /*#__PURE__*/function () {
    function Never() {
      classCallCheck$2(this, Never);
    }

    Never.prototype.run = function run() {
      return disposeNone();
    };

    return Never;
  }();

  var NEVER = /*#__PURE__*/new Never();

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var at = function at(t, x) {
    return new At(t, x);
  };

  var At = /*#__PURE__*/function () {
    function At(t, x) {
      classCallCheck$2(this, At);

      this.time = t;
      this.value = x;
    }

    At.prototype.run = function run(sink, scheduler$$1) {
      return delay(this.time, propagateTask$1(runAt, this.value, sink), scheduler$$1);
    };

    return At;
  }();

  function runAt(t, x, sink) {
    sink.event(t, x);
    sink.end(t);
  }

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var now = function now(x) {
    return at(0, x);
  };

  /** @license MIT License (c) copyright 2010-2017 original author or authors */
  /** @author Brian Cavalier */

  var Pipe = /*#__PURE__*/function () {
    function Pipe(sink) {
      classCallCheck$2(this, Pipe);

      this.sink = sink;
    }

    Pipe.prototype.event = function event(t, x) {
      return this.sink.event(t, x);
    };

    Pipe.prototype.end = function end(t) {
      return this.sink.end(t);
    };

    Pipe.prototype.error = function error(t, e) {
      return this.sink.error(t, e);
    };

    return Pipe;
  }();

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  var Filter = /*#__PURE__*/function () {
    function Filter(p, source) {
      classCallCheck$2(this, Filter);

      this.p = p;
      this.source = source;
    }

    Filter.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new FilterSink(this.p, sink), scheduler$$1);
    };

    /**
     * Create a filtered source, fusing adjacent filter.filter if possible
     * @param {function(x:*):boolean} p filtering predicate
     * @param {{run:function}} source source to filter
     * @returns {Filter} filtered source
     */


    Filter.create = function create(p, source) {
      if (isCanonicalEmpty(source)) {
        return source;
      }

      if (source instanceof Filter) {
        return new Filter(and(source.p, p), source.source);
      }

      return new Filter(p, source);
    };

    return Filter;
  }();

  var FilterSink = /*#__PURE__*/function (_Pipe) {
    inherits(FilterSink, _Pipe);

    function FilterSink(p, sink) {
      classCallCheck$2(this, FilterSink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.p = p;
      return _this;
    }

    FilterSink.prototype.event = function event(t, x) {
      var p = this.p;
      p(x) && this.sink.event(t, x);
    };

    return FilterSink;
  }(Pipe);

  var and = function and(p, q) {
    return function (x) {
      return p(x) && q(x);
    };
  };

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  var FilterMap = /*#__PURE__*/function () {
    function FilterMap(p, f, source) {
      classCallCheck$2(this, FilterMap);

      this.p = p;
      this.f = f;
      this.source = source;
    }

    FilterMap.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new FilterMapSink(this.p, this.f, sink), scheduler$$1);
    };

    return FilterMap;
  }();

  var FilterMapSink = /*#__PURE__*/function (_Pipe) {
    inherits(FilterMapSink, _Pipe);

    function FilterMapSink(p, f, sink) {
      classCallCheck$2(this, FilterMapSink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.p = p;
      _this.f = f;
      return _this;
    }

    FilterMapSink.prototype.event = function event(t, x) {
      var f = this.f;
      var p = this.p;
      p(x) && this.sink.event(t, f(x));
    };

    return FilterMapSink;
  }(Pipe);

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  var Map = /*#__PURE__*/function () {
    function Map(f, source) {
      classCallCheck$2(this, Map);

      this.f = f;
      this.source = source;
    }

    Map.prototype.run = function run(sink, scheduler$$1) {
      // eslint-disable-line no-extend-native
      return this.source.run(new MapSink(this.f, sink), scheduler$$1);
    };

    /**
     * Create a mapped source, fusing adjacent map.map, filter.map,
     * and filter.map.map if possible
     * @param {function(*):*} f mapping function
     * @param {{run:function}} source source to map
     * @returns {Map|FilterMap} mapped source, possibly fused
     */


    Map.create = function create(f, source) {
      if (isCanonicalEmpty(source)) {
        return empty();
      }

      if (source instanceof Map) {
        return new Map(compose(f, source.f), source.source);
      }

      if (source instanceof Filter) {
        return new FilterMap(source.p, f, source.source);
      }

      return new Map(f, source);
    };

    return Map;
  }();

  var MapSink = /*#__PURE__*/function (_Pipe) {
    inherits(MapSink, _Pipe);

    function MapSink(f, sink) {
      classCallCheck$2(this, MapSink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.f = f;
      return _this;
    }

    MapSink.prototype.event = function event(t, x) {
      var f = this.f;
      this.sink.event(t, f(x));
    };

    return MapSink;
  }(Pipe);

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var SettableDisposable = /*#__PURE__*/function () {
    function SettableDisposable() {
      classCallCheck$2(this, SettableDisposable);

      this.disposable = undefined;
      this.disposed = false;
    }

    SettableDisposable.prototype.setDisposable = function setDisposable(disposable$$1) {
      if (this.disposable !== void 0) {
        throw new Error('setDisposable called more than once');
      }

      this.disposable = disposable$$1;

      if (this.disposed) {
        disposable$$1.dispose();
      }
    };

    SettableDisposable.prototype.dispose = function dispose$$1() {
      if (this.disposed) {
        return;
      }

      this.disposed = true;

      if (this.disposable !== void 0) {
        this.disposable.dispose();
      }
    };

    return SettableDisposable;
  }();

  var SliceSink = /*#__PURE__*/function (_Pipe) {
    inherits(SliceSink, _Pipe);

    function SliceSink(skip, take, sink, disposable$$1) {
      classCallCheck$2(this, SliceSink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.skip = skip;
      _this.take = take;
      _this.disposable = disposable$$1;
      return _this;
    }

    SliceSink.prototype.event = function event(t, x) {
      /* eslint complexity: [1, 4] */
      if (this.skip > 0) {
        this.skip -= 1;
        return;
      }

      if (this.take === 0) {
        return;
      }

      this.take -= 1;
      this.sink.event(t, x);
      if (this.take === 0) {
        this.disposable.dispose();
        this.sink.end(t);
      }
    };

    return SliceSink;
  }(Pipe);

  var TakeWhileSink = /*#__PURE__*/function (_Pipe2) {
    inherits(TakeWhileSink, _Pipe2);

    function TakeWhileSink(p, sink, disposable$$1) {
      classCallCheck$2(this, TakeWhileSink);

      var _this2 = possibleConstructorReturn(this, _Pipe2.call(this, sink));

      _this2.p = p;
      _this2.active = true;
      _this2.disposable = disposable$$1;
      return _this2;
    }

    TakeWhileSink.prototype.event = function event(t, x) {
      if (!this.active) {
        return;
      }

      var p = this.p;
      this.active = p(x);

      if (this.active) {
        this.sink.event(t, x);
      } else {
        this.disposable.dispose();
        this.sink.end(t);
      }
    };

    return TakeWhileSink;
  }(Pipe);

  var SkipWhileSink = /*#__PURE__*/function (_Pipe3) {
    inherits(SkipWhileSink, _Pipe3);

    function SkipWhileSink(p, sink) {
      classCallCheck$2(this, SkipWhileSink);

      var _this3 = possibleConstructorReturn(this, _Pipe3.call(this, sink));

      _this3.p = p;
      _this3.skipping = true;
      return _this3;
    }

    SkipWhileSink.prototype.event = function event(t, x) {
      if (this.skipping) {
        var p = this.p;
        this.skipping = p(x);
        if (this.skipping) {
          return;
        }
      }

      this.sink.event(t, x);
    };

    return SkipWhileSink;
  }(Pipe);

  var SkipAfterSink = /*#__PURE__*/function (_Pipe4) {
    inherits(SkipAfterSink, _Pipe4);

    function SkipAfterSink(p, sink) {
      classCallCheck$2(this, SkipAfterSink);

      var _this4 = possibleConstructorReturn(this, _Pipe4.call(this, sink));

      _this4.p = p;
      _this4.skipping = false;
      return _this4;
    }

    SkipAfterSink.prototype.event = function event(t, x) {
      if (this.skipping) {
        return;
      }

      var p = this.p;
      this.skipping = p(x);
      this.sink.event(t, x);

      if (this.skipping) {
        this.sink.end(t);
      }
    };

    return SkipAfterSink;
  }(Pipe);

  var ZipItemsSink = /*#__PURE__*/function (_Pipe) {
    inherits(ZipItemsSink, _Pipe);

    function ZipItemsSink(f, items, sink) {
      classCallCheck$2(this, ZipItemsSink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.f = f;
      _this.items = items;
      _this.index = 0;
      return _this;
    }

    ZipItemsSink.prototype.event = function event(t, b) {
      var f = this.f;
      this.sink.event(t, f(this.items[this.index], b));
      this.index += 1;
    };

    return ZipItemsSink;
  }(Pipe);

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var runEffects$1 = /*#__PURE__*/curry2(function (stream, scheduler$$1) {
    return new Promise(function (resolve, reject) {
      return runStream(stream, scheduler$$1, resolve, reject);
    });
  });

  function runStream(stream, scheduler$$1, resolve, reject) {
    var disposable$$1 = new SettableDisposable();
    var observer = new RunEffectsSink(resolve, reject, disposable$$1);

    disposable$$1.setDisposable(stream.run(observer, scheduler$$1));
  }

  var RunEffectsSink = /*#__PURE__*/function () {
    function RunEffectsSink(end, error, disposable$$1) {
      classCallCheck$2(this, RunEffectsSink);

      this._end = end;
      this._error = error;
      this._disposable = disposable$$1;
      this.active = true;
    }

    RunEffectsSink.prototype.event = function event(t, x) {};

    RunEffectsSink.prototype.end = function end(t) {
      if (!this.active) {
        return;
      }
      this._dispose(this._error, this._end, undefined);
    };

    RunEffectsSink.prototype.error = function error(t, e) {
      this._dispose(this._error, this._error, e);
    };

    RunEffectsSink.prototype._dispose = function _dispose(error, end, x) {
      this.active = false;
      tryDispose$1(error, end, x, this._disposable);
    };

    return RunEffectsSink;
  }();

  function tryDispose$1(error, end, x, disposable$$1) {
    try {
      disposable$$1.dispose();
    } catch (e) {
      error(e);
      return;
    }

    end(x);
  }

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  // Run a Stream, sending all its events to the
  // provided Sink.
  var run$1 = function run(sink, scheduler$$1, stream) {
      return stream.run(sink, scheduler$$1);
  };

  var RelativeSink = /*#__PURE__*/function () {
    function RelativeSink(offset, sink) {
      classCallCheck$2(this, RelativeSink);

      this.sink = sink;
      this.offset = offset;
    }

    RelativeSink.prototype.event = function event(t, x) {
      this.sink.event(t + this.offset, x);
    };

    RelativeSink.prototype.error = function error(t, e) {
      this.sink.error(t + this.offset, e);
    };

    RelativeSink.prototype.end = function end(t) {
      this.sink.end(t + this.offset);
    };

    return RelativeSink;
  }();

  // Create a stream with its own local clock
  // This transforms time from the provided scheduler's clock to a stream-local
  // clock (which starts at 0), and then *back* to the scheduler's clock before
  // propagating events to sink.  In other words, upstream sources will see local times,
  // and downstream sinks will see non-local (original) times.
  var withLocalTime$1 = function withLocalTime(origin, stream) {
    return new WithLocalTime(origin, stream);
  };

  var WithLocalTime = /*#__PURE__*/function () {
    function WithLocalTime(origin, source) {
      classCallCheck$2(this, WithLocalTime);

      this.origin = origin;
      this.source = source;
    }

    WithLocalTime.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(relativeSink(this.origin, sink), schedulerRelativeTo(this.origin, scheduler$$1));
    };

    return WithLocalTime;
  }();

  // Accumulate offsets instead of nesting RelativeSinks, which can happen
  // with higher-order stream and combinators like continueWith when they're
  // applied recursively.


  var relativeSink = function relativeSink(origin, sink) {
    return sink instanceof RelativeSink ? new RelativeSink(origin + sink.offset, sink.sink) : new RelativeSink(origin, sink);
  };

  var LoopSink = /*#__PURE__*/function (_Pipe) {
    inherits(LoopSink, _Pipe);

    function LoopSink(stepper, seed, sink) {
      classCallCheck$2(this, LoopSink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.step = stepper;
      _this.seed = seed;
      return _this;
    }

    LoopSink.prototype.event = function event(t, x) {
      var result = this.step(this.seed, x);
      this.seed = result.seed;
      this.sink.event(t, result.value);
    };

    return LoopSink;
  }(Pipe);

  var ScanSink = /*#__PURE__*/function (_Pipe) {
    inherits(ScanSink, _Pipe);

    function ScanSink(f, z, sink) {
      classCallCheck$2(this, ScanSink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.f = f;
      _this.value = z;
      return _this;
    }

    ScanSink.prototype.event = function event(t, x) {
      var f = this.f;
      this.value = f(this.value, x);
      this.sink.event(t, this.value);
    };

    return ScanSink;
  }(Pipe);

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  var continueWith$1 = function continueWith(f, stream) {
    return new ContinueWith(f, stream);
  };

  var ContinueWith = /*#__PURE__*/function () {
    function ContinueWith(f, source) {
      classCallCheck$2(this, ContinueWith);

      this.f = f;
      this.source = source;
    }

    ContinueWith.prototype.run = function run(sink, scheduler$$1) {
      return new ContinueWithSink(this.f, this.source, sink, scheduler$$1);
    };

    return ContinueWith;
  }();

  var ContinueWithSink = /*#__PURE__*/function (_Pipe) {
    inherits(ContinueWithSink, _Pipe);

    function ContinueWithSink(f, source, sink, scheduler$$1) {
      classCallCheck$2(this, ContinueWithSink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.f = f;
      _this.scheduler = scheduler$$1;
      _this.active = true;
      _this.disposable = disposeOnce(source.run(_this, scheduler$$1));
      return _this;
    }

    ContinueWithSink.prototype.event = function event(t, x) {
      if (!this.active) {
        return;
      }
      this.sink.event(t, x);
    };

    ContinueWithSink.prototype.end = function end(t) {
      if (!this.active) {
        return;
      }

      tryDispose(t, this.disposable, this.sink);

      this._startNext(t, this.sink);
    };

    ContinueWithSink.prototype._startNext = function _startNext(t, sink) {
      try {
        this.disposable = this._continue(this.f, t, sink);
      } catch (e) {
        sink.error(t, e);
      }
    };

    ContinueWithSink.prototype._continue = function _continue(f, t, sink) {
      return run$1(sink, this.scheduler, withLocalTime$1(t, f()));
    };

    ContinueWithSink.prototype.dispose = function dispose$$1() {
      this.active = false;
      return this.disposable.dispose();
    };

    return ContinueWithSink;
  }(Pipe);

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var startWith$1 = function startWith(x, stream) {
    return continueWith$1(function () {
      return stream;
    }, now(x));
  };

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  /**
   * Transform each value in the stream by applying f to each
   * @param {function(*):*} f mapping function
   * @param {Stream} stream stream to map
   * @returns {Stream} stream containing items transformed by f
   */
  var map$2 = function map$$1(f, stream) {
    return Map.create(f, stream);
  };

  /**
  * Perform a side effect for each item in the stream
  * @param {function(x:*):*} f side effect to execute for each item. The
  *  return value will be discarded.
  * @param {Stream} stream stream to tap
  * @returns {Stream} new stream containing the same items as this stream
  */
  var tap$1 = function tap(f, stream) {
    return new Tap(f, stream);
  };

  var Tap = /*#__PURE__*/function () {
    function Tap(f, source) {
      classCallCheck$2(this, Tap);

      this.source = source;
      this.f = f;
    }

    Tap.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new TapSink(this.f, sink), scheduler$$1);
    };

    return Tap;
  }();

  var TapSink = /*#__PURE__*/function (_Pipe) {
    inherits(TapSink, _Pipe);

    function TapSink(f, sink) {
      classCallCheck$2(this, TapSink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.f = f;
      return _this;
    }

    TapSink.prototype.event = function event(t, x) {
      var f = this.f;
      f(x);
      this.sink.event(t, x);
    };

    return TapSink;
  }(Pipe);

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  var IndexSink = /*#__PURE__*/function (_Sink) {
    inherits(IndexSink, _Sink);

    function IndexSink(i, sink) {
      classCallCheck$2(this, IndexSink);

      var _this = possibleConstructorReturn(this, _Sink.call(this, sink));

      _this.index = i;
      _this.active = true;
      _this.value = undefined;
      return _this;
    }

    IndexSink.prototype.event = function event(t, x) {
      if (!this.active) {
        return;
      }
      this.value = x;
      this.sink.event(t, this);
    };

    IndexSink.prototype.end = function end(t) {
      if (!this.active) {
        return;
      }
      this.active = false;
      this.sink.event(t, this);
    };

    return IndexSink;
  }(Pipe);

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  function invoke(f, args) {
    /* eslint complexity: [2,7] */
    switch (args.length) {
      case 0:
        return f();
      case 1:
        return f(args[0]);
      case 2:
        return f(args[0], args[1]);
      case 3:
        return f(args[0], args[1], args[2]);
      case 4:
        return f(args[0], args[1], args[2], args[3]);
      case 5:
        return f(args[0], args[1], args[2], args[3], args[4]);
      default:
        return f.apply(void 0, args);
    }
  }

  var CombineSink = /*#__PURE__*/function (_Pipe) {
    inherits(CombineSink, _Pipe);

    function CombineSink(disposables, sinks, sink, f) {
      classCallCheck$2(this, CombineSink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.disposables = disposables;
      _this.sinks = sinks;
      _this.f = f;

      var l = sinks.length;
      _this.awaiting = l;
      _this.values = new Array(l);
      _this.hasValue = new Array(l).fill(false);
      _this.activeCount = sinks.length;
      return _this;
    }

    CombineSink.prototype.event = function event(t, indexedValue) {
      if (!indexedValue.active) {
        this._dispose(t, indexedValue.index);
        return;
      }

      var i = indexedValue.index;
      var awaiting = this._updateReady(i);

      this.values[i] = indexedValue.value;
      if (awaiting === 0) {
        this.sink.event(t, invoke(this.f, this.values));
      }
    };

    CombineSink.prototype._updateReady = function _updateReady(index) {
      if (this.awaiting > 0) {
        if (!this.hasValue[index]) {
          this.hasValue[index] = true;
          this.awaiting -= 1;
        }
      }
      return this.awaiting;
    };

    CombineSink.prototype._dispose = function _dispose(t, index) {
      tryDispose(t, this.disposables[index], this.sink);
      if (--this.activeCount === 0) {
        this.sink.end(t);
      }
    };

    return CombineSink;
  }(Pipe);

  var MergeSink = /*#__PURE__*/function (_Pipe) {
    inherits(MergeSink, _Pipe);

    function MergeSink(disposables, sinks, sink) {
      classCallCheck$2(this, MergeSink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.disposables = disposables;
      _this.activeCount = sinks.length;
      return _this;
    }

    MergeSink.prototype.event = function event(t, indexValue) {
      if (!indexValue.active) {
        this._dispose(t, indexValue.index);
        return;
      }
      this.sink.event(t, indexValue.value);
    };

    MergeSink.prototype._dispose = function _dispose(t, index) {
      tryDispose(t, this.disposables[index], this.sink);
      if (--this.activeCount === 0) {
        this.sink.end(t);
      }
    };

    return MergeSink;
  }(Pipe);

  var SnapshotSink = /*#__PURE__*/function (_Pipe) {
    inherits(SnapshotSink, _Pipe);

    function SnapshotSink(f, sink) {
      classCallCheck$2(this, SnapshotSink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.f = f;
      _this.latest = new LatestValueSink(_this);
      return _this;
    }

    SnapshotSink.prototype.event = function event(t, x) {
      if (this.latest.hasValue) {
        var f = this.f;
        this.sink.event(t, f(this.latest.value, x));
      }
    };

    return SnapshotSink;
  }(Pipe);

  var LatestValueSink = /*#__PURE__*/function (_Pipe2) {
    inherits(LatestValueSink, _Pipe2);

    function LatestValueSink(sink) {
      classCallCheck$2(this, LatestValueSink);

      var _this2 = possibleConstructorReturn(this, _Pipe2.call(this, sink));

      _this2.hasValue = false;
      return _this2;
    }

    LatestValueSink.prototype.event = function event(t, x) {
      this.value = x;
      this.hasValue = true;
    };

    LatestValueSink.prototype.end = function end() {};

    return LatestValueSink;
  }(Pipe);

  var ZipSink = /*#__PURE__*/function (_Pipe) {
    inherits(ZipSink, _Pipe);

    function ZipSink(f, buffers, sinks, sink) {
      classCallCheck$2(this, ZipSink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.f = f;
      _this.sinks = sinks;
      _this.buffers = buffers;
      return _this;
    }

    ZipSink.prototype.event = function event(t, indexedValue) {
      /* eslint complexity: [1, 5] */
      if (!indexedValue.active) {
        this._dispose(t, indexedValue.index);
        return;
      }

      var buffers = this.buffers;
      var buffer = buffers[indexedValue.index];

      buffer.push(indexedValue.value);

      if (buffer.length() === 1) {
        if (!ready(this.buffers)) {
          return;
        }

        emitZipped(this.f, t, buffers, this.sink);

        if (ended(this.buffers, this.sinks)) {
          this.sink.end(t);
        }
      }
    };

    ZipSink.prototype._dispose = function _dispose(t, index) {
      var buffer = this.buffers[index];
      if (buffer.isEmpty()) {
        this.sink.end(t);
      }
    };

    return ZipSink;
  }(Pipe);

  var emitZipped = function emitZipped(f, t, buffers, sink) {
    return sink.event(t, invoke(f, map(head, buffers)));
  };

  var head = function head(buffer) {
    return buffer.shift();
  };

  function ended(buffers, sinks) {
    for (var i = 0, l = buffers.length; i < l; ++i) {
      if (buffers[i].isEmpty() && !sinks[i].active) {
        return true;
      }
    }
    return false;
  }

  function ready(buffers) {
    for (var i = 0, l = buffers.length; i < l; ++i) {
      if (buffers[i].isEmpty()) {
        return false;
      }
    }
    return true;
  }

  var SkipRepeatsSink = /*#__PURE__*/function (_Pipe) {
    inherits(SkipRepeatsSink, _Pipe);

    function SkipRepeatsSink(equals, sink) {
      classCallCheck$2(this, SkipRepeatsSink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.equals = equals;
      _this.value = void 0;
      _this.init = true;
      return _this;
    }

    SkipRepeatsSink.prototype.event = function event(t, x) {
      if (this.init) {
        this.init = false;
        this.value = x;
        this.sink.event(t, x);
      } else if (!this.equals(this.value, x)) {
        this.value = x;
        this.sink.event(t, x);
      }
    };

    return SkipRepeatsSink;
  }(Pipe);

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  var until$1 = function until(signal, stream) {
    return new Until(signal, stream);
  };

  var Until = /*#__PURE__*/function () {
    function Until(maxSignal, source) {
      classCallCheck$2(this, Until);

      this.maxSignal = maxSignal;
      this.source = source;
    }

    Until.prototype.run = function run(sink, scheduler$$1) {
      var min = new Bound(-Infinity, sink);
      var max = new UpperBound(this.maxSignal, sink, scheduler$$1);
      var disposable$$1 = this.source.run(new TimeWindowSink(min, max, sink), scheduler$$1);

      return disposeAll([min, max, disposable$$1]);
    };

    return Until;
  }();

  var Bound = /*#__PURE__*/function (_Pipe) {
    inherits(Bound, _Pipe);

    function Bound(value, sink) {
      classCallCheck$2(this, Bound);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.value = value;
      return _this;
    }

    Bound.prototype.event = function event() {};

    Bound.prototype.end = function end() {};

    Bound.prototype.dispose = function dispose$$1() {};

    return Bound;
  }(Pipe);

  var TimeWindowSink = /*#__PURE__*/function (_Pipe2) {
    inherits(TimeWindowSink, _Pipe2);

    function TimeWindowSink(min, max, sink) {
      classCallCheck$2(this, TimeWindowSink);

      var _this2 = possibleConstructorReturn(this, _Pipe2.call(this, sink));

      _this2.min = min;
      _this2.max = max;
      return _this2;
    }

    TimeWindowSink.prototype.event = function event(t, x) {
      if (t >= this.min.value && t < this.max.value) {
        this.sink.event(t, x);
      }
    };

    return TimeWindowSink;
  }(Pipe);

  var LowerBound = /*#__PURE__*/function (_Pipe3) {
    inherits(LowerBound, _Pipe3);

    function LowerBound(signal, sink, scheduler$$1) {
      classCallCheck$2(this, LowerBound);

      var _this3 = possibleConstructorReturn(this, _Pipe3.call(this, sink));

      _this3.value = Infinity;
      _this3.disposable = signal.run(_this3, scheduler$$1);
      return _this3;
    }

    LowerBound.prototype.event = function event(t /*, x */) {
      if (t < this.value) {
        this.value = t;
      }
    };

    LowerBound.prototype.end = function end() {};

    LowerBound.prototype.dispose = function dispose$$1() {
      return this.disposable.dispose();
    };

    return LowerBound;
  }(Pipe);

  var UpperBound = /*#__PURE__*/function (_Pipe4) {
    inherits(UpperBound, _Pipe4);

    function UpperBound(signal, sink, scheduler$$1) {
      classCallCheck$2(this, UpperBound);

      var _this4 = possibleConstructorReturn(this, _Pipe4.call(this, sink));

      _this4.value = Infinity;
      _this4.disposable = signal.run(_this4, scheduler$$1);
      return _this4;
    }

    UpperBound.prototype.event = function event(t, x) {
      if (t < this.value) {
        this.value = t;
        this.sink.end(t);
      }
    };

    UpperBound.prototype.end = function end() {};

    UpperBound.prototype.dispose = function dispose$$1() {
      return this.disposable.dispose();
    };

    return UpperBound;
  }(Pipe);

  var DelaySink = /*#__PURE__*/function (_Pipe) {
    inherits(DelaySink, _Pipe);

    function DelaySink(dt, sink, scheduler$$1) {
      classCallCheck$2(this, DelaySink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.dt = dt;
      _this.scheduler = scheduler$$1;
      return _this;
    }

    DelaySink.prototype.dispose = function dispose$$1() {
      var _this2 = this;

      cancelAllTasks(function (task) {
        return task.sink === _this2.sink;
      }, this.scheduler);
    };

    DelaySink.prototype.event = function event(t, x) {
      delay(this.dt, propagateEventTask$1(x, this.sink), this.scheduler);
    };

    DelaySink.prototype.end = function end(t) {
      delay(this.dt, propagateEndTask(this.sink), this.scheduler);
    };

    return DelaySink;
  }(Pipe);

  var ThrottleSink = /*#__PURE__*/function (_Pipe) {
    inherits(ThrottleSink, _Pipe);

    function ThrottleSink(period, sink) {
      classCallCheck$2(this, ThrottleSink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.time = 0;
      _this.period = period;
      return _this;
    }

    ThrottleSink.prototype.event = function event(t, x) {
      if (t >= this.time) {
        this.time = t + this.period;
        this.sink.event(t, x);
      }
    };

    return ThrottleSink;
  }(Pipe);

  // -----------------------------------------------------------------------
  // Observing

  var runEffects$$1 = /*#__PURE__*/curry2(runEffects$1);

  // -----------------------------------------------------------------------
  // Extending

  var startWith$$1 = /*#__PURE__*/curry2(startWith$1);

  // -----------------------------------------------------------------------
  // Transforming

  var map$1 = /*#__PURE__*/curry2(map$2);
  var tap$$1 = /*#__PURE__*/curry2(tap$1);

  // -----------------------------------------------------------------------
  // Time slicing

  var until$$1 = /*#__PURE__*/curry2(until$1);

  // Read the current time from the provided Scheduler
  var currentTime$1 = function (scheduler) { return scheduler.currentTime(); };

  /** @license MIT License (c) copyright 2015-2016 original author or authors */
  /** @author Brian Cavalier */
  // domEvent :: (EventTarget t, Event e) => String -> t -> boolean=false -> Stream e
  var domEvent = function (event, node, capture) {
      if ( capture === void 0 ) capture = false;

      return new DomEvent(event, node, capture);
  };
  var click = function (node, capture) {
    if ( capture === void 0 ) capture = false;

    return domEvent('click', node, capture);
  };
  var mousemove = function (node, capture) {
    if ( capture === void 0 ) capture = false;

    return domEvent('mousemove', node, capture);
  };

  var DomEvent = function DomEvent (event, node, capture) {
    this.event = event;
    this.node = node;
    this.capture = capture;
  };

  DomEvent.prototype.run = function run (sink, scheduler$$1) {
      var this$1 = this;

    var send = function (e) { return tryEvent$1(currentTime$1(scheduler$$1), e, sink); };
    var dispose = function () { return this$1.node.removeEventListener(this$1.event, send, this$1.capture); };

    this.node.addEventListener(this.event, send, this.capture);

    return { dispose: dispose }
  };

  function tryEvent$1 (t, x, sink) {
    try {
      sink.event(t, x);
    } catch (e) {
      sink.error(t, e);
    }
  }

  var toCoords = function (e) { return e.clientX + "," + e.clientY; };
  var render = function (s) { document.body.textContent = s; };
  var moveUntilClick = until$$1(click(document), mousemove(document));
  var coords = map$1(toCoords, moveUntilClick);
  var updates = startWith$$1('move the mouse, please', coords);
  runEffects$$1(tap$$1(render, updates), newDefaultScheduler());

}());
//# sourceMappingURL=index.js.map