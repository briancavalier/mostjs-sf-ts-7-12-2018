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

  // remove :: Int -> [a] -> [a]
  // remove element at index
  function remove(i, a) {
    // eslint-disable-line complexity
    if (i < 0) {
      throw new TypeError('i must be >= 0');
    }

    var l = a.length;
    if (l === 0 || i >= l) {
      // exit early if index beyond end of array
      return a;
    }

    if (l === 1) {
      // exit early if index in bounds and length === 1
      return [];
    }

    return unsafeRemove(i, a, l - 1);
  }

  // unsafeRemove :: Int -> [a] -> Int -> [a]
  // Internal helper to remove element at index
  function unsafeRemove(i, a, l) {
    var b = new Array(l);
    var j = void 0;
    for (j = 0; j < i; ++j) {
      b[j] = a[j];
    }
    for (j = i; j < l; ++j) {
      b[j] = a[j + 1];
    }

    return b;
  }

  // removeAll :: (a -> boolean) -> [a] -> [a]
  // remove all elements matching a predicate
  // @deprecated
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

  /** @license MIT License (c) copyright 2010-2016 original author or authors */

  // id :: a -> a
  var id = function id(x) {
    return x;
  };

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

    // @deprecated


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

    // @deprecated


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

  // @deprecated
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

  // Read the current time from the provided Scheduler
  var currentTime = function currentTime(scheduler) {
    return scheduler.currentTime();
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

  // Schedule a task to run periodically, with the
  // first run starting asap
  var periodic = /*#__PURE__*/curry3(function (period, task, scheduler) {
    return scheduler.scheduleTask(0, 0, period, task);
  });

  // Cancel a scheduledTask
  var cancelTask = function cancelTask(scheduledTask) {
    return scheduledTask.dispose();
  };

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

  // Disposable represents a resource that must be
  // disposed/released. It aggregates a function to dispose
  // the resource and a handle to a key/id/handle/reference
  // that identifies the resource

  var DisposeWith = /*#__PURE__*/function () {
    function DisposeWith(dispose, resource) {
      classCallCheck$1(this, DisposeWith);

      this._dispose = dispose;
      this._resource = resource;
    }

    DisposeWith.prototype.dispose = function dispose() {
      this._dispose(this._resource);
    };

    return DisposeWith;
  }();

  /** @license MIT License (c) copyright 2010 original author or authors */
  // Aggregate a list of disposables into a DisposeAll
  var disposeAll = function disposeAll(ds) {
    var merged = reduce(merge, [], ds);
    return merged.length === 0 ? disposeNone() : new DisposeAll(merged);
  };

  // Convenience to aggregate 2 disposables
  var disposeBoth = /*#__PURE__*/curry2(function (d1, d2) {
    return disposeAll([d1, d2]);
  });

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

  var propagateErrorTask$1 = function propagateErrorTask(value, sink) {
    return propagateTask$1(runError, value, sink);
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

  var runError = function runError(t, e, sink) {
    return sink.error(t, e);
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

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var never = function never() {
    return NEVER;
  };

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

  var Periodic = /*#__PURE__*/function () {
    function Periodic(period) {
      classCallCheck$2(this, Periodic);

      this.period = period;
    }

    Periodic.prototype.run = function run(sink, scheduler$$1) {
      return periodic(this.period, propagateEventTask$1(undefined, sink), scheduler$$1);
    };

    return Periodic;
  }();

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

  var Slice = /*#__PURE__*/function () {
    function Slice(bounds, source) {
      classCallCheck$2(this, Slice);

      this.source = source;
      this.bounds = bounds;
    }

    Slice.prototype.run = function run(sink, scheduler$$1) {
      var disposable$$1 = new SettableDisposable();
      var sliceSink = new SliceSink(this.bounds.min, this.bounds.max - this.bounds.min, sink, disposable$$1);

      disposable$$1.setDisposable(this.source.run(sliceSink, scheduler$$1));

      return disposable$$1;
    };

    return Slice;
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

  var TakeWhile = /*#__PURE__*/function () {
    function TakeWhile(p, source) {
      classCallCheck$2(this, TakeWhile);

      this.p = p;
      this.source = source;
    }

    TakeWhile.prototype.run = function run(sink, scheduler$$1) {
      var disposable$$1 = new SettableDisposable();
      var takeWhileSink = new TakeWhileSink(this.p, sink, disposable$$1);

      disposable$$1.setDisposable(this.source.run(takeWhileSink, scheduler$$1));

      return disposable$$1;
    };

    return TakeWhile;
  }();

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

  var SkipWhile = /*#__PURE__*/function () {
    function SkipWhile(p, source) {
      classCallCheck$2(this, SkipWhile);

      this.p = p;
      this.source = source;
    }

    SkipWhile.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new SkipWhileSink(this.p, sink), scheduler$$1);
    };

    return SkipWhile;
  }();

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

  var SkipAfter = /*#__PURE__*/function () {
    function SkipAfter(p, source) {
      classCallCheck$2(this, SkipAfter);

      this.p = p;
      this.source = source;
    }

    SkipAfter.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new SkipAfterSink(this.p, sink), scheduler$$1);
    };

    return SkipAfter;
  }();

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

  var ZipItems = /*#__PURE__*/function () {
    function ZipItems(f, items, source) {
      classCallCheck$2(this, ZipItems);

      this.f = f;
      this.items = items;
      this.source = source;
    }

    ZipItems.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new ZipItemsSink(this.f, this.items, sink), scheduler$$1);
    };

    return ZipItems;
  }();

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

  var Loop = /*#__PURE__*/function () {
    function Loop(stepper, seed, source) {
      classCallCheck$2(this, Loop);

      this.step = stepper;
      this.seed = seed;
      this.source = source;
    }

    Loop.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new LoopSink(this.step, this.seed, sink), scheduler$$1);
    };

    return Loop;
  }();

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

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  /**
   * Create a stream containing successive reduce results of applying f to
   * the previous reduce result and the current stream item.
   * @param {function(result:*, x:*):*} f reducer function
   * @param {*} initial initial value
   * @param {Stream} stream stream to scan
   * @returns {Stream} new stream containing successive reduce results
   */
  var scan$1 = function scan(f, initial, stream) {
    return new Scan(f, initial, stream);
  };

  var Scan = /*#__PURE__*/function () {
    function Scan(f, z, source) {
      classCallCheck$2(this, Scan);

      this.source = source;
      this.f = f;
      this.value = z;
    }

    Scan.prototype.run = function run(sink, scheduler$$1) {
      var d1 = asap(propagateEventTask$1(this.value, sink), scheduler$$1);
      var d2 = this.source.run(new ScanSink(this.f, this.value, sink), scheduler$$1);
      return disposeBoth(d1, d2);
    };

    return Scan;
  }();

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
  * Replace each value in the stream with x
  * @param {*} x
  * @param {Stream} stream
  * @returns {Stream} stream containing items replaced with x
  */
  var constant$1 = function constant(x, stream) {
    return map$2(function () {
      return x;
    }, stream);
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

  var Combine = /*#__PURE__*/function () {
    function Combine(f, sources) {
      classCallCheck$2(this, Combine);

      this.f = f;
      this.sources = sources;
    }

    Combine.prototype.run = function run(sink, scheduler$$1) {
      var l = this.sources.length;
      var disposables = new Array(l);
      var sinks = new Array(l);

      var mergeSink = new CombineSink(disposables, sinks, sink, this.f);

      for (var indexSink, i = 0; i < l; ++i) {
        indexSink = sinks[i] = new IndexSink(i, mergeSink);
        disposables[i] = this.sources[i].run(indexSink, scheduler$$1);
      }

      return disposeAll(disposables);
    };

    return Combine;
  }();

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

  /** @license MIT License (c) copyright 2010 original author or authors */

  /**
   * Doubly linked list
   * @constructor
   */
  var LinkedList = /*#__PURE__*/function () {
    function LinkedList() {
      classCallCheck$2(this, LinkedList);

      this.head = null;
      this.length = 0;
    }

    /**
     * Add a node to the end of the list
     * @param {{prev:Object|null, next:Object|null, dispose:function}} x node to add
     */


    LinkedList.prototype.add = function add(x) {
      if (this.head !== null) {
        this.head.prev = x;
        x.next = this.head;
      }
      this.head = x;
      ++this.length;
    };

    /**
     * Remove the provided node from the list
     * @param {{prev:Object|null, next:Object|null, dispose:function}} x node to remove
     */


    LinkedList.prototype.remove = function remove$$1(x) {
      // eslint-disable-line  complexity
      --this.length;
      if (x === this.head) {
        this.head = this.head.next;
      }
      if (x.next !== null) {
        x.next.prev = x.prev;
        x.next = null;
      }
      if (x.prev !== null) {
        x.prev.next = x.next;
        x.prev = null;
      }
    };

    /**
     * @returns {boolean} true iff there are no nodes in the list
     */


    LinkedList.prototype.isEmpty = function isEmpty() {
      return this.length === 0;
    };

    /**
     * Dispose all nodes
     * @returns {void}
     */


    LinkedList.prototype.dispose = function dispose$$1() {
      if (this.isEmpty()) {
        return;
      }

      var head = this.head;
      this.head = null;
      this.length = 0;

      while (head !== null) {
        head.dispose();
        head = head.next;
      }
    };

    return LinkedList;
  }();

  var mergeMapConcurrently$1 = function mergeMapConcurrently(f, concurrency, stream) {
    return isCanonicalEmpty(stream) ? empty() : new MergeConcurrently(f, concurrency, stream);
  };

  var MergeConcurrently = /*#__PURE__*/function () {
    function MergeConcurrently(f, concurrency, source) {
      classCallCheck$2(this, MergeConcurrently);

      this.f = f;
      this.concurrency = concurrency;
      this.source = source;
    }

    MergeConcurrently.prototype.run = function run(sink, scheduler$$1) {
      return new Outer(this.f, this.concurrency, this.source, sink, scheduler$$1);
    };

    return MergeConcurrently;
  }();

  var Outer = /*#__PURE__*/function () {
    function Outer(f, concurrency, source, sink, scheduler$$1) {
      classCallCheck$2(this, Outer);

      this.f = f;
      this.concurrency = concurrency;
      this.sink = sink;
      this.scheduler = scheduler$$1;
      this.pending = [];
      this.current = new LinkedList();
      this.disposable = disposeOnce(source.run(this, scheduler$$1));
      this.active = true;
    }

    Outer.prototype.event = function event(t, x) {
      this._addInner(t, x);
    };

    Outer.prototype._addInner = function _addInner(t, x) {
      if (this.current.length < this.concurrency) {
        this._startInner(t, x);
      } else {
        this.pending.push(x);
      }
    };

    Outer.prototype._startInner = function _startInner(t, x) {
      try {
        this._initInner(t, x);
      } catch (e) {
        this.error(t, e);
      }
    };

    Outer.prototype._initInner = function _initInner(t, x) {
      var innerSink = new Inner(t, this, this.sink);
      innerSink.disposable = mapAndRun(this.f, t, x, innerSink, this.scheduler);
      this.current.add(innerSink);
    };

    Outer.prototype.end = function end(t) {
      this.active = false;
      tryDispose(t, this.disposable, this.sink);
      this._checkEnd(t);
    };

    Outer.prototype.error = function error(t, e) {
      this.active = false;
      this.sink.error(t, e);
    };

    Outer.prototype.dispose = function dispose$$1() {
      this.active = false;
      this.pending.length = 0;
      this.disposable.dispose();
      this.current.dispose();
    };

    Outer.prototype._endInner = function _endInner(t, inner) {
      this.current.remove(inner);
      tryDispose(t, inner, this);

      if (this.pending.length === 0) {
        this._checkEnd(t);
      } else {
        this._startInner(t, this.pending.shift());
      }
    };

    Outer.prototype._checkEnd = function _checkEnd(t) {
      if (!this.active && this.current.isEmpty()) {
        this.sink.end(t);
      }
    };

    return Outer;
  }();

  var mapAndRun = function mapAndRun(f, t, x, sink, scheduler$$1) {
    return f(x).run(sink, schedulerRelativeTo(t, scheduler$$1));
  };

  var Inner = /*#__PURE__*/function () {
    function Inner(time, outer, sink) {
      classCallCheck$2(this, Inner);

      this.prev = this.next = null;
      this.time = time;
      this.outer = outer;
      this.sink = sink;
      this.disposable = void 0;
    }

    Inner.prototype.event = function event(t, x) {
      this.sink.event(t + this.time, x);
    };

    Inner.prototype.end = function end(t) {
      this.outer._endInner(t + this.time, this);
    };

    Inner.prototype.error = function error(t, e) {
      this.outer.error(t + this.time, e);
    };

    Inner.prototype.dispose = function dispose$$1() {
      return this.disposable.dispose();
    };

    return Inner;
  }();

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  /**
   * Map each value in the stream to a new stream, and merge it into the
   * returned outer stream. Event arrival times are preserved.
   * @param {function(x:*):Stream} f chaining function, must return a Stream
   * @param {Stream} stream
   * @returns {Stream} new stream containing all events from each stream returned by f
   */
  var chain$1 = function chain(f, stream) {
    return mergeMapConcurrently$1(f, Infinity, stream);
  };

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  /**
   * @returns {Stream} stream containing events from two streams in time order.
   * If two events are simultaneous they will be merged in arbitrary order.
   */
  function merge$1(stream1, stream2) {
    return mergeArray([stream1, stream2]);
  }

  /**
   * @param {Array} streams array of stream to merge
   * @returns {Stream} stream containing events from all input observables
   * in time order.  If two events are simultaneous they will be merged in
   * arbitrary order.
   */
  var mergeArray = function mergeArray(streams) {
    return mergeStreams(withoutCanonicalEmpty(streams));
  };

  /**
   * This implements fusion/flattening for merge.  It will
   * fuse adjacent merge operations.  For example:
   * - a.merge(b).merge(c) effectively becomes merge(a, b, c)
   * - merge(a, merge(b, c)) effectively becomes merge(a, b, c)
   * It does this by concatenating the sources arrays of
   * any nested Merge sources, in effect "flattening" nested
   * merge operations into a single merge.
   */
  var mergeStreams = function mergeStreams(streams) {
    return streams.length === 0 ? empty() : streams.length === 1 ? streams[0] : new Merge(reduce(appendSources, [], streams));
  };

  var withoutCanonicalEmpty = function withoutCanonicalEmpty(streams) {
    return streams.filter(isNotCanonicalEmpty);
  };

  var isNotCanonicalEmpty = function isNotCanonicalEmpty(stream) {
    return !isCanonicalEmpty(stream);
  };

  var appendSources = function appendSources(sources, stream) {
    return sources.concat(stream instanceof Merge ? stream.sources : stream);
  };

  var Merge = /*#__PURE__*/function () {
    function Merge(sources) {
      classCallCheck$2(this, Merge);

      this.sources = sources;
    }

    Merge.prototype.run = function run(sink, scheduler$$1) {
      var l = this.sources.length;
      var disposables = new Array(l);
      var sinks = new Array(l);

      var mergeSink = new MergeSink(disposables, sinks, sink);

      for (var indexSink, i = 0; i < l; ++i) {
        indexSink = sinks[i] = new IndexSink(i, mergeSink);
        disposables[i] = this.sources[i].run(indexSink, scheduler$$1);
      }

      return disposeAll(disposables);
    };

    return Merge;
  }();

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

  var Snapshot = /*#__PURE__*/function () {
    function Snapshot(f, values, sampler) {
      classCallCheck$2(this, Snapshot);

      this.f = f;
      this.values = values;
      this.sampler = sampler;
    }

    Snapshot.prototype.run = function run(sink, scheduler$$1) {
      var sampleSink = new SnapshotSink(this.f, sink);
      var valuesDisposable = this.values.run(sampleSink.latest, scheduler$$1);
      var samplerDisposable = this.sampler.run(sampleSink, scheduler$$1);

      return disposeBoth(samplerDisposable, valuesDisposable);
    };

    return Snapshot;
  }();

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

  // Copied and modified from https://github.com/invertase/denque
  // MIT License

  // These constants were extracted directly from denque's shift()
  // It's not clear exactly why the authors chose these particular
  // values, but given denque's stated goals, it seems likely that
  // they were chosen for speed/memory reasons.

  // Max value of _head at which Queue is willing to shink
  // its internal array
  var HEAD_MAX_SHRINK = 2;

  // Min value of _tail at which Queue is willing to shink
  // its internal array
  var TAIL_MIN_SHRINK = 10000;

  var Queue = /*#__PURE__*/function () {
    function Queue() {
      classCallCheck$2(this, Queue);

      this._head = 0;
      this._tail = 0;
      this._capacityMask = 0x3;
      this._list = new Array(4);
    }

    Queue.prototype.push = function push(x) {
      var tail$$1 = this._tail;
      this._list[tail$$1] = x;
      this._tail = tail$$1 + 1 & this._capacityMask;
      if (this._tail === this._head) {
        this._growArray();
      }

      if (this._head < this._tail) {
        return this._tail - this._head;
      } else {
        return this._capacityMask + 1 - (this._head - this._tail);
      }
    };

    Queue.prototype.shift = function shift() {
      var head = this._head;
      if (head === this._tail) {
        return undefined;
      }

      var x = this._list[head];
      this._list[head] = undefined;
      this._head = head + 1 & this._capacityMask;
      if (head < HEAD_MAX_SHRINK && this._tail > TAIL_MIN_SHRINK && this._tail <= this._list.length >>> 2) {
        this._shrinkArray();
      }

      return x;
    };

    Queue.prototype.isEmpty = function isEmpty() {
      return this._head === this._tail;
    };

    Queue.prototype.length = function length() {
      if (this._head === this._tail) {
        return 0;
      } else if (this._head < this._tail) {
        return this._tail - this._head;
      } else {
        return this._capacityMask + 1 - (this._head - this._tail);
      }
    };

    Queue.prototype._growArray = function _growArray() {
      if (this._head) {
        // copy existing data, head to end, then beginning to tail.
        this._list = this._copyArray();
        this._head = 0;
      }

      // head is at 0 and array is now full, safe to extend
      this._tail = this._list.length;

      this._list.length *= 2;
      this._capacityMask = this._capacityMask << 1 | 1;
    };

    Queue.prototype._shrinkArray = function _shrinkArray() {
      this._list.length >>>= 1;
      this._capacityMask >>>= 1;
    };

    Queue.prototype._copyArray = function _copyArray() {
      var newArray = [];
      var list = this._list;
      var len = list.length;

      var i = void 0;
      for (i = this._head; i < len; i++) {
        newArray.push(list[i]);
      }
      for (i = 0; i < this._tail; i++) {
        newArray.push(list[i]);
      }

      return newArray;
    };

    return Queue;
  }();

  var Zip = /*#__PURE__*/function () {
    function Zip(f, sources) {
      classCallCheck$2(this, Zip);

      this.f = f;
      this.sources = sources;
    }

    Zip.prototype.run = function run(sink, scheduler$$1) {
      var l = this.sources.length;
      var disposables = new Array(l);
      var sinks = new Array(l);
      var buffers = new Array(l);

      var zipSink = new ZipSink(this.f, buffers, sinks, sink);

      for (var indexSink, i = 0; i < l; ++i) {
        buffers[i] = new Queue();
        indexSink = sinks[i] = new IndexSink(i, zipSink);
        disposables[i] = this.sources[i].run(indexSink, scheduler$$1);
      }

      return disposeAll(disposables);
    };

    return Zip;
  }();

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

  var Switch = /*#__PURE__*/function () {
    function Switch(source) {
      classCallCheck$2(this, Switch);

      this.source = source;
    }

    Switch.prototype.run = function run(sink, scheduler$$1) {
      var switchSink = new SwitchSink(sink, scheduler$$1);
      return disposeBoth(switchSink, this.source.run(switchSink, scheduler$$1));
    };

    return Switch;
  }();

  var SwitchSink = /*#__PURE__*/function () {
    function SwitchSink(sink, scheduler$$1) {
      classCallCheck$2(this, SwitchSink);

      this.sink = sink;
      this.scheduler = scheduler$$1;
      this.current = null;
      this.ended = false;
    }

    SwitchSink.prototype.event = function event(t, stream) {
      this._disposeCurrent(t);
      this.current = new Segment(stream, t, Infinity, this, this.sink, this.scheduler);
    };

    SwitchSink.prototype.end = function end(t) {
      this.ended = true;
      this._checkEnd(t);
    };

    SwitchSink.prototype.error = function error(t, e) {
      this.ended = true;
      this.sink.error(t, e);
    };

    SwitchSink.prototype.dispose = function dispose$$1() {
      return this._disposeCurrent(currentTime(this.scheduler));
    };

    SwitchSink.prototype._disposeCurrent = function _disposeCurrent(t) {
      if (this.current !== null) {
        return this.current._dispose(t);
      }
    };

    SwitchSink.prototype._disposeInner = function _disposeInner(t, inner) {
      inner._dispose(t);
      if (inner === this.current) {
        this.current = null;
      }
    };

    SwitchSink.prototype._checkEnd = function _checkEnd(t) {
      if (this.ended && this.current === null) {
        this.sink.end(t);
      }
    };

    SwitchSink.prototype._endInner = function _endInner(t, inner) {
      this._disposeInner(t, inner);
      this._checkEnd(t);
    };

    SwitchSink.prototype._errorInner = function _errorInner(t, e, inner) {
      this._disposeInner(t, inner);
      this.sink.error(t, e);
    };

    return SwitchSink;
  }();

  var Segment = /*#__PURE__*/function () {
    function Segment(source, min, max, outer, sink, scheduler$$1) {
      classCallCheck$2(this, Segment);

      this.min = min;
      this.max = max;
      this.outer = outer;
      this.sink = sink;
      this.disposable = source.run(this, schedulerRelativeTo(min, scheduler$$1));
    }

    Segment.prototype.event = function event(t, x) {
      var time = Math.max(0, t + this.min);
      if (time < this.max) {
        this.sink.event(time, x);
      }
    };

    Segment.prototype.end = function end(t) {
      this.outer._endInner(t + this.min, this);
    };

    Segment.prototype.error = function error(t, e) {
      this.outer._errorInner(t + this.min, e, this);
    };

    Segment.prototype._dispose = function _dispose(t) {
      tryDispose(t + this.min, this.disposable, this.sink);
    };

    return Segment;
  }();

  /**
   * Skip repeated events, using === to detect duplicates
   * @param {Stream} stream stream from which to omit repeated events
   * @returns {Stream} stream without repeated events
   */
  var skipRepeats = function skipRepeats(stream) {
    return skipRepeatsWith$1(same, stream);
  };

  /**
   * Skip repeated events using the provided equals function to detect duplicates
   * @param {function(a:*, b:*):boolean} equals optional function to compare items
   * @param {Stream} stream stream from which to omit repeated events
   * @returns {Stream} stream without repeated events
   */
  var skipRepeatsWith$1 = function skipRepeatsWith(equals, stream) {
    return isCanonicalEmpty(stream) ? empty() : new SkipRepeats(equals, stream);
  };

  var SkipRepeats = /*#__PURE__*/function () {
    function SkipRepeats(equals, source) {
      classCallCheck$2(this, SkipRepeats);

      this.equals = equals;
      this.source = source;
    }

    SkipRepeats.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new SkipRepeatsSink(this.equals, sink), scheduler$$1);
    };

    return SkipRepeats;
  }();

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

  function same(a, b) {
    return a === b;
  }

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

  var Since = /*#__PURE__*/function () {
    function Since(minSignal, source) {
      classCallCheck$2(this, Since);

      this.minSignal = minSignal;
      this.source = source;
    }

    Since.prototype.run = function run(sink, scheduler$$1) {
      var min = new LowerBound(this.minSignal, sink, scheduler$$1);
      var max = new Bound(Infinity, sink);
      var disposable$$1 = this.source.run(new TimeWindowSink(min, max, sink), scheduler$$1);

      return disposeAll([min, max, disposable$$1]);
    };

    return Since;
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

  var Delay = /*#__PURE__*/function () {
    function Delay(dt, source) {
      classCallCheck$2(this, Delay);

      this.dt = dt;
      this.source = source;
    }

    Delay.prototype.run = function run(sink, scheduler$$1) {
      var delaySink = new DelaySink(this.dt, sink, scheduler$$1);
      return disposeBoth(delaySink, this.source.run(delaySink, scheduler$$1));
    };

    return Delay;
  }();

  var DelaySink = /*#__PURE__*/function (_Pipe) {
    inherits(DelaySink, _Pipe);

    function DelaySink(dt, sink, scheduler$$1) {
      classCallCheck$2(this, DelaySink);

      var _this = possibleConstructorReturn(this, _Pipe.call(this, sink));

      _this.dt = dt;
      _this.scheduler = scheduler$$1;
      _this.tasks = [];
      return _this;
    }

    DelaySink.prototype.dispose = function dispose$$1() {
      this.tasks.forEach(cancelTask);
    };

    DelaySink.prototype.event = function event(t, x) {
      this.tasks.push(delay(this.dt, propagateEventTask$1(x, this.sink), this.scheduler));
    };

    DelaySink.prototype.end = function end(t) {
      this.tasks.push(delay(this.dt, propagateEndTask(this.sink), this.scheduler));
    };

    return DelaySink;
  }(Pipe);

  var Throttle = /*#__PURE__*/function () {
    function Throttle(period, source) {
      classCallCheck$2(this, Throttle);

      this.period = period;
      this.source = source;
    }

    Throttle.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new ThrottleSink(this.period, sink), scheduler$$1);
    };

    return Throttle;
  }();

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

  var Debounce = /*#__PURE__*/function () {
    function Debounce(dt, source) {
      classCallCheck$2(this, Debounce);

      this.dt = dt;
      this.source = source;
    }

    Debounce.prototype.run = function run(sink, scheduler$$1) {
      return new DebounceSink(this.dt, this.source, sink, scheduler$$1);
    };

    return Debounce;
  }();

  var DebounceSink = /*#__PURE__*/function () {
    function DebounceSink(dt, source, sink, scheduler$$1) {
      classCallCheck$2(this, DebounceSink);

      this.dt = dt;
      this.sink = sink;
      this.scheduler = scheduler$$1;
      this.value = void 0;
      this.timer = null;

      this.disposable = source.run(this, scheduler$$1);
    }

    DebounceSink.prototype.event = function event(t, x) {
      this._clearTimer();
      this.value = x;
      this.timer = delay(this.dt, new DebounceTask(this, x), this.scheduler);
    };

    DebounceSink.prototype._event = function _event(t, x) {
      this._clearTimer();
      this.sink.event(t, x);
    };

    DebounceSink.prototype.end = function end(t) {
      if (this._clearTimer()) {
        this.sink.event(t, this.value);
        this.value = undefined;
      }
      this.sink.end(t);
    };

    DebounceSink.prototype.error = function error(t, x) {
      this._clearTimer();
      this.sink.error(t, x);
    };

    DebounceSink.prototype.dispose = function dispose$$1() {
      this._clearTimer();
      this.disposable.dispose();
    };

    DebounceSink.prototype._clearTimer = function _clearTimer() {
      if (this.timer === null) {
        return false;
      }
      this.timer.dispose();
      this.timer = null;
      return true;
    };

    return DebounceSink;
  }();

  var DebounceTask = /*#__PURE__*/function () {
    function DebounceTask(debounce, value) {
      classCallCheck$2(this, DebounceTask);

      this.debounce = debounce;
      this.value = value;
    }

    DebounceTask.prototype.run = function run(t) {
      this.debounce._event(t, this.value);
    };

    DebounceTask.prototype.error = function error(t, e) {
      this.debounce.error(t, e);
    };

    DebounceTask.prototype.dispose = function dispose$$1() {};

    return DebounceTask;
  }();

  var Await = /*#__PURE__*/function () {
    function Await(source) {
      classCallCheck$2(this, Await);

      this.source = source;
    }

    Await.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new AwaitSink(sink, scheduler$$1), scheduler$$1);
    };

    return Await;
  }();

  var AwaitSink = /*#__PURE__*/function () {
    function AwaitSink(sink, scheduler$$1) {
      var _this = this;

      classCallCheck$2(this, AwaitSink);

      this.sink = sink;
      this.scheduler = scheduler$$1;
      this.queue = Promise.resolve();

      // Pre-create closures, to avoid creating them per event
      this._eventBound = function (x) {
        return _this.sink.event(currentTime(_this.scheduler), x);
      };
      this._endBound = function () {
        return _this.sink.end(currentTime(_this.scheduler));
      };
      this._errorBound = function (e) {
        return _this.sink.error(currentTime(_this.scheduler), e);
      };
    }

    AwaitSink.prototype.event = function event(t, promise) {
      var _this2 = this;

      this.queue = this.queue.then(function () {
        return _this2._event(promise);
      }).catch(this._errorBound);
    };

    AwaitSink.prototype.end = function end(t) {
      this.queue = this.queue.then(this._endBound).catch(this._errorBound);
    };

    AwaitSink.prototype.error = function error(t, e) {
      var _this3 = this;

      // Don't resolve error values, propagate directly
      this.queue = this.queue.then(function () {
        return _this3._errorBound(e);
      }).catch(fatalError);
    };

    AwaitSink.prototype._event = function _event(promise) {
      return promise.then(this._eventBound);
    };

    return AwaitSink;
  }();

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  var SafeSink = /*#__PURE__*/function () {
    function SafeSink(sink) {
      classCallCheck$2(this, SafeSink);

      this.sink = sink;
      this.active = true;
    }

    SafeSink.prototype.event = function event(t, x) {
      if (!this.active) {
        return;
      }
      this.sink.event(t, x);
    };

    SafeSink.prototype.end = function end(t, x) {
      if (!this.active) {
        return;
      }
      this.disable();
      this.sink.end(t, x);
    };

    SafeSink.prototype.error = function error(t, e) {
      this.disable();
      this.sink.error(t, e);
    };

    SafeSink.prototype.disable = function disable() {
      this.active = false;
      return this.sink;
    };

    return SafeSink;
  }();

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  function tryEvent(t, x, sink) {
    try {
      sink.event(t, x);
    } catch (e) {
      sink.error(t, e);
    }
  }

  function tryEnd(t, sink) {
    try {
      sink.end(t);
    } catch (e) {
      sink.error(t, e);
    }
  }

  var ErrorStream = /*#__PURE__*/function () {
    function ErrorStream(e) {
      classCallCheck$2(this, ErrorStream);

      this.value = e;
    }

    ErrorStream.prototype.run = function run(sink, scheduler$$1) {
      return asap(propagateErrorTask$1(this.value, sink), scheduler$$1);
    };

    return ErrorStream;
  }();

  var RecoverWith = /*#__PURE__*/function () {
    function RecoverWith(f, source) {
      classCallCheck$2(this, RecoverWith);

      this.f = f;
      this.source = source;
    }

    RecoverWith.prototype.run = function run(sink, scheduler$$1) {
      return new RecoverWithSink(this.f, this.source, sink, scheduler$$1);
    };

    return RecoverWith;
  }();

  var RecoverWithSink = /*#__PURE__*/function () {
    function RecoverWithSink(f, source, sink, scheduler$$1) {
      classCallCheck$2(this, RecoverWithSink);

      this.f = f;
      this.sink = new SafeSink(sink);
      this.scheduler = scheduler$$1;
      this.disposable = source.run(this, scheduler$$1);
    }

    RecoverWithSink.prototype.event = function event(t, x) {
      tryEvent(t, x, this.sink);
    };

    RecoverWithSink.prototype.end = function end(t) {
      tryEnd(t, this.sink);
    };

    RecoverWithSink.prototype.error = function error(t, e) {
      var nextSink = this.sink.disable();

      tryDispose(t, this.disposable, this.sink);

      this._startNext(t, e, nextSink);
    };

    RecoverWithSink.prototype._startNext = function _startNext(t, x, sink) {
      try {
        this.disposable = this._continue(this.f, t, x, sink);
      } catch (e) {
        sink.error(t, e);
      }
    };

    RecoverWithSink.prototype._continue = function _continue(f, t, x, sink) {
      return run$1(sink, this.scheduler, withLocalTime$1(t, f(x)));
    };

    RecoverWithSink.prototype.dispose = function dispose$$1() {
      return this.disposable.dispose();
    };

    return RecoverWithSink;
  }();

  var Multicast = /*#__PURE__*/function () {
    function Multicast(source) {
      classCallCheck$2(this, Multicast);

      this.source = new MulticastSource(source);
    }

    Multicast.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(sink, scheduler$$1);
    };

    return Multicast;
  }();

  var MulticastSource = /*#__PURE__*/function () {
    function MulticastSource(source) {
      classCallCheck$2(this, MulticastSource);

      this.source = source;
      this.sinks = [];
      this.disposable = disposeNone();
    }

    MulticastSource.prototype.run = function run(sink, scheduler$$1) {
      var n = this.add(sink);
      if (n === 1) {
        this.disposable = this.source.run(this, scheduler$$1);
      }
      return disposeOnce(new MulticastDisposable(this, sink));
    };

    MulticastSource.prototype.dispose = function dispose$$1() {
      var disposable$$1 = this.disposable;
      this.disposable = disposeNone();
      return disposable$$1.dispose();
    };

    MulticastSource.prototype.add = function add(sink) {
      this.sinks = append(sink, this.sinks);
      return this.sinks.length;
    };

    MulticastSource.prototype.remove = function remove$$1(sink) {
      var i = findIndex(sink, this.sinks);
      // istanbul ignore next
      if (i >= 0) {
        this.sinks = remove(i, this.sinks);
      }

      return this.sinks.length;
    };

    MulticastSource.prototype.event = function event(time, value) {
      var s = this.sinks;
      if (s.length === 1) {
        return s[0].event(time, value);
      }
      for (var i = 0; i < s.length; ++i) {
        tryEvent(time, value, s[i]);
      }
    };

    MulticastSource.prototype.end = function end(time) {
      var s = this.sinks;
      for (var i = 0; i < s.length; ++i) {
        tryEnd(time, s[i]);
      }
    };

    MulticastSource.prototype.error = function error(time, err) {
      var s = this.sinks;
      for (var i = 0; i < s.length; ++i) {
        s[i].error(time, err);
      }
    };

    return MulticastSource;
  }();

  var MulticastDisposable = /*#__PURE__*/function () {
    function MulticastDisposable(source, sink) {
      classCallCheck$2(this, MulticastDisposable);

      this.source = source;
      this.sink = sink;
    }

    MulticastDisposable.prototype.dispose = function dispose$$1() {
      if (this.source.remove(this.sink) === 0) {
        this.source.dispose();
      }
    };

    return MulticastDisposable;
  }();

  // -----------------------------------------------------------------------
  // Observing

  var runEffects$$1 = /*#__PURE__*/curry2(runEffects$1);

  // -------------------------------------------------------

  var scan$$1 = /*#__PURE__*/curry3(scan$1);

  // -----------------------------------------------------------------------
  // Transforming

  var map$1 = /*#__PURE__*/curry2(map$2);
  var constant$$1 = /*#__PURE__*/curry2(constant$1);

  // -----------------------------------------------------------------------
  // FlatMapping

  var chain$$1 = /*#__PURE__*/curry2(chain$1);

  // -----------------------------------------------------------------------
  // Merging

  var merge$$1 = /*#__PURE__*/curry2(merge$1);

  /** @license MIT License (c) copyright 2010-2016 original author or authors */

  // Read the current time from the provided Scheduler
  var currentTime$1 = function (scheduler) { return scheduler.currentTime(); };

  /** @license MIT License (c) copyright 2015-2016 original author or authors */
  /** @author Brian Cavalier */
  // domEvent :: (EventTarget t, Event e) => String -> t -> boolean=false -> Stream e
  var domEvent = function (event, node, capture) {
      if ( capture === void 0 ) capture = false;

      return new DomEvent(event, node, capture);
  };

  var hashchange = function (node, capture) {
    if ( capture === void 0 ) capture = false;

    return domEvent('hashchange', node, capture);
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

  /** @license MIT License (c) copyright 2010-2016 original author or authors */

  // append :: a -> [a] -> [a]
  // a with x appended
  function append$2(x, a) {
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
  function map$4(f, a) {
    var l = a.length;
    var b = new Array(l);
    for (var i = 0; i < l; ++i) {
      b[i] = f(a[i]);
    }
    return b;
  }

  // remove :: Int -> [a] -> [a]
  // remove element at index
  function remove$2(i, a) {
    // eslint-disable-line complexity
    if (i < 0) {
      throw new TypeError('i must be >= 0');
    }

    var l = a.length;
    if (l === 0 || i >= l) {
      // exit early if index beyond end of array
      return a;
    }

    if (l === 1) {
      // exit early if index in bounds and length === 1
      return [];
    }

    return unsafeRemove$2(i, a, l - 1);
  }

  // unsafeRemove :: Int -> [a] -> Int -> [a]
  // Internal helper to remove element at index
  function unsafeRemove$2(i, a, l) {
    var b = new Array(l);
    var j = void 0;
    for (j = 0; j < i; ++j) {
      b[j] = a[j];
    }
    for (j = i; j < l; ++j) {
      b[j] = a[j + 1];
    }

    return b;
  }

  // removeAll :: (a -> boolean) -> [a] -> [a]
  // remove all elements matching a predicate
  function removeAll$2(f, a) {
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
  function findIndex$2(x, a) {
    for (var i = 0, l = a.length; i < l; ++i) {
      if (x === a[i]) {
        return i;
      }
    }
    return -1;
  }

  // compose :: (b -> c) -> (a -> b) -> (a -> c)
  var compose$2 = function compose(f, g) {
    return function (x) {
      return f(g(x));
    };
  };

  // curry2 :: ((a, b) -> c) -> (a -> b -> c)
  function curry2$2(f) {
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
  function curry3$2(f) {
    function curried(a, b, c) {
      // eslint-disable-line complexity
      switch (arguments.length) {
        case 0:
          return curried;
        case 1:
          return curry2$2(function (b, c) {
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

  var classCallCheck$3 = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var ScheduledTask$2 = /*#__PURE__*/function () {
    function ScheduledTask(time, localOffset, period, task, scheduler) {
      classCallCheck$3(this, ScheduledTask);

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

  var RelativeScheduler$2 = /*#__PURE__*/function () {
    function RelativeScheduler(origin, scheduler) {
      classCallCheck$3(this, RelativeScheduler);

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

  var defer$2 = function defer(task) {
    return Promise.resolve(task).then(runTask$2);
  };

  function runTask$2(task) {
    try {
      return task.run();
    } catch (e) {
      return task.error(e);
    }
  }

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var Scheduler$2 = /*#__PURE__*/function () {
    function Scheduler(timer, timeline) {
      var _this = this;

      classCallCheck$3(this, Scheduler);

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
      var st = new ScheduledTask$2(time, localOffset, period, task, this);

      this.timeline.add(st);
      this._scheduleNextRun();
      return st;
    };

    Scheduler.prototype.relative = function relative(offset) {
      return new RelativeScheduler$2(offset, this);
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
      this.timeline.runTasks(this.currentTime(), runTask$2);
      this._scheduleNextRun();
    };

    return Scheduler;
  }();

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var Timeline$2 = /*#__PURE__*/function () {
    function Timeline() {
      classCallCheck$3(this, Timeline);

      this.tasks = [];
    }

    Timeline.prototype.nextArrival = function nextArrival() {
      return this.isEmpty() ? Infinity : this.tasks[0].time;
    };

    Timeline.prototype.isEmpty = function isEmpty() {
      return this.tasks.length === 0;
    };

    Timeline.prototype.add = function add(st) {
      insertByTime$2(st, this.tasks);
    };

    Timeline.prototype.remove = function remove(st) {
      var i = binarySearch$2(getTime$2(st), this.tasks);

      if (i >= 0 && i < this.tasks.length) {
        var at = findIndex$2(st, this.tasks[i].events);
        if (at >= 0) {
          this.tasks[i].events.splice(at, 1);
          return true;
        }
      }

      return false;
    };

    Timeline.prototype.removeAll = function removeAll$$1(f) {
      for (var i = 0; i < this.tasks.length; ++i) {
        removeAllFrom$2(f, this.tasks[i]);
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
        this.tasks = runReadyTasks$2(runTask, tasks[j].events, this.tasks);
      }
    };

    return Timeline;
  }();

  function runReadyTasks$2(runTask, events, tasks) {
    // eslint-disable-line complexity
    for (var i = 0; i < events.length; ++i) {
      var task = events[i];

      if (task.active) {
        runTask(task);

        // Reschedule periodic repeating tasks
        // Check active again, since a task may have canceled itself
        if (task.period >= 0 && task.active) {
          task.time = task.time + task.period;
          insertByTime$2(task, tasks);
        }
      }
    }

    return tasks;
  }

  function insertByTime$2(task, timeslots) {
    var l = timeslots.length;
    var time = getTime$2(task);

    if (l === 0) {
      timeslots.push(newTimeslot$2(time, [task]));
      return;
    }

    var i = binarySearch$2(time, timeslots);

    if (i >= l) {
      timeslots.push(newTimeslot$2(time, [task]));
    } else {
      insertAtTimeslot$2(task, timeslots, time, i);
    }
  }

  function insertAtTimeslot$2(task, timeslots, time, i) {
    var timeslot = timeslots[i];
    if (time === timeslot.time) {
      addEvent$2(task, timeslot.events, time);
    } else {
      timeslots.splice(i, 0, newTimeslot$2(time, [task]));
    }
  }

  function addEvent$2(task, events) {
    if (events.length === 0 || task.time >= events[events.length - 1].time) {
      events.push(task);
    } else {
      spliceEvent$2(task, events);
    }
  }

  function spliceEvent$2(task, events) {
    for (var j = 0; j < events.length; j++) {
      if (task.time < events[j].time) {
        events.splice(j, 0, task);
        break;
      }
    }
  }

  function getTime$2(scheduledTask) {
    return Math.floor(scheduledTask.time);
  }

  function removeAllFrom$2(f, timeslot) {
    timeslot.events = removeAll$2(f, timeslot.events);
  }

  function binarySearch$2(t, sortedArray) {
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

  var newTimeslot$2 = function newTimeslot(t, events) {
    return { time: t, events: events };
  };

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  /* global setTimeout, clearTimeout */

  var ClockTimer$2 = /*#__PURE__*/function () {
    function ClockTimer(clock) {
      classCallCheck$3(this, ClockTimer);

      this._clock = clock;
    }

    ClockTimer.prototype.now = function now() {
      return this._clock.now();
    };

    ClockTimer.prototype.setTimer = function setTimer(f, dt) {
      return dt <= 0 ? runAsap$2(f) : setTimeout(f, dt);
    };

    ClockTimer.prototype.clearTimer = function clearTimer(t) {
      return t instanceof Asap$2 ? t.cancel() : clearTimeout(t);
    };

    return ClockTimer;
  }();

  var Asap$2 = /*#__PURE__*/function () {
    function Asap(f) {
      classCallCheck$3(this, Asap);

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

  function runAsap$2(f) {
    var task = new Asap$2(f);
    defer$2(task);
    return task;
  }

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  /* global performance, process */

  var RelativeClock$2 = /*#__PURE__*/function () {
    function RelativeClock(clock, origin) {
      classCallCheck$3(this, RelativeClock);

      this.origin = origin;
      this.clock = clock;
    }

    RelativeClock.prototype.now = function now() {
      return this.clock.now() - this.origin;
    };

    return RelativeClock;
  }();

  var HRTimeClock$2 = /*#__PURE__*/function () {
    function HRTimeClock(hrtime, origin) {
      classCallCheck$3(this, HRTimeClock);

      this.origin = origin;
      this.hrtime = hrtime;
    }

    HRTimeClock.prototype.now = function now() {
      var hrt = this.hrtime(this.origin);
      return (hrt[0] * 1e9 + hrt[1]) / 1e6;
    };

    return HRTimeClock;
  }();

  // Read the current time from the provided Scheduler
  var currentTime$2 = function currentTime(scheduler) {
    return scheduler.currentTime();
  };

  // Schedule a task to run as soon as possible, but
  // not in the current call stack
  var asap$2 = /*#__PURE__*/curry2$2(function (task, scheduler) {
    return scheduler.scheduleTask(0, 0, -1, task);
  });

  // Schedule a task to run after a millisecond delay
  var delay$4 = /*#__PURE__*/curry3$2(function (delay, task, scheduler) {
    return scheduler.scheduleTask(0, delay, -1, task);
  });

  // Schedule a task to run periodically, with the
  // first run starting asap
  var periodic$3 = /*#__PURE__*/curry3$2(function (period, task, scheduler) {
    return scheduler.scheduleTask(0, 0, period, task);
  });

  // Cancel all ScheduledTasks for which a predicate
  // is true
  var cancelAllTasks$2 = /*#__PURE__*/curry2$2(function (predicate, scheduler) {
    return scheduler.cancelAll(predicate);
  });

  var schedulerRelativeTo$2 = /*#__PURE__*/curry2$2(function (offset, scheduler) {
    return new RelativeScheduler$2(offset, scheduler);
  });

  /** @license MIT License (c) copyright 2010-2016 original author or authors */

  // append :: a -> [a] -> [a]
  // a with x appended
  function append$3(x, a) {
    var l = a.length;
    var b = new Array(l + 1);
    for (var i = 0; i < l; ++i) {
      b[i] = a[i];
    }

    b[l] = x;
    return b;
  }

  // reduce :: (a -> b -> a) -> a -> [b] -> a
  // accumulate via left-fold
  function reduce$3(f, z, a) {
    var r = z;
    for (var i = 0, l = a.length; i < l; ++i) {
      r = f(r, a[i], i);
    }
    return r;
  }

  // curry2 :: ((a, b) -> c) -> (a -> b -> c)
  function curry2$3(f) {
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
  function curry3$3(f) {
    function curried(a, b, c) {
      // eslint-disable-line complexity
      switch (arguments.length) {
        case 0:
          return curried;
        case 1:
          return curry2$3(function (b, c) {
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

  var classCallCheck$4 = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var disposeNone$1 = function disposeNone() {
    return NONE$1;
  };
  var NONE$1 = /*#__PURE__*/new (function () {
    function DisposeNone() {
      classCallCheck$4(this, DisposeNone);
    }

    DisposeNone.prototype.dispose = function dispose() {};

    return DisposeNone;
  }())();

  var isDisposeNone$1 = function isDisposeNone(d) {
    return d === NONE$1;
  };

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  // Wrap an existing disposable (which may not already have been once()d)
  // so that it will only dispose its underlying resource at most once.
  var disposeOnce$1 = function disposeOnce(disposable) {
    return new DisposeOnce$1(disposable);
  };

  var DisposeOnce$1 = /*#__PURE__*/function () {
    function DisposeOnce(disposable) {
      classCallCheck$4(this, DisposeOnce);

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

  /** @license MIT License (c) copyright 2010-2017 original author or authors */
  // Create a Disposable that will use the provided
  // dispose function to dispose the resource
  var disposeWith$1 = /*#__PURE__*/curry2$3(function (dispose, resource) {
    return disposeOnce$1(new DisposeWith$1(dispose, resource));
  });

  // Disposable represents a resource that must be
  // disposed/released. It aggregates a function to dispose
  // the resource and a handle to a key/id/handle/reference
  // that identifies the resource

  var DisposeWith$1 = /*#__PURE__*/function () {
    function DisposeWith(dispose, resource) {
      classCallCheck$4(this, DisposeWith);

      this._dispose = dispose;
      this._resource = resource;
    }

    DisposeWith.prototype.dispose = function dispose() {
      this._dispose(this._resource);
    };

    return DisposeWith;
  }();

  /** @license MIT License (c) copyright 2010 original author or authors */
  // Aggregate a list of disposables into a DisposeAll
  var disposeAll$1 = function disposeAll(ds) {
    var merged = reduce$3(merge$2, [], ds);
    return merged.length === 0 ? disposeNone$1() : new DisposeAll$1(merged);
  };

  // Convenience to aggregate 2 disposables
  var disposeBoth$1 = /*#__PURE__*/curry2$3(function (d1, d2) {
    return disposeAll$1([d1, d2]);
  });

  var merge$2 = function merge(ds, d) {
    return isDisposeNone$1(d) ? ds : d instanceof DisposeAll$1 ? ds.concat(d.disposables) : append$3(d, ds);
  };

  var DisposeAll$1 = /*#__PURE__*/function () {
    function DisposeAll(disposables) {
      classCallCheck$4(this, DisposeAll);

      this.disposables = disposables;
    }

    DisposeAll.prototype.dispose = function dispose() {
      throwIfErrors$1(disposeCollectErrors$1(this.disposables));
    };

    return DisposeAll;
  }();

  // Dispose all, safely collecting errors into an array


  var disposeCollectErrors$1 = function disposeCollectErrors(disposables) {
    return reduce$3(appendIfError$1, [], disposables);
  };

  // Call dispose and if throws, append thrown error to errors
  var appendIfError$1 = function appendIfError(errors, d) {
    try {
      d.dispose();
    } catch (e) {
      errors.push(e);
    }
    return errors;
  };

  // Throw DisposeAllError if errors is non-empty
  var throwIfErrors$1 = function throwIfErrors(errors) {
    if (errors.length > 0) {
      throw new DisposeAllError$1(errors.length + ' errors', errors);
    }
  };

  var DisposeAllError$1 = /*#__PURE__*/function (Error) {
    function DisposeAllError(message, errors) {
      Error.call(this, message);
      this.message = message;
      this.name = DisposeAllError.name;
      this.errors = errors;

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, DisposeAllError);
      }

      this.stack = '' + this.stack + formatErrorStacks$1(this.errors);
    }

    DisposeAllError.prototype = /*#__PURE__*/Object.create(Error.prototype);

    return DisposeAllError;
  }(Error);

  var formatErrorStacks$1 = function formatErrorStacks(errors) {
    return reduce$3(formatErrorStack$1, '', errors);
  };

  var formatErrorStack$1 = function formatErrorStack(s, e, i) {
    return s + ('\n[' + (i + 1) + '] ' + e.stack);
  };

  /** @license MIT License (c) copyright 2010-2017 original author or authors */
  // Try to dispose the disposable.  If it throws, send
  // the error to sink.error with the provided Time value
  var tryDispose$2 = /*#__PURE__*/curry3$3(function (t, disposable, sink) {
    try {
      disposable.dispose();
    } catch (e) {
      sink.error(t, e);
    }
  });

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  function fatalError$1(e) {
    setTimeout(rethrow$1, 0, e);
  }

  function rethrow$1(e) {
    throw e;
  }





  var classCallCheck$5 = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };











  var inherits$1 = function (subClass, superClass) {
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











  var possibleConstructorReturn$1 = function (self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  };

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  var propagateTask$1$1 = function propagateTask(run, value, sink) {
    return new PropagateTask$1(run, value, sink);
  };

  var propagateEventTask$1$1 = function propagateEventTask(value, sink) {
    return propagateTask$1$1(runEvent$1, value, sink);
  };

  var propagateEndTask$1 = function propagateEndTask(sink) {
    return propagateTask$1$1(runEnd$1, undefined, sink);
  };

  var propagateErrorTask$1$1 = function propagateErrorTask(value, sink) {
    return propagateTask$1$1(runError$1, value, sink);
  };

  var PropagateTask$1 = /*#__PURE__*/function () {
    function PropagateTask(run, value, sink) {
      classCallCheck$5(this, PropagateTask);

      this._run = run;
      this.value = value;
      this.sink = sink;
      this.active = true;
    }

    PropagateTask.prototype.dispose = function dispose() {
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
        return fatalError$1(e);
      }
      this.sink.error(t, e);
    };

    return PropagateTask;
  }();

  var runEvent$1 = function runEvent(t, x, sink) {
    return sink.event(t, x);
  };

  var runEnd$1 = function runEnd(t, _, sink) {
    return sink.end(t);
  };

  var runError$1 = function runError(t, e, sink) {
    return sink.error(t, e);
  };

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var empty$1 = function empty() {
    return EMPTY$1;
  };

  var isCanonicalEmpty$1 = function isCanonicalEmpty(stream) {
    return stream === EMPTY$1;
  };

  var Empty$1 = /*#__PURE__*/function () {
    function Empty() {
      classCallCheck$5(this, Empty);
    }

    Empty.prototype.run = function run(sink, scheduler$$1) {
      return asap$2(propagateEndTask$1(sink), scheduler$$1);
    };

    return Empty;
  }();

  var EMPTY$1 = /*#__PURE__*/new Empty$1();

  var Never$1 = /*#__PURE__*/function () {
    function Never() {
      classCallCheck$5(this, Never);
    }

    Never.prototype.run = function run() {
      return disposeNone$1();
    };

    return Never;
  }();

  var NEVER$1 = /*#__PURE__*/new Never$1();

  var At$1 = /*#__PURE__*/function () {
    function At(t, x) {
      classCallCheck$5(this, At);

      this.time = t;
      this.value = x;
    }

    At.prototype.run = function run(sink, scheduler$$1) {
      return delay$4(this.time, propagateTask$1$1(runAt$1, this.value, sink), scheduler$$1);
    };

    return At;
  }();

  function runAt$1(t, x, sink) {
    sink.event(t, x);
    sink.end(t);
  }

  var Periodic$1 = /*#__PURE__*/function () {
    function Periodic(period) {
      classCallCheck$5(this, Periodic);

      this.period = period;
    }

    Periodic.prototype.run = function run(sink, scheduler$$1) {
      return periodic$3(this.period, propagateEventTask$1$1(undefined, sink), scheduler$$1);
    };

    return Periodic;
  }();

  /** @license MIT License (c) copyright 2010-2017 original author or authors */
  /** @author Brian Cavalier */

  var Pipe$1 = /*#__PURE__*/function () {
    function Pipe(sink) {
      classCallCheck$5(this, Pipe);

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

  var Filter$1 = /*#__PURE__*/function () {
    function Filter(p, source) {
      classCallCheck$5(this, Filter);

      this.p = p;
      this.source = source;
    }

    Filter.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new FilterSink$1(this.p, sink), scheduler$$1);
    };

    /**
     * Create a filtered source, fusing adjacent filter.filter if possible
     * @param {function(x:*):boolean} p filtering predicate
     * @param {{run:function}} source source to filter
     * @returns {Filter} filtered source
     */


    Filter.create = function create(p, source) {
      if (isCanonicalEmpty$1(source)) {
        return source;
      }

      if (source instanceof Filter) {
        return new Filter(and$1(source.p, p), source.source);
      }

      return new Filter(p, source);
    };

    return Filter;
  }();

  var FilterSink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(FilterSink, _Pipe);

    function FilterSink(p, sink) {
      classCallCheck$5(this, FilterSink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

      _this.p = p;
      return _this;
    }

    FilterSink.prototype.event = function event(t, x) {
      var p = this.p;
      p(x) && this.sink.event(t, x);
    };

    return FilterSink;
  }(Pipe$1);

  var and$1 = function and(p, q) {
    return function (x) {
      return p(x) && q(x);
    };
  };

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  var FilterMap$1 = /*#__PURE__*/function () {
    function FilterMap(p, f, source) {
      classCallCheck$5(this, FilterMap);

      this.p = p;
      this.f = f;
      this.source = source;
    }

    FilterMap.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new FilterMapSink$1(this.p, this.f, sink), scheduler$$1);
    };

    return FilterMap;
  }();

  var FilterMapSink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(FilterMapSink, _Pipe);

    function FilterMapSink(p, f, sink) {
      classCallCheck$5(this, FilterMapSink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

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
  }(Pipe$1);

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  var Map$1 = /*#__PURE__*/function () {
    function Map(f, source) {
      classCallCheck$5(this, Map);

      this.f = f;
      this.source = source;
    }

    Map.prototype.run = function run(sink, scheduler$$1) {
      // eslint-disable-line no-extend-native
      return this.source.run(new MapSink$1(this.f, sink), scheduler$$1);
    };

    /**
     * Create a mapped source, fusing adjacent map.map, filter.map,
     * and filter.map.map if possible
     * @param {function(*):*} f mapping function
     * @param {{run:function}} source source to map
     * @returns {Map|FilterMap} mapped source, possibly fused
     */


    Map.create = function create(f, source) {
      if (isCanonicalEmpty$1(source)) {
        return empty$1();
      }

      if (source instanceof Map) {
        return new Map(compose$2(f, source.f), source.source);
      }

      if (source instanceof Filter$1) {
        return new FilterMap$1(source.p, f, source.source);
      }

      return new Map(f, source);
    };

    return Map;
  }();

  var MapSink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(MapSink, _Pipe);

    function MapSink(f, sink) {
      classCallCheck$5(this, MapSink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

      _this.f = f;
      return _this;
    }

    MapSink.prototype.event = function event(t, x) {
      var f = this.f;
      this.sink.event(t, f(x));
    };

    return MapSink;
  }(Pipe$1);

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var SettableDisposable$1 = /*#__PURE__*/function () {
    function SettableDisposable() {
      classCallCheck$5(this, SettableDisposable);

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

    SettableDisposable.prototype.dispose = function dispose() {
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

  var Slice$1 = /*#__PURE__*/function () {
    function Slice(bounds, source) {
      classCallCheck$5(this, Slice);

      this.source = source;
      this.bounds = bounds;
    }

    Slice.prototype.run = function run(sink, scheduler$$1) {
      var disposable$$1 = new SettableDisposable$1();
      var sliceSink = new SliceSink$1(this.bounds.min, this.bounds.max - this.bounds.min, sink, disposable$$1);

      disposable$$1.setDisposable(this.source.run(sliceSink, scheduler$$1));

      return disposable$$1;
    };

    return Slice;
  }();

  var SliceSink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(SliceSink, _Pipe);

    function SliceSink(skip, take, sink, disposable$$1) {
      classCallCheck$5(this, SliceSink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

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
  }(Pipe$1);

  var TakeWhile$1 = /*#__PURE__*/function () {
    function TakeWhile(p, source) {
      classCallCheck$5(this, TakeWhile);

      this.p = p;
      this.source = source;
    }

    TakeWhile.prototype.run = function run(sink, scheduler$$1) {
      var disposable$$1 = new SettableDisposable$1();
      var takeWhileSink = new TakeWhileSink$1(this.p, sink, disposable$$1);

      disposable$$1.setDisposable(this.source.run(takeWhileSink, scheduler$$1));

      return disposable$$1;
    };

    return TakeWhile;
  }();

  var TakeWhileSink$1 = /*#__PURE__*/function (_Pipe2) {
    inherits$1(TakeWhileSink, _Pipe2);

    function TakeWhileSink(p, sink, disposable$$1) {
      classCallCheck$5(this, TakeWhileSink);

      var _this2 = possibleConstructorReturn$1(this, _Pipe2.call(this, sink));

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
  }(Pipe$1);

  var SkipWhile$1 = /*#__PURE__*/function () {
    function SkipWhile(p, source) {
      classCallCheck$5(this, SkipWhile);

      this.p = p;
      this.source = source;
    }

    SkipWhile.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new SkipWhileSink$1(this.p, sink), scheduler$$1);
    };

    return SkipWhile;
  }();

  var SkipWhileSink$1 = /*#__PURE__*/function (_Pipe3) {
    inherits$1(SkipWhileSink, _Pipe3);

    function SkipWhileSink(p, sink) {
      classCallCheck$5(this, SkipWhileSink);

      var _this3 = possibleConstructorReturn$1(this, _Pipe3.call(this, sink));

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
  }(Pipe$1);

  var SkipAfter$1 = /*#__PURE__*/function () {
    function SkipAfter(p, source) {
      classCallCheck$5(this, SkipAfter);

      this.p = p;
      this.source = source;
    }

    SkipAfter.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new SkipAfterSink$1(this.p, sink), scheduler$$1);
    };

    return SkipAfter;
  }();

  var SkipAfterSink$1 = /*#__PURE__*/function (_Pipe4) {
    inherits$1(SkipAfterSink, _Pipe4);

    function SkipAfterSink(p, sink) {
      classCallCheck$5(this, SkipAfterSink);

      var _this4 = possibleConstructorReturn$1(this, _Pipe4.call(this, sink));

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
  }(Pipe$1);

  var ZipItems$1 = /*#__PURE__*/function () {
    function ZipItems(f, items, source) {
      classCallCheck$5(this, ZipItems);

      this.f = f;
      this.items = items;
      this.source = source;
    }

    ZipItems.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new ZipItemsSink$1(this.f, this.items, sink), scheduler$$1);
    };

    return ZipItems;
  }();

  var ZipItemsSink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(ZipItemsSink, _Pipe);

    function ZipItemsSink(f, items, sink) {
      classCallCheck$5(this, ZipItemsSink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

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
  }(Pipe$1);

  var RunEffectsSink$1 = /*#__PURE__*/function () {
    function RunEffectsSink(end, error, disposable$$1) {
      classCallCheck$5(this, RunEffectsSink);

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
      tryDispose$1$1(error, end, x, this._disposable);
    };

    return RunEffectsSink;
  }();

  function tryDispose$1$1(error, end, x, disposable$$1) {
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
  var run$1$1 = function run(sink, scheduler$$1, stream) {
      return stream.run(sink, scheduler$$1);
  };

  var RelativeSink$1 = /*#__PURE__*/function () {
    function RelativeSink(offset, sink) {
      classCallCheck$5(this, RelativeSink);

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
  var withLocalTime$1$1 = function withLocalTime(origin, stream) {
    return new WithLocalTime$1(origin, stream);
  };

  var WithLocalTime$1 = /*#__PURE__*/function () {
    function WithLocalTime(origin, source) {
      classCallCheck$5(this, WithLocalTime);

      this.origin = origin;
      this.source = source;
    }

    WithLocalTime.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(relativeSink$1(this.origin, sink), schedulerRelativeTo$2(this.origin, scheduler$$1));
    };

    return WithLocalTime;
  }();

  // Accumulate offsets instead of nesting RelativeSinks, which can happen
  // with higher-order stream and combinators like continueWith when they're
  // applied recursively.


  var relativeSink$1 = function relativeSink(origin, sink) {
    return sink instanceof RelativeSink$1 ? new RelativeSink$1(origin + sink.offset, sink.sink) : new RelativeSink$1(origin, sink);
  };

  var Loop$1 = /*#__PURE__*/function () {
    function Loop(stepper, seed, source) {
      classCallCheck$5(this, Loop);

      this.step = stepper;
      this.seed = seed;
      this.source = source;
    }

    Loop.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new LoopSink$1(this.step, this.seed, sink), scheduler$$1);
    };

    return Loop;
  }();

  var LoopSink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(LoopSink, _Pipe);

    function LoopSink(stepper, seed, sink) {
      classCallCheck$5(this, LoopSink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

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
  }(Pipe$1);

  var Scan$1 = /*#__PURE__*/function () {
    function Scan(f, z, source) {
      classCallCheck$5(this, Scan);

      this.source = source;
      this.f = f;
      this.value = z;
    }

    Scan.prototype.run = function run(sink, scheduler$$1) {
      var d1 = asap$2(propagateEventTask$1$1(this.value, sink), scheduler$$1);
      var d2 = this.source.run(new ScanSink$1(this.f, this.value, sink), scheduler$$1);
      return disposeBoth$1(d1, d2);
    };

    return Scan;
  }();

  var ScanSink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(ScanSink, _Pipe);

    function ScanSink(f, z, sink) {
      classCallCheck$5(this, ScanSink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

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
  }(Pipe$1);

  var ContinueWith$1 = /*#__PURE__*/function () {
    function ContinueWith(f, source) {
      classCallCheck$5(this, ContinueWith);

      this.f = f;
      this.source = source;
    }

    ContinueWith.prototype.run = function run(sink, scheduler$$1) {
      return new ContinueWithSink$1(this.f, this.source, sink, scheduler$$1);
    };

    return ContinueWith;
  }();

  var ContinueWithSink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(ContinueWithSink, _Pipe);

    function ContinueWithSink(f, source, sink, scheduler$$1) {
      classCallCheck$5(this, ContinueWithSink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

      _this.f = f;
      _this.scheduler = scheduler$$1;
      _this.active = true;
      _this.disposable = disposeOnce$1(source.run(_this, scheduler$$1));
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

      tryDispose$2(t, this.disposable, this.sink);

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
      return run$1$1(sink, this.scheduler, withLocalTime$1$1(t, f()));
    };

    ContinueWithSink.prototype.dispose = function dispose() {
      this.active = false;
      return this.disposable.dispose();
    };

    return ContinueWithSink;
  }(Pipe$1);

  var Tap$1 = /*#__PURE__*/function () {
    function Tap(f, source) {
      classCallCheck$5(this, Tap);

      this.source = source;
      this.f = f;
    }

    Tap.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new TapSink$1(this.f, sink), scheduler$$1);
    };

    return Tap;
  }();

  var TapSink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(TapSink, _Pipe);

    function TapSink(f, sink) {
      classCallCheck$5(this, TapSink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

      _this.f = f;
      return _this;
    }

    TapSink.prototype.event = function event(t, x) {
      var f = this.f;
      f(x);
      this.sink.event(t, x);
    };

    return TapSink;
  }(Pipe$1);

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  var IndexSink$1 = /*#__PURE__*/function (_Sink) {
    inherits$1(IndexSink, _Sink);

    function IndexSink(i, sink) {
      classCallCheck$5(this, IndexSink);

      var _this = possibleConstructorReturn$1(this, _Sink.call(this, sink));

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
  }(Pipe$1);

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  function invoke$1(f, args) {
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

  var Combine$1 = /*#__PURE__*/function () {
    function Combine(f, sources) {
      classCallCheck$5(this, Combine);

      this.f = f;
      this.sources = sources;
    }

    Combine.prototype.run = function run(sink, scheduler$$1) {
      var l = this.sources.length;
      var disposables = new Array(l);
      var sinks = new Array(l);

      var mergeSink = new CombineSink$1(disposables, sinks, sink, this.f);

      for (var indexSink, i = 0; i < l; ++i) {
        indexSink = sinks[i] = new IndexSink$1(i, mergeSink);
        disposables[i] = this.sources[i].run(indexSink, scheduler$$1);
      }

      return disposeAll$1(disposables);
    };

    return Combine;
  }();

  var CombineSink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(CombineSink, _Pipe);

    function CombineSink(disposables, sinks, sink, f) {
      classCallCheck$5(this, CombineSink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

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
        this.sink.event(t, invoke$1(this.f, this.values));
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
      tryDispose$2(t, this.disposables[index], this.sink);
      if (--this.activeCount === 0) {
        this.sink.end(t);
      }
    };

    return CombineSink;
  }(Pipe$1);

  /** @license MIT License (c) copyright 2010 original author or authors */

  /**
   * Doubly linked list
   * @constructor
   */
  var LinkedList$1 = /*#__PURE__*/function () {
    function LinkedList() {
      classCallCheck$5(this, LinkedList);

      this.head = null;
      this.length = 0;
    }

    /**
     * Add a node to the end of the list
     * @param {{prev:Object|null, next:Object|null, dispose:function}} x node to add
     */


    LinkedList.prototype.add = function add(x) {
      if (this.head !== null) {
        this.head.prev = x;
        x.next = this.head;
      }
      this.head = x;
      ++this.length;
    };

    /**
     * Remove the provided node from the list
     * @param {{prev:Object|null, next:Object|null, dispose:function}} x node to remove
     */


    LinkedList.prototype.remove = function remove$$1(x) {
      // eslint-disable-line  complexity
      --this.length;
      if (x === this.head) {
        this.head = this.head.next;
      }
      if (x.next !== null) {
        x.next.prev = x.prev;
        x.next = null;
      }
      if (x.prev !== null) {
        x.prev.next = x.next;
        x.prev = null;
      }
    };

    /**
     * @returns {boolean} true iff there are no nodes in the list
     */


    LinkedList.prototype.isEmpty = function isEmpty() {
      return this.length === 0;
    };

    /**
     * Dispose all nodes
     * @returns {void}
     */


    LinkedList.prototype.dispose = function dispose() {
      if (this.isEmpty()) {
        return;
      }

      var head = this.head;
      this.head = null;
      this.length = 0;

      while (head !== null) {
        head.dispose();
        head = head.next;
      }
    };

    return LinkedList;
  }();

  var MergeConcurrently$1 = /*#__PURE__*/function () {
    function MergeConcurrently(f, concurrency, source) {
      classCallCheck$5(this, MergeConcurrently);

      this.f = f;
      this.concurrency = concurrency;
      this.source = source;
    }

    MergeConcurrently.prototype.run = function run(sink, scheduler$$1) {
      return new Outer$1(this.f, this.concurrency, this.source, sink, scheduler$$1);
    };

    return MergeConcurrently;
  }();

  var Outer$1 = /*#__PURE__*/function () {
    function Outer(f, concurrency, source, sink, scheduler$$1) {
      classCallCheck$5(this, Outer);

      this.f = f;
      this.concurrency = concurrency;
      this.sink = sink;
      this.scheduler = scheduler$$1;
      this.pending = [];
      this.current = new LinkedList$1();
      this.disposable = disposeOnce$1(source.run(this, scheduler$$1));
      this.active = true;
    }

    Outer.prototype.event = function event(t, x) {
      this._addInner(t, x);
    };

    Outer.prototype._addInner = function _addInner(t, x) {
      if (this.current.length < this.concurrency) {
        this._startInner(t, x);
      } else {
        this.pending.push(x);
      }
    };

    Outer.prototype._startInner = function _startInner(t, x) {
      try {
        this._initInner(t, x);
      } catch (e) {
        this.error(t, e);
      }
    };

    Outer.prototype._initInner = function _initInner(t, x) {
      var innerSink = new Inner$1(t, this, this.sink);
      innerSink.disposable = mapAndRun$1(this.f, t, x, innerSink, this.scheduler);
      this.current.add(innerSink);
    };

    Outer.prototype.end = function end(t) {
      this.active = false;
      tryDispose$2(t, this.disposable, this.sink);
      this._checkEnd(t);
    };

    Outer.prototype.error = function error(t, e) {
      this.active = false;
      this.sink.error(t, e);
    };

    Outer.prototype.dispose = function dispose() {
      this.active = false;
      this.pending.length = 0;
      this.disposable.dispose();
      this.current.dispose();
    };

    Outer.prototype._endInner = function _endInner(t, inner) {
      this.current.remove(inner);
      tryDispose$2(t, inner, this);

      if (this.pending.length === 0) {
        this._checkEnd(t);
      } else {
        this._startInner(t, this.pending.shift());
      }
    };

    Outer.prototype._checkEnd = function _checkEnd(t) {
      if (!this.active && this.current.isEmpty()) {
        this.sink.end(t);
      }
    };

    return Outer;
  }();

  var mapAndRun$1 = function mapAndRun(f, t, x, sink, scheduler$$1) {
    return f(x).run(sink, schedulerRelativeTo$2(t, scheduler$$1));
  };

  var Inner$1 = /*#__PURE__*/function () {
    function Inner(time, outer, sink) {
      classCallCheck$5(this, Inner);

      this.prev = this.next = null;
      this.time = time;
      this.outer = outer;
      this.sink = sink;
      this.disposable = void 0;
    }

    Inner.prototype.event = function event(t, x) {
      this.sink.event(t + this.time, x);
    };

    Inner.prototype.end = function end(t) {
      this.outer._endInner(t + this.time, this);
    };

    Inner.prototype.error = function error(t, e) {
      this.outer.error(t + this.time, e);
    };

    Inner.prototype.dispose = function dispose() {
      return this.disposable.dispose();
    };

    return Inner;
  }();

  var Merge$1 = /*#__PURE__*/function () {
    function Merge(sources) {
      classCallCheck$5(this, Merge);

      this.sources = sources;
    }

    Merge.prototype.run = function run(sink, scheduler$$1) {
      var l = this.sources.length;
      var disposables = new Array(l);
      var sinks = new Array(l);

      var mergeSink = new MergeSink$1(disposables, sinks, sink);

      for (var indexSink, i = 0; i < l; ++i) {
        indexSink = sinks[i] = new IndexSink$1(i, mergeSink);
        disposables[i] = this.sources[i].run(indexSink, scheduler$$1);
      }

      return disposeAll$1(disposables);
    };

    return Merge;
  }();

  var MergeSink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(MergeSink, _Pipe);

    function MergeSink(disposables, sinks, sink) {
      classCallCheck$5(this, MergeSink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

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
      tryDispose$2(t, this.disposables[index], this.sink);
      if (--this.activeCount === 0) {
        this.sink.end(t);
      }
    };

    return MergeSink;
  }(Pipe$1);

  var Snapshot$1 = /*#__PURE__*/function () {
    function Snapshot(f, values, sampler) {
      classCallCheck$5(this, Snapshot);

      this.f = f;
      this.values = values;
      this.sampler = sampler;
    }

    Snapshot.prototype.run = function run(sink, scheduler$$1) {
      var sampleSink = new SnapshotSink$1(this.f, sink);
      var valuesDisposable = this.values.run(sampleSink.latest, scheduler$$1);
      var samplerDisposable = this.sampler.run(sampleSink, scheduler$$1);

      return disposeBoth$1(samplerDisposable, valuesDisposable);
    };

    return Snapshot;
  }();

  var SnapshotSink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(SnapshotSink, _Pipe);

    function SnapshotSink(f, sink) {
      classCallCheck$5(this, SnapshotSink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

      _this.f = f;
      _this.latest = new LatestValueSink$1(_this);
      return _this;
    }

    SnapshotSink.prototype.event = function event(t, x) {
      if (this.latest.hasValue) {
        var f = this.f;
        this.sink.event(t, f(this.latest.value, x));
      }
    };

    return SnapshotSink;
  }(Pipe$1);

  var LatestValueSink$1 = /*#__PURE__*/function (_Pipe2) {
    inherits$1(LatestValueSink, _Pipe2);

    function LatestValueSink(sink) {
      classCallCheck$5(this, LatestValueSink);

      var _this2 = possibleConstructorReturn$1(this, _Pipe2.call(this, sink));

      _this2.hasValue = false;
      return _this2;
    }

    LatestValueSink.prototype.event = function event(t, x) {
      this.value = x;
      this.hasValue = true;
    };

    LatestValueSink.prototype.end = function end() {};

    return LatestValueSink;
  }(Pipe$1);

  // Copied and modified from https://github.com/invertase/denque
  // MIT License

  // These constants were extracted directly from denque's shift()
  // It's not clear exactly why the authors chose these particular
  // values, but given denque's stated goals, it seems likely that
  // they were chosen for speed/memory reasons.

  // Max value of _head at which Queue is willing to shink
  // its internal array
  var HEAD_MAX_SHRINK$1 = 2;

  // Min value of _tail at which Queue is willing to shink
  // its internal array
  var TAIL_MIN_SHRINK$1 = 10000;

  var Queue$1 = /*#__PURE__*/function () {
    function Queue() {
      classCallCheck$5(this, Queue);

      this._head = 0;
      this._tail = 0;
      this._capacityMask = 0x3;
      this._list = new Array(4);
    }

    Queue.prototype.push = function push(x) {
      var tail = this._tail;
      this._list[tail] = x;
      this._tail = tail + 1 & this._capacityMask;
      if (this._tail === this._head) {
        this._growArray();
      }

      if (this._head < this._tail) {
        return this._tail - this._head;
      } else {
        return this._capacityMask + 1 - (this._head - this._tail);
      }
    };

    Queue.prototype.shift = function shift() {
      var head = this._head;
      if (head === this._tail) {
        return undefined;
      }

      var x = this._list[head];
      this._list[head] = undefined;
      this._head = head + 1 & this._capacityMask;
      if (head < HEAD_MAX_SHRINK$1 && this._tail > TAIL_MIN_SHRINK$1 && this._tail <= this._list.length >>> 2) {
        this._shrinkArray();
      }

      return x;
    };

    Queue.prototype.isEmpty = function isEmpty() {
      return this._head === this._tail;
    };

    Queue.prototype.length = function length() {
      if (this._head === this._tail) {
        return 0;
      } else if (this._head < this._tail) {
        return this._tail - this._head;
      } else {
        return this._capacityMask + 1 - (this._head - this._tail);
      }
    };

    Queue.prototype._growArray = function _growArray() {
      if (this._head) {
        // copy existing data, head to end, then beginning to tail.
        this._list = this._copyArray();
        this._head = 0;
      }

      // head is at 0 and array is now full, safe to extend
      this._tail = this._list.length;

      this._list.length *= 2;
      this._capacityMask = this._capacityMask << 1 | 1;
    };

    Queue.prototype._shrinkArray = function _shrinkArray() {
      this._list.length >>>= 1;
      this._capacityMask >>>= 1;
    };

    Queue.prototype._copyArray = function _copyArray() {
      var newArray = [];
      var list = this._list;
      var len = list.length;

      var i = void 0;
      for (i = this._head; i < len; i++) {
        newArray.push(list[i]);
      }
      for (i = 0; i < this._tail; i++) {
        newArray.push(list[i]);
      }

      return newArray;
    };

    return Queue;
  }();

  var Zip$1 = /*#__PURE__*/function () {
    function Zip(f, sources) {
      classCallCheck$5(this, Zip);

      this.f = f;
      this.sources = sources;
    }

    Zip.prototype.run = function run(sink, scheduler$$1) {
      var l = this.sources.length;
      var disposables = new Array(l);
      var sinks = new Array(l);
      var buffers = new Array(l);

      var zipSink = new ZipSink$1(this.f, buffers, sinks, sink);

      for (var indexSink, i = 0; i < l; ++i) {
        buffers[i] = new Queue$1();
        indexSink = sinks[i] = new IndexSink$1(i, zipSink);
        disposables[i] = this.sources[i].run(indexSink, scheduler$$1);
      }

      return disposeAll$1(disposables);
    };

    return Zip;
  }();

  var ZipSink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(ZipSink, _Pipe);

    function ZipSink(f, buffers, sinks, sink) {
      classCallCheck$5(this, ZipSink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

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
        if (!ready$1(this.buffers)) {
          return;
        }

        emitZipped$1(this.f, t, buffers, this.sink);

        if (ended$1(this.buffers, this.sinks)) {
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
  }(Pipe$1);

  var emitZipped$1 = function emitZipped(f, t, buffers, sink) {
    return sink.event(t, invoke$1(f, map$4(head$1, buffers)));
  };

  var head$1 = function head(buffer) {
    return buffer.shift();
  };

  function ended$1(buffers, sinks) {
    for (var i = 0, l = buffers.length; i < l; ++i) {
      if (buffers[i].isEmpty() && !sinks[i].active) {
        return true;
      }
    }
    return false;
  }

  function ready$1(buffers) {
    for (var i = 0, l = buffers.length; i < l; ++i) {
      if (buffers[i].isEmpty()) {
        return false;
      }
    }
    return true;
  }

  var Switch$1 = /*#__PURE__*/function () {
    function Switch(source) {
      classCallCheck$5(this, Switch);

      this.source = source;
    }

    Switch.prototype.run = function run(sink, scheduler$$1) {
      var switchSink = new SwitchSink$1(sink, scheduler$$1);
      return disposeBoth$1(switchSink, this.source.run(switchSink, scheduler$$1));
    };

    return Switch;
  }();

  var SwitchSink$1 = /*#__PURE__*/function () {
    function SwitchSink(sink, scheduler$$1) {
      classCallCheck$5(this, SwitchSink);

      this.sink = sink;
      this.scheduler = scheduler$$1;
      this.current = null;
      this.ended = false;
    }

    SwitchSink.prototype.event = function event(t, stream) {
      this._disposeCurrent(t);
      this.current = new Segment$1(stream, t, Infinity, this, this.sink, this.scheduler);
    };

    SwitchSink.prototype.end = function end(t) {
      this.ended = true;
      this._checkEnd(t);
    };

    SwitchSink.prototype.error = function error(t, e) {
      this.ended = true;
      this.sink.error(t, e);
    };

    SwitchSink.prototype.dispose = function dispose() {
      return this._disposeCurrent(currentTime$2(this.scheduler));
    };

    SwitchSink.prototype._disposeCurrent = function _disposeCurrent(t) {
      if (this.current !== null) {
        return this.current._dispose(t);
      }
    };

    SwitchSink.prototype._disposeInner = function _disposeInner(t, inner) {
      inner._dispose(t);
      if (inner === this.current) {
        this.current = null;
      }
    };

    SwitchSink.prototype._checkEnd = function _checkEnd(t) {
      if (this.ended && this.current === null) {
        this.sink.end(t);
      }
    };

    SwitchSink.prototype._endInner = function _endInner(t, inner) {
      this._disposeInner(t, inner);
      this._checkEnd(t);
    };

    SwitchSink.prototype._errorInner = function _errorInner(t, e, inner) {
      this._disposeInner(t, inner);
      this.sink.error(t, e);
    };

    return SwitchSink;
  }();

  var Segment$1 = /*#__PURE__*/function () {
    function Segment(source, min, max, outer, sink, scheduler$$1) {
      classCallCheck$5(this, Segment);

      this.min = min;
      this.max = max;
      this.outer = outer;
      this.sink = sink;
      this.disposable = source.run(this, schedulerRelativeTo$2(min, scheduler$$1));
    }

    Segment.prototype.event = function event(t, x) {
      var time = Math.max(0, t + this.min);
      if (time < this.max) {
        this.sink.event(time, x);
      }
    };

    Segment.prototype.end = function end(t) {
      this.outer._endInner(t + this.min, this);
    };

    Segment.prototype.error = function error(t, e) {
      this.outer._errorInner(t + this.min, e, this);
    };

    Segment.prototype._dispose = function _dispose(t) {
      tryDispose$2(t + this.min, this.disposable, this.sink);
    };

    return Segment;
  }();

  var SkipRepeats$1 = /*#__PURE__*/function () {
    function SkipRepeats(equals, source) {
      classCallCheck$5(this, SkipRepeats);

      this.equals = equals;
      this.source = source;
    }

    SkipRepeats.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new SkipRepeatsSink$1(this.equals, sink), scheduler$$1);
    };

    return SkipRepeats;
  }();

  var SkipRepeatsSink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(SkipRepeatsSink, _Pipe);

    function SkipRepeatsSink(equals, sink) {
      classCallCheck$5(this, SkipRepeatsSink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

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
  }(Pipe$1);

  var Until$1 = /*#__PURE__*/function () {
    function Until(maxSignal, source) {
      classCallCheck$5(this, Until);

      this.maxSignal = maxSignal;
      this.source = source;
    }

    Until.prototype.run = function run(sink, scheduler$$1) {
      var min = new Bound$1(-Infinity, sink);
      var max = new UpperBound$1(this.maxSignal, sink, scheduler$$1);
      var disposable$$1 = this.source.run(new TimeWindowSink$1(min, max, sink), scheduler$$1);

      return disposeAll$1([min, max, disposable$$1]);
    };

    return Until;
  }();

  var Since$1 = /*#__PURE__*/function () {
    function Since(minSignal, source) {
      classCallCheck$5(this, Since);

      this.minSignal = minSignal;
      this.source = source;
    }

    Since.prototype.run = function run(sink, scheduler$$1) {
      var min = new LowerBound$1(this.minSignal, sink, scheduler$$1);
      var max = new Bound$1(Infinity, sink);
      var disposable$$1 = this.source.run(new TimeWindowSink$1(min, max, sink), scheduler$$1);

      return disposeAll$1([min, max, disposable$$1]);
    };

    return Since;
  }();

  var Bound$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(Bound, _Pipe);

    function Bound(value, sink) {
      classCallCheck$5(this, Bound);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

      _this.value = value;
      return _this;
    }

    Bound.prototype.event = function event() {};

    Bound.prototype.end = function end() {};

    Bound.prototype.dispose = function dispose() {};

    return Bound;
  }(Pipe$1);

  var TimeWindowSink$1 = /*#__PURE__*/function (_Pipe2) {
    inherits$1(TimeWindowSink, _Pipe2);

    function TimeWindowSink(min, max, sink) {
      classCallCheck$5(this, TimeWindowSink);

      var _this2 = possibleConstructorReturn$1(this, _Pipe2.call(this, sink));

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
  }(Pipe$1);

  var LowerBound$1 = /*#__PURE__*/function (_Pipe3) {
    inherits$1(LowerBound, _Pipe3);

    function LowerBound(signal, sink, scheduler$$1) {
      classCallCheck$5(this, LowerBound);

      var _this3 = possibleConstructorReturn$1(this, _Pipe3.call(this, sink));

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

    LowerBound.prototype.dispose = function dispose() {
      return this.disposable.dispose();
    };

    return LowerBound;
  }(Pipe$1);

  var UpperBound$1 = /*#__PURE__*/function (_Pipe4) {
    inherits$1(UpperBound, _Pipe4);

    function UpperBound(signal, sink, scheduler$$1) {
      classCallCheck$5(this, UpperBound);

      var _this4 = possibleConstructorReturn$1(this, _Pipe4.call(this, sink));

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

    UpperBound.prototype.dispose = function dispose() {
      return this.disposable.dispose();
    };

    return UpperBound;
  }(Pipe$1);

  var Delay$1 = /*#__PURE__*/function () {
    function Delay(dt, source) {
      classCallCheck$5(this, Delay);

      this.dt = dt;
      this.source = source;
    }

    Delay.prototype.run = function run(sink, scheduler$$1) {
      var delaySink = new DelaySink$1(this.dt, sink, scheduler$$1);
      return disposeBoth$1(delaySink, this.source.run(delaySink, scheduler$$1));
    };

    return Delay;
  }();

  var DelaySink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(DelaySink, _Pipe);

    function DelaySink(dt, sink, scheduler$$1) {
      classCallCheck$5(this, DelaySink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

      _this.dt = dt;
      _this.scheduler = scheduler$$1;
      return _this;
    }

    DelaySink.prototype.dispose = function dispose() {
      var _this2 = this;

      cancelAllTasks$2(function (_ref) {
        var task = _ref.task;
        return task.sink === _this2.sink;
      }, this.scheduler);
    };

    DelaySink.prototype.event = function event(t, x) {
      delay$4(this.dt, propagateEventTask$1$1(x, this.sink), this.scheduler);
    };

    DelaySink.prototype.end = function end(t) {
      delay$4(this.dt, propagateEndTask$1(this.sink), this.scheduler);
    };

    return DelaySink;
  }(Pipe$1);

  var Throttle$1 = /*#__PURE__*/function () {
    function Throttle(period, source) {
      classCallCheck$5(this, Throttle);

      this.period = period;
      this.source = source;
    }

    Throttle.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new ThrottleSink$1(this.period, sink), scheduler$$1);
    };

    return Throttle;
  }();

  var ThrottleSink$1 = /*#__PURE__*/function (_Pipe) {
    inherits$1(ThrottleSink, _Pipe);

    function ThrottleSink(period, sink) {
      classCallCheck$5(this, ThrottleSink);

      var _this = possibleConstructorReturn$1(this, _Pipe.call(this, sink));

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
  }(Pipe$1);

  var Debounce$1 = /*#__PURE__*/function () {
    function Debounce(dt, source) {
      classCallCheck$5(this, Debounce);

      this.dt = dt;
      this.source = source;
    }

    Debounce.prototype.run = function run(sink, scheduler$$1) {
      return new DebounceSink$1(this.dt, this.source, sink, scheduler$$1);
    };

    return Debounce;
  }();

  var DebounceSink$1 = /*#__PURE__*/function () {
    function DebounceSink(dt, source, sink, scheduler$$1) {
      classCallCheck$5(this, DebounceSink);

      this.dt = dt;
      this.sink = sink;
      this.scheduler = scheduler$$1;
      this.value = void 0;
      this.timer = null;

      this.disposable = source.run(this, scheduler$$1);
    }

    DebounceSink.prototype.event = function event(t, x) {
      this._clearTimer();
      this.value = x;
      this.timer = delay$4(this.dt, new DebounceTask$1(this, x), this.scheduler);
    };

    DebounceSink.prototype._event = function _event(t, x) {
      this._clearTimer();
      this.sink.event(t, x);
    };

    DebounceSink.prototype.end = function end(t) {
      if (this._clearTimer()) {
        this.sink.event(t, this.value);
        this.value = undefined;
      }
      this.sink.end(t);
    };

    DebounceSink.prototype.error = function error(t, x) {
      this._clearTimer();
      this.sink.error(t, x);
    };

    DebounceSink.prototype.dispose = function dispose() {
      this._clearTimer();
      this.disposable.dispose();
    };

    DebounceSink.prototype._clearTimer = function _clearTimer() {
      if (this.timer === null) {
        return false;
      }
      this.timer.dispose();
      this.timer = null;
      return true;
    };

    return DebounceSink;
  }();

  var DebounceTask$1 = /*#__PURE__*/function () {
    function DebounceTask(debounce, value) {
      classCallCheck$5(this, DebounceTask);

      this.debounce = debounce;
      this.value = value;
    }

    DebounceTask.prototype.run = function run(t) {
      this.debounce._event(t, this.value);
    };

    DebounceTask.prototype.error = function error(t, e) {
      this.debounce.error(t, e);
    };

    DebounceTask.prototype.dispose = function dispose() {};

    return DebounceTask;
  }();

  var Await$1 = /*#__PURE__*/function () {
    function Await(source) {
      classCallCheck$5(this, Await);

      this.source = source;
    }

    Await.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(new AwaitSink$1(sink, scheduler$$1), scheduler$$1);
    };

    return Await;
  }();

  var AwaitSink$1 = /*#__PURE__*/function () {
    function AwaitSink(sink, scheduler$$1) {
      var _this = this;

      classCallCheck$5(this, AwaitSink);

      this.sink = sink;
      this.scheduler = scheduler$$1;
      this.queue = Promise.resolve();

      // Pre-create closures, to avoid creating them per event
      this._eventBound = function (x) {
        return _this.sink.event(currentTime$2(_this.scheduler), x);
      };
      this._endBound = function () {
        return _this.sink.end(currentTime$2(_this.scheduler));
      };
      this._errorBound = function (e) {
        return _this.sink.error(currentTime$2(_this.scheduler), e);
      };
    }

    AwaitSink.prototype.event = function event(t, promise) {
      var _this2 = this;

      this.queue = this.queue.then(function () {
        return _this2._event(promise);
      }).catch(this._errorBound);
    };

    AwaitSink.prototype.end = function end(t) {
      this.queue = this.queue.then(this._endBound).catch(this._errorBound);
    };

    AwaitSink.prototype.error = function error(t, e) {
      var _this3 = this;

      // Don't resolve error values, propagate directly
      this.queue = this.queue.then(function () {
        return _this3._errorBound(e);
      }).catch(fatalError$1);
    };

    AwaitSink.prototype._event = function _event(promise) {
      return promise.then(this._eventBound);
    };

    return AwaitSink;
  }();

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  var SafeSink$1 = /*#__PURE__*/function () {
    function SafeSink(sink) {
      classCallCheck$5(this, SafeSink);

      this.sink = sink;
      this.active = true;
    }

    SafeSink.prototype.event = function event(t, x) {
      if (!this.active) {
        return;
      }
      this.sink.event(t, x);
    };

    SafeSink.prototype.end = function end(t, x) {
      if (!this.active) {
        return;
      }
      this.disable();
      this.sink.end(t, x);
    };

    SafeSink.prototype.error = function error(t, e) {
      this.disable();
      this.sink.error(t, e);
    };

    SafeSink.prototype.disable = function disable() {
      this.active = false;
      return this.sink;
    };

    return SafeSink;
  }();

  /** @license MIT License (c) copyright 2010-2016 original author or authors */
  /** @author Brian Cavalier */
  /** @author John Hann */

  function tryEvent$2(t, x, sink) {
    try {
      sink.event(t, x);
    } catch (e) {
      sink.error(t, e);
    }
  }

  function tryEnd$1(t, sink) {
    try {
      sink.end(t);
    } catch (e) {
      sink.error(t, e);
    }
  }

  var ErrorStream$1 = /*#__PURE__*/function () {
    function ErrorStream(e) {
      classCallCheck$5(this, ErrorStream);

      this.value = e;
    }

    ErrorStream.prototype.run = function run(sink, scheduler$$1) {
      return asap$2(propagateErrorTask$1$1(this.value, sink), scheduler$$1);
    };

    return ErrorStream;
  }();

  var RecoverWith$1 = /*#__PURE__*/function () {
    function RecoverWith(f, source) {
      classCallCheck$5(this, RecoverWith);

      this.f = f;
      this.source = source;
    }

    RecoverWith.prototype.run = function run(sink, scheduler$$1) {
      return new RecoverWithSink$1(this.f, this.source, sink, scheduler$$1);
    };

    return RecoverWith;
  }();

  var RecoverWithSink$1 = /*#__PURE__*/function () {
    function RecoverWithSink(f, source, sink, scheduler$$1) {
      classCallCheck$5(this, RecoverWithSink);

      this.f = f;
      this.sink = new SafeSink$1(sink);
      this.scheduler = scheduler$$1;
      this.disposable = source.run(this, scheduler$$1);
    }

    RecoverWithSink.prototype.event = function event(t, x) {
      tryEvent$2(t, x, this.sink);
    };

    RecoverWithSink.prototype.end = function end(t) {
      tryEnd$1(t, this.sink);
    };

    RecoverWithSink.prototype.error = function error(t, e) {
      var nextSink = this.sink.disable();

      tryDispose$2(t, this.disposable, this.sink);

      this._startNext(t, e, nextSink);
    };

    RecoverWithSink.prototype._startNext = function _startNext(t, x, sink) {
      try {
        this.disposable = this._continue(this.f, t, x, sink);
      } catch (e) {
        sink.error(t, e);
      }
    };

    RecoverWithSink.prototype._continue = function _continue(f, t, x, sink) {
      return run$1$1(sink, this.scheduler, withLocalTime$1$1(t, f(x)));
    };

    RecoverWithSink.prototype.dispose = function dispose() {
      return this.disposable.dispose();
    };

    return RecoverWithSink;
  }();

  var Multicast$1 = /*#__PURE__*/function () {
    function Multicast(source) {
      classCallCheck$5(this, Multicast);

      this.source = new MulticastSource$1(source);
    }

    Multicast.prototype.run = function run(sink, scheduler$$1) {
      return this.source.run(sink, scheduler$$1);
    };

    return Multicast;
  }();

  var MulticastSource$1 = /*#__PURE__*/function () {
    function MulticastSource(source) {
      classCallCheck$5(this, MulticastSource);

      this.source = source;
      this.sinks = [];
      this.disposable = disposeNone$1();
    }

    MulticastSource.prototype.run = function run(sink, scheduler$$1) {
      var n = this.add(sink);
      if (n === 1) {
        this.disposable = this.source.run(this, scheduler$$1);
      }
      return disposeOnce$1(new MulticastDisposable$1(this, sink));
    };

    MulticastSource.prototype.dispose = function dispose() {
      var disposable$$1 = this.disposable;
      this.disposable = disposeNone$1();
      return disposable$$1.dispose();
    };

    MulticastSource.prototype.add = function add(sink) {
      this.sinks = append$2(sink, this.sinks);
      return this.sinks.length;
    };

    MulticastSource.prototype.remove = function remove$$1(sink) {
      var i = findIndex$2(sink, this.sinks);
      // istanbul ignore next
      if (i >= 0) {
        this.sinks = remove$2(i, this.sinks);
      }

      return this.sinks.length;
    };

    MulticastSource.prototype.event = function event(time, value) {
      var s = this.sinks;
      if (s.length === 1) {
        return s[0].event(time, value);
      }
      for (var i = 0; i < s.length; ++i) {
        tryEvent$2(time, value, s[i]);
      }
    };

    MulticastSource.prototype.end = function end(time) {
      var s = this.sinks;
      for (var i = 0; i < s.length; ++i) {
        tryEnd$1(time, s[i]);
      }
    };

    MulticastSource.prototype.error = function error(time, err) {
      var s = this.sinks;
      for (var i = 0; i < s.length; ++i) {
        s[i].error(time, err);
      }
    };

    return MulticastSource;
  }();

  var MulticastDisposable$1 = /*#__PURE__*/function () {
    function MulticastDisposable(source, sink) {
      classCallCheck$5(this, MulticastDisposable);

      this.source = source;
      this.sink = sink;
    }

    MulticastDisposable.prototype.dispose = function dispose() {
      if (this.source.remove(this.sink) === 0) {
        this.source.dispose();
      }
    };

    return MulticastDisposable;
  }();

  var classCallCheck$6 = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var nextAnimationFrame = function nextAnimationFrame(afp) {
    return new AnimationFrame(afp);
  };

  var AnimationFrame = function () {
    function AnimationFrame(afp) {
      classCallCheck$6(this, AnimationFrame);

      this.afp = afp;
    }

    createClass(AnimationFrame, [{
      key: 'run',
      value: function run(sink, scheduler$$1) {
        var _this = this;

        var propagate = function propagate(timestamp) {
          return eventThenEnd(currentTime$2(scheduler$$1), timestamp, sink);
        };
        var request = this.afp.requestAnimationFrame(propagate);
        return disposeWith$1(function (request) {
          return _this.afp.cancelAnimationFrame(request);
        }, request);
      }
    }]);
    return AnimationFrame;
  }();

  var eventThenEnd = function eventThenEnd(t, x, sink) {
    sink.event(t, x);
    sink.end(t);
  };

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at http://www.apache.org/licenses/LICENSE-2.0

  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
  WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
  MERCHANTABLITY OR NON-INFRINGEMENT.

  See the Apache Version 2.0 License for specific language governing permissions
  and limitations under the License.
  ***************************************************************************** */

  var __assign = function() {
      __assign = Object.assign || function __assign(t) {
          for (var s, i = 1, n = arguments.length; i < n; i++) {
              s = arguments[i];
              for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
          }
          return t;
      };
      return __assign.apply(this, arguments);
  };

  function __makeTemplateObject(cooked, raw) {
      if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
      return cooked;
  }

  var newTodo = function (description, id) {
      return ({ description: description, completed: false, id: id });
  };
  var emptyApp = { todos: [], filter: '/', nextId: 0 };
  var completedCount = function (_a) {
      var todos = _a.todos;
      return todos.reduce(countIfCompleted, 0);
  };
  var countIfCompleted = function (count, _a) {
      var completed = _a.completed;
      return count + (completed ? 1 : 0);
  };
  var addTodo = function (description) { return function (app) {
      return (__assign({}, app, { nextId: app.nextId + 1, todos: app.todos.concat([newTodo(description, app.nextId)]) }));
  }; };
  var removeTodo = function (id) { return function (app) {
      return (__assign({}, app, { todos: app.todos.filter(function (todo) { return todo.id !== id; }) }));
  }; };
  var updateCompleted = function (completed, id) { return function (app) {
      return (__assign({}, app, { todos: app.todos.map(function (todo) { return todo.id === id ? __assign({}, todo, { completed: completed }) : todo; }) }));
  }; };
  var updateAllCompleted = function (completed) { return function (app) {
      return (__assign({}, app, { todos: app.todos.map(function (todo) { return (__assign({}, todo, { completed: completed })); }) }));
  }; };
  var removeAllCompleted = function (app) {
      return (__assign({}, app, { todos: app.todos.filter(function (todo) { return !todo.completed; }) }));
  };
  var setFilter = function (filter) { return function (app) {
      return (__assign({}, app, { filter: filter }));
  }; };

  const G = document.defaultView;

  // Node.CONSTANTS
  // 'cause some engine has no global Node defined
  // (i.e. Node, NativeScript, basicHTML ... )
  const ELEMENT_NODE = 1;
  const TEXT_NODE = 3;
  const COMMENT_NODE = 8;
  const DOCUMENT_FRAGMENT_NODE = 11;

  // HTML related constants
  const VOID_ELEMENTS = /^area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr$/i;

  // SVG related constants
  const OWNER_SVG_ELEMENT = 'ownerSVGElement';
  const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

  // Custom Elements / MutationObserver constants
  const CONNECTED = 'connected';
  const DISCONNECTED = 'dis' + CONNECTED;

  // hyperHTML related constants
  const EXPANDO = '_hyper: ';
  const SHOULD_USE_TEXT_CONTENT = /^style|textarea$/i;
  const UID = EXPANDO + ((Math.random() * new Date) | 0) + ';';
  const UIDC = '<!--' + UID + '-->';

  // you know that kind of basics you need to cover
  // your use case only but you don't want to bloat the library?
  // There's even a package in here:
  // https://www.npmjs.com/package/poorlyfills

  // used to dispatch simple events
  let Event = G.Event;
  try {
    new Event('Event');
  } catch(o_O) {
    Event = function (type) {
      const e = document.createEvent('Event');
      e.initEvent(type, false, false);
      return e;
    };
  }

  // used to store template literals
  /* istanbul ignore next */
  const Map$2 = G.Map || function Map() {
    const keys = [], values = [];
    return {
      get(obj) {
        return values[keys.indexOf(obj)];
      },
      set(obj, value) {
        values[keys.push(obj) - 1] = value;
      }
    };
  };

  // used to store wired content
  let ID = 0;
  const WeakMap = G.WeakMap || function WeakMap() {
    const key = UID + ID++;
    return {
      get(obj) { return obj[key]; },
      set(obj, value) {
        Object.defineProperty(obj, key, {
          configurable: true,
          value
        });
      }
    };
  };

  // used to store hyper.Components
  const WeakSet = G.WeakSet || function WeakSet() {
    const wm = new WeakMap;
    return {
      add(obj) { wm.set(obj, true); },
      has(obj) { return wm.get(obj) === true; }
    };
  };

  // used to be sure IE9 or older Androids work as expected
  const isArray = Array.isArray || (toString =>
    arr => toString.call(arr) === '[object Array]'
  )({}.toString);

  const trim = UID.trim || function () {
    return this.replace(/^\s+|\s+$/g, '');
  };

  // hyperHTML.Component is a very basic class
  // able to create Custom Elements like components
  // including the ability to listen to connect/disconnect
  // events via onconnect/ondisconnect attributes
  // Components can be created imperatively or declaratively.
  // The main difference is that declared components
  // will not automatically render on setState(...)
  // to simplify state handling on render.
  function Component() {
    return this; // this is needed in Edge !!!
  }

  // Component is lazily setup because it needs
  // wire mechanism as lazy content
  function setup(content) {
    // there are various weakly referenced variables in here
    // and mostly are to use Component.for(...) static method.
    const children = new WeakMap;
    const create = Object.create;
    const createEntry = (wm, id, component) => {
      wm.set(id, component);
      return component;
    };
    const get = (Class, info, context, id) => {
      const relation = info.get(Class) || relate(Class, info);
      switch (typeof id) {
        case 'object':
        case 'function':
          const wm = relation.w || (relation.w = new WeakMap);
          return wm.get(id) || createEntry(wm, id, new Class(context));
        default:
          const sm = relation.p || (relation.p = create(null));
          return sm[id] || (sm[id] = new Class(context));
      }
    };
    const relate = (Class, info) => {
      const relation = {w: null, p: null};
      info.set(Class, relation);
      return relation;
    };
    const set = context => {
      const info = new Map$2;
      children.set(context, info);
      return info;
    };
    // The Component Class
    Object.defineProperties(
      Component,
      {
        // Component.for(context[, id]) is a convenient way
        // to automatically relate data/context to children components
        // If not created yet, the new Component(context) is weakly stored
        // and after that same instance would always be returned.
        for: {
          configurable: true,
          value(context, id) {
            return get(
              this,
              children.get(context) || set(context),
              context,
              id == null ?
                'default' : id
            );
          }
        }
      }
    );
    Object.defineProperties(
      Component.prototype,
      {
        // all events are handled with the component as context
        handleEvent: {value(e) {
          const ct = e.currentTarget;
          this[
            ('getAttribute' in ct && ct.getAttribute('data-call')) ||
            ('on' + e.type)
          ](e);
        }},
        // components will lazily define html or svg properties
        // as soon as these are invoked within the .render() method
        // Such render() method is not provided by the base class
        // but it must be available through the Component extend.
        // Declared components could implement a
        // render(props) method too and use props as needed.
        html: lazyGetter('html', content),
        svg: lazyGetter('svg', content),
        // the state is a very basic/simple mechanism inspired by Preact
        state: lazyGetter('state', function () { return this.defaultState; }),
        // it is possible to define a default state that'd be always an object otherwise
        defaultState: {get() { return {}; }},
        // dispatch a bubbling, cancelable, custom event
        // through the first known/available node
        dispatch: {value(type, detail) {
          const {_wire$} = this;
          if (_wire$) {
            const event = new CustomEvent(type, {
              bubbles: true,
              cancelable: true,
              detail
            });
            event.component = this;
            return (_wire$.dispatchEvent ?
                      _wire$ :
                      _wire$.childNodes[0]
                    ).dispatchEvent(event);
          }
          return false;
        }},
        // setting some property state through a new object
        // or a callback, triggers also automatically a render
        // unless explicitly specified to not do so (render === false)
        setState: {value(state, render) {
          const target = this.state;
          const source = typeof state === 'function' ? state.call(this, target) : state;
          for (const key in source) target[key] = source[key];
          if (render !== false)
            this.render();
          return this;
        }}
      }
    );
  }

  // instead of a secret key I could've used a WeakMap
  // However, attaching a property directly will result
  // into better performance with thousands of components
  // hanging around, and less memory pressure caused by the WeakMap
  const lazyGetter = (type, fn) => {
    const secret = '_' + type + '$';
    return {
      get() {
        return this[secret] || setValue(this, secret, fn.call(this, type));
      },
      set(value) {
        setValue(this, secret, value);
      }
    };
  };

  // shortcut to set value on get or set(value)
  const setValue = (self, secret, value) =>
    Object.defineProperty(self, secret, {
      configurable: true,
      value: typeof value === 'function' ?
        function () {
          return (self._wire$ = value.apply(this, arguments));
        } :
        value
    })[secret]
  ;

  const attributes = {};
  const intents = {};
  const keys = [];
  const hasOwnProperty = intents.hasOwnProperty;

  let length = 0;

  var Intent = {

    // used to invoke right away hyper:attributes
    attributes,

    // hyperHTML.define('intent', (object, update) => {...})
    // can be used to define a third parts update mechanism
    // when every other known mechanism failed.
    // hyper.define('user', info => info.name);
    // hyper(node)`<p>${{user}}</p>`;
    define: (intent, callback) => {
      if (intent.indexOf('-') < 0) {
        if (!(intent in intents)) {
          length = keys.push(intent);
        }
        intents[intent] = callback;
      } else {
        attributes[intent] = callback;
      }
    },

    // this method is used internally as last resort
    // to retrieve a value out of an object
    invoke: (object, callback) => {
      for (let i = 0; i < length; i++) {
        let key = keys[i];
        if (hasOwnProperty.call(object, key)) {
          return intents[key](object[key], callback);
        }
      }
    }
  };

  // these are tiny helpers to simplify most common operations needed here
  const create = (node, type) => doc(node).createElement(type);
  const doc = node => node.ownerDocument || node;
  const fragment = node => doc(node).createDocumentFragment();
  const text = (node, text) => doc(node).createTextNode(text);

  // TODO:  I'd love to code-cover RegExp too here
  //        these are fundamental for this library

  const spaces = ' \\f\\n\\r\\t';
  const almostEverything = '[^ ' + spaces + '\\/>"\'=]+';
  const attrName = '[ ' + spaces + ']+' + almostEverything;
  const tagName = '<([A-Za-z]+[A-Za-z0-9:_-]*)((?:';
  const attrPartials = '(?:=(?:\'[^\']*?\'|"[^"]*?"|<[^>]*?>|' + almostEverything + '))?)';

  const attrSeeker = new RegExp(
    tagName + attrName + attrPartials + '+)([ ' + spaces + ']*/?>)',
    'g'
  );

  const selfClosing = new RegExp(
    tagName + attrName + attrPartials + '*)([ ' + spaces + ']*/>)',
    'g'
  );

  const testFragment = fragment(document);

  // DOM4 node.append(...many)
  const hasAppend = 'append' in testFragment;

  // detect old browsers without HTMLTemplateElement content support
  const hasContent = 'content' in create(document, 'template');

  // IE 11 has problems with cloning templates: it "forgets" empty childNodes
  testFragment.appendChild(text(testFragment, 'g'));
  testFragment.appendChild(text(testFragment, ''));
  const hasDoomedCloneNode = testFragment.cloneNode(true).childNodes.length === 1;

  // old browsers need to fallback to cloneNode
  // Custom Elements V0 and V1 will work polyfilled
  // but native implementations need importNode instead
  // (specially Chromium and its old V0 implementation)
  const hasImportNode = 'importNode' in document;

  // appends an array of nodes
  // to a generic node/fragment
  // When available, uses append passing all arguments at once
  // hoping that's somehow faster, even if append has more checks on type
  const append$4 = hasAppend ?
    (node, childNodes) => {
      node.append.apply(node, childNodes);
    } :
    (node, childNodes) => {
      const length = childNodes.length;
      for (let i = 0; i < length; i++) {
        node.appendChild(childNodes[i]);
      }
    };

  const findAttributes = new RegExp('(' + attrName + '=)([\'"]?)' + UIDC + '\\2', 'gi');
  const comments = ($0, $1, $2, $3) =>
    '<' + $1 + $2.replace(findAttributes, replaceAttributes) + $3;
  const replaceAttributes = ($0, $1, $2) => $1 + ($2 || '"') + UID + ($2 || '"');

  // given a node and a generic HTML content,
  // create either an SVG or an HTML fragment
  // where such content will be injected
  const createFragment = (node, html) =>
    (OWNER_SVG_ELEMENT in node ?
      SVGFragment :
      HTMLFragment
    )(node, html.replace(attrSeeker, comments));

  // IE/Edge shenanigans proof cloneNode
  // it goes through all nodes manually
  // instead of relying the engine to suddenly
  // merge nodes together
  const cloneNode = hasDoomedCloneNode ?
    node => {
      const clone = node.cloneNode();
      const childNodes = node.childNodes ||
                        // this is an excess of caution
                        // but some node, in IE, might not
                        // have childNodes property.
                        // The following fallback ensure working code
                        // in older IE without compromising performance
                        // or any other browser/engine involved.
                        /* istanbul ignore next */
                        [];
      const length = childNodes.length;
      for (let i = 0; i < length; i++) {
        clone.appendChild(cloneNode(childNodes[i]));
      }
      return clone;
    } :
    // the following ignore is due code-coverage
    // combination of not having document.importNode
    // but having a working node.cloneNode.
    // This shenario is common on older Android/WebKit browsers
    // but basicHTML here tests just two major cases:
    // with document.importNode or with broken cloneNode.
    /* istanbul ignore next */
    node => node.cloneNode(true);

  // IE and Edge do not support children in SVG nodes
  /* istanbul ignore next */
  const getChildren = node => {
    const children = [];
    const childNodes = node.childNodes;
    const length = childNodes.length;
    for (let i = 0; i < length; i++) {
      if (childNodes[i].nodeType === ELEMENT_NODE)
        children.push(childNodes[i]);
    }
    return children;
  };

  // used to import html into fragments
  const importNode = hasImportNode ?
    (doc$$1, node) => doc$$1.importNode(node, true) :
    (doc$$1, node) => cloneNode(node);

  // just recycling a one-off array to use slice
  // in every needed place
  const slice = [].slice;

  // lazy evaluated, returns the unique identity
  // of a template literal, as tempalte literal itself.
  // By default, ES2015 template literals are unique
  // tag`a${1}z` === tag`a${2}z`
  // even if interpolated values are different
  // the template chunks are in a frozen Array
  // that is identical each time you use the same
  // literal to represent same static content
  // around its own interpolations.
  const unique = template => TL(template);

  // TL returns a unique version of the template
  // it needs lazy feature detection
  // (cannot trust literals with transpiled code)
  let TL = t => {
    if (
      // TypeScript template literals are not standard
      t.propertyIsEnumerable('raw') ||
      (
          // Firefox < 55 has not standard implementation neither
          /Firefox\/(\d+)/.test((G.navigator || {}).userAgent) &&
            parseFloat(RegExp.$1) < 55
          )
    ) {
      const T = {};
      TL = t => {
        const k = '^' + t.join('^');
        return T[k] || (T[k] = t);
      };
    } else {
      // make TL an identity like function
      TL = t => t;
    }
    return TL(t);
  };

  // used to store templates objects
  // since neither Map nor WeakMap are safe
  const TemplateMap = () => {
    try {
      const wm = new WeakMap;
      const o_O = Object.freeze([]);
      wm.set(o_O, true);
      if (!wm.get(o_O))
        throw o_O;
      return wm;
    } catch(o_O) {
      // inevitable legacy code leaks due
      // https://github.com/tc39/ecma262/pull/890
      return new Map$2;
    }
  };

  // create document fragments via native template
  // with a fallback for browsers that won't be able
  // to deal with some injected element such <td> or others
  const HTMLFragment = hasContent ?
    (node, html) => {
      const container = create(node, 'template');
      container.innerHTML = html;
      return container.content;
    } :
    (node, html) => {
      const container = create(node, 'template');
      const content = fragment(node);
      if (/^[^\S]*?<(col(?:group)?|t(?:head|body|foot|r|d|h))/i.test(html)) {
        const selector = RegExp.$1;
        container.innerHTML = '<table>' + html + '</table>';
        append$4(content, slice.call(container.querySelectorAll(selector)));
      } else {
        container.innerHTML = html;
        append$4(content, slice.call(container.childNodes));
      }
      return content;
    };

  // creates SVG fragment with a fallback for IE that needs SVG
  // within the HTML content
  const SVGFragment = hasContent ?
    (node, html) => {
      const content = fragment(node);
      const container = doc(node).createElementNS(SVG_NAMESPACE, 'svg');
      container.innerHTML = html;
      append$4(content, slice.call(container.childNodes));
      return content;
    } :
    (node, html) => {
      const content = fragment(node);
      const container = create(node, 'div');
      container.innerHTML = '<svg xmlns="' + SVG_NAMESPACE + '">' + html + '</svg>';
      append$4(content, slice.call(container.firstChild.childNodes));
      return content;
    };

  function Wire(childNodes) {
    this.childNodes = childNodes;
    this.length = childNodes.length;
    this.first = childNodes[0];
    this.last = childNodes[this.length - 1];
  }

  // when a wire is inserted, all its nodes will follow
  Wire.prototype.insert = function insert() {
    const df = fragment(this.first);
    append$4(df, this.childNodes);
    return df;
  };

  // when a wire is removed, all its nodes must be removed as well
  Wire.prototype.remove = function remove() {
    const first = this.first;
    const last = this.last;
    if (this.length === 2) {
      last.parentNode.removeChild(last);
    } else {
      const range = doc(first).createRange();
      range.setStartBefore(this.childNodes[1]);
      range.setEndAfter(last);
      range.deleteContents();
    }
    return first;
  };

  // every template literal interpolation indicates
  // a precise target in the DOM the template is representing.
  // `<p id=${'attribute'}>some ${'content'}</p>`
  // hyperHTML finds only once per template literal,
  // hence once per entire application life-cycle,
  // all nodes that are related to interpolations.
  // These nodes are stored as indexes used to retrieve,
  // once per upgrade, nodes that will change on each future update.
  // A path example is [2, 0, 1] representing the operation:
  // node.childNodes[2].childNodes[0].childNodes[1]
  // Attributes are addressed via their owner node and their name.
  const createPath = node => {
    const path = [];
    let parentNode;
    switch (node.nodeType) {
      case ELEMENT_NODE:
      case DOCUMENT_FRAGMENT_NODE:
        parentNode = node;
        break;
      case COMMENT_NODE:
        parentNode = node.parentNode;
        prepend(path, parentNode, node);
        break;
      default:
        parentNode = node.ownerElement;
        break;
    }
    for (
      node = parentNode;
      (parentNode = parentNode.parentNode);
      node = parentNode
    ) {
      prepend(path, parentNode, node);
    }
    return path;
  };

  const prepend = (path, parent, node) => {
    path.unshift(path.indexOf.call(parent.childNodes, node));
  };

  var Path = {
    create: (type, node, name) => ({type, name, node, path: createPath(node)}),
    find: (node, path) => {
      const length = path.length;
      for (let i = 0; i < length; i++) {
        node = node.childNodes[path[i]];
      }
      return node;
    }
  };

  // from https://github.com/developit/preact/blob/33fc697ac11762a1cb6e71e9847670d047af7ce5/src/constants.js
  const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;

  // style is handled as both string and object
  // even if the target is an SVG element (consistency)
  var Style = (node, original, isSVG) => {
    if (isSVG) {
      const style = original.cloneNode(true);
      style.value = '';
      node.setAttributeNode(style);
      return update(style, isSVG);
    }
    return update(node.style, isSVG);
  };

  // the update takes care or changing/replacing
  // only properties that are different or
  // in case of string, the whole node
  const update = (style, isSVG) => {
    let oldType, oldValue;
    return newValue => {
      switch (typeof newValue) {
        case 'object':
          if (newValue) {
            if (oldType === 'object') {
              if (!isSVG) {
                if (oldValue !== newValue) {
                  for (const key in oldValue) {
                    if (!(key in newValue)) {
                      style[key] = '';
                    }
                  }
                }
              }
            } else {
              if (isSVG) style.value = '';
              else style.cssText = '';
            }
            const info = isSVG ? {} : style;
            for (const key in newValue) {
              const value = newValue[key];
              info[key] = typeof value === 'number' &&
                          !IS_NON_DIMENSIONAL.test(key) ?
                            (value + 'px') : value;
            }
            oldType = 'object';
            if (isSVG) style.value = toStyle((oldValue = info));
            else oldValue = newValue;
            break;
          }
        default:
          if (oldValue != newValue) {
            oldType = 'string';
            oldValue = newValue;
            if (isSVG) style.value = newValue || '';
            else style.cssText = newValue || '';
          }
          break;
      }
    };
  };

  const hyphen = /([^A-Z])([A-Z]+)/g;
  const ized = ($0, $1, $2) => $1 + '-' + $2.toLowerCase();
  const toStyle = object => {
    const css = [];
    for (const key in object) {
      css.push(key.replace(hyphen, ized), ':', object[key], ';');
    }
    return css.join('');
  };

  /* AUTOMATICALLY IMPORTED, DO NOT MODIFY */
  /*! (c) 2017 Andrea Giammarchi (ISC) */

  /**
   * This code is a revisited port of the snabbdom vDOM diffing logic,
   * the same that fuels as fork Vue.js or other libraries.
   * @credits https://github.com/snabbdom/snabbdom
   */

  const eqeq = (a, b) => a == b;

  const identity = O => O;

  const remove$4 = (get, parentNode, before, after) => {
    if (after == null) {
      parentNode.removeChild(get(before, -1));
    } else {
      const range = parentNode.ownerDocument.createRange();
      range.setStartBefore(get(before, -1));
      range.setEndAfter(get(after, -1));
      range.deleteContents();
    }
  };

  const domdiff = (
    parentNode,     // where changes happen
    currentNodes,   // Array of current items/nodes
    futureNodes,    // Array of future items/nodes
    options         // optional object with one of the following properties
                    //  before: domNode
                    //  compare(generic, generic) => true if same generic
                    //  node(generic) => Node
  ) => {
    if (!options)
      options = {};
    const compare = options.compare || eqeq;
    const get = options.node || identity;
    const before = options.before == null ? null : get(options.before, 0);
    let currentStart = 0, futureStart = 0;
    let currentEnd = currentNodes.length - 1;
    let currentStartNode = currentNodes[0];
    let currentEndNode = currentNodes[currentEnd];
    let futureEnd = futureNodes.length - 1;
    let futureStartNode = futureNodes[0];
    let futureEndNode = futureNodes[futureEnd];
    while (currentStart <= currentEnd && futureStart <= futureEnd) {
      if (currentStartNode == null) {
        currentStartNode = currentNodes[++currentStart];
      }
      else if (currentEndNode == null) {
        currentEndNode = currentNodes[--currentEnd];
      }
      else if (futureStartNode == null) {
        futureStartNode = futureNodes[++futureStart];
      }
      else if (futureEndNode == null) {
        futureEndNode = futureNodes[--futureEnd];
      }
      else if (compare(currentStartNode, futureStartNode)) {
        currentStartNode = currentNodes[++currentStart];
        futureStartNode = futureNodes[++futureStart];
      }
      else if (compare(currentEndNode, futureEndNode)) {
        currentEndNode = currentNodes[--currentEnd];
        futureEndNode = futureNodes[--futureEnd];
      }
      else if (compare(currentStartNode, futureEndNode)) {
        parentNode.insertBefore(
          get(currentStartNode, 1),
          get(currentEndNode, -0).nextSibling
        );
        currentStartNode = currentNodes[++currentStart];
        futureEndNode = futureNodes[--futureEnd];
      }
      else if (compare(currentEndNode, futureStartNode)) {
        parentNode.insertBefore(
          get(currentEndNode, 1),
          get(currentStartNode, 0)
        );
        currentEndNode = currentNodes[--currentEnd];
        futureStartNode = futureNodes[++futureStart];
      }
      else {
        let index = currentNodes.indexOf(futureStartNode);
        if (index < 0) {
          parentNode.insertBefore(
            get(futureStartNode, 1),
            get(currentStartNode, 0)
          );
          futureStartNode = futureNodes[++futureStart];
        }
        else {
          let i = index;
          let f = futureStart;
          while (
            i <= currentEnd &&
            f <= futureEnd &&
            currentNodes[i] === futureNodes[f]
          ) {
            i++;
            f++;
          }
          if (1 < (i - index)) {
            if (--index === currentStart) {
              parentNode.removeChild(get(currentStartNode, -1));
            } else {
              remove$4(
                get,
                parentNode,
                currentStartNode,
                currentNodes[index]
              );
            }
            currentStart = i;
            futureStart = f;
            currentStartNode = currentNodes[i];
            futureStartNode = futureNodes[f];
          } else {
            const el = currentNodes[index];
            currentNodes[index] = null;
            parentNode.insertBefore(get(el, 1), get(currentStartNode, 0));
            futureStartNode = futureNodes[++futureStart];
          }
        }
      }
    }
    if (currentStart <= currentEnd || futureStart <= futureEnd) {
      if (currentStart > currentEnd) {
        const pin = futureNodes[futureEnd + 1];
        const place = pin == null ? before : get(pin, 0);
        if (futureStart === futureEnd) {
          parentNode.insertBefore(get(futureNodes[futureStart], 1), place);
        }
        else {
          const fragment = parentNode.ownerDocument.createDocumentFragment();
          while (futureStart <= futureEnd) {
            fragment.appendChild(get(futureNodes[futureStart++], 1));
          }
          parentNode.insertBefore(fragment, place);
        }
      }
      else {
        if (currentNodes[currentStart] == null)
          currentStart++;
        if (currentStart === currentEnd) {
          parentNode.removeChild(get(currentNodes[currentStart], -1));
        }
        else {
          remove$4(
            get,
            parentNode,
            currentNodes[currentStart],
            currentNodes[currentEnd]
          );
        }
      }
    }
    return futureNodes;
  };

  // hyper.Component have a connected/disconnected
  // mechanism provided by MutationObserver
  // This weak set is used to recognize components
  // as DOM node that needs to trigger connected/disconnected events
  const components = new WeakSet;

  // a basic dictionary used to filter already cached attributes
  // while looking for special hyperHTML values.
  function Cache() {}
  Cache.prototype = Object.create(null);

  // returns an intent to explicitly inject content as html
  const asHTML = html => ({html});

  // returns nodes from wires and components
  const asNode = (item, i) => {
    return 'ELEMENT_NODE' in item ?
      item :
      (item.constructor === Wire ?
        // in the Wire case, the content can be
        // removed, post-pended, inserted, or pre-pended and
        // all these cases are handled by domdiff already
        /* istanbul ignore next */
        ((1 / i) < 0 ?
          (i ? item.remove() : item.last) :
          (i ? item.insert() : item.first)) :
        asNode(item.render(), i));
  };

  // returns true if domdiff can handle the value
  const canDiff = value =>  'ELEMENT_NODE' in value ||
  value instanceof Wire ||
  value instanceof Component;

  // updates are created once per context upgrade
  // within the main render function (../hyper/render.js)
  // These are an Array of callbacks to invoke passing
  // each interpolation value.
  // Updates can be related to any kind of content,
  // attributes, or special text-only cases such <style>
  // elements or <textarea>
  const create$1 = (root, paths) => {
    const updates = [];
    const length = paths.length;
    for (let i = 0; i < length; i++) {
      const info = paths[i];
      const node = Path.find(root, info.path);
      switch (info.type) {
        case 'any':
          updates.push(setAnyContent(node, []));
          break;
        case 'attr':
          updates.push(setAttribute(node, info.name, info.node));
          break;
        case 'text':
          updates.push(setTextContent(node));
          node.textContent = '';
          break;
      }
    }
    return updates;
  };

  // finding all paths is a one-off operation performed
  // when a new template literal is used.
  // The goal is to map all target nodes that will be
  // used to update content/attributes every time
  // the same template literal is used to create content.
  // The result is a list of paths related to the template
  // with all the necessary info to create updates as
  // list of callbacks that target directly affected nodes.
  const find = (node, paths, parts) => {
    const childNodes = node.childNodes;
    const length = childNodes.length;
    for (let i = 0; i < length; i++) {
      let child = childNodes[i];
      switch (child.nodeType) {
        case ELEMENT_NODE:
          findAttributes$1(child, paths, parts);
          find(child, paths, parts);
          break;
        case COMMENT_NODE:
          if (child.textContent === UID) {
            parts.shift();
            paths.push(
              // basicHTML or other non standard engines
              // might end up having comments in nodes
              // where they shouldn't, hence this check.
              SHOULD_USE_TEXT_CONTENT.test(node.nodeName) ?
                Path.create('text', node) :
                Path.create('any', child)
            );
          }
          break;
        case TEXT_NODE:
          // the following ignore is actually covered by browsers
          // only basicHTML ends up on previous COMMENT_NODE case
          // instead of TEXT_NODE because it knows nothing about
          // special style or textarea behavior
          /* istanbul ignore if */
          if (
            SHOULD_USE_TEXT_CONTENT.test(node.nodeName) &&
            trim.call(child.textContent) === UIDC
          ) {
            parts.shift();
            paths.push(Path.create('text', node));
          }
          break;
      }
    }
  };

  // attributes are searched via unique hyperHTML id value.
  // Despite HTML being case insensitive, hyperHTML is able
  // to recognize attributes by name in a caseSensitive way.
  // This plays well with Custom Elements definitions
  // and also with XML-like environments, without trusting
  // the resulting DOM but the template literal as the source of truth.
  // IE/Edge has a funny bug with attributes and these might be duplicated.
  // This is why there is a cache in charge of being sure no duplicated
  // attributes are ever considered in future updates.
  const findAttributes$1 = (node, paths, parts) => {
    const cache = new Cache;
    const attributes = node.attributes;
    const array = slice.call(attributes);
    const remove = [];
    const length = array.length;
    for (let i = 0; i < length; i++) {
      const attribute = array[i];
      if (attribute.value === UID) {
        const name = attribute.name;
        // the following ignore is covered by IE
        // and the IE9 double viewBox test
        /* istanbul ignore else */
        if (!(name in cache)) {
          const realName = parts.shift().replace(/^(?:|[\S\s]*?\s)(\S+?)=['"]?$/, '$1');
          cache[name] = attributes[realName] ||
                        // the following ignore is covered by browsers
                        // while basicHTML is already case-sensitive
                        /* istanbul ignore next */
                        attributes[realName.toLowerCase()];
          paths.push(Path.create('attr', cache[name], realName));
        }
        remove.push(attribute);
      }
    }
    const len = remove.length;
    for (let i = 0; i < len; i++) {
      // Edge HTML bug #16878726
      const attribute = remove[i];
      if (/^id$/i.test(attribute.name))
        node.removeAttribute(attribute.name);
      // standard browsers would work just fine here
      else
        node.removeAttributeNode(remove[i]);
    }

    // This is a very specific Firefox/Safari issue
    // but since it should be a not so common pattern,
    // it's probably worth patching regardless.
    // Basically, scripts created through strings are death.
    // You need to create fresh new scripts instead.
    // TODO: is there any other node that needs such nonsense?
    const nodeName = node.nodeName;
    if (/^script$/i.test(nodeName)) {
      // this used to be like that
      // const script = createElement(node, nodeName);
      // then Edge arrived and decided that scripts created
      // through template documents aren't worth executing
      // so it became this ... hopefully it won't hurt in the wild
      const script = document.createElement(nodeName);
      for (let i = 0; i < attributes.length; i++) {
        script.setAttributeNode(attributes[i].cloneNode(true));
      }
      script.textContent = node.textContent;
      node.parentNode.replaceChild(script, node);
    }
  };

  // when a Promise is used as interpolation value
  // its result must be parsed once resolved.
  // This callback is in charge of understanding what to do
  // with a returned value once the promise is resolved.
  const invokeAtDistance = (value, callback) => {
    callback(value.placeholder);
    if ('text' in value) {
      Promise.resolve(value.text).then(String).then(callback);
    } else if ('any' in value) {
      Promise.resolve(value.any).then(callback);
    } else if ('html' in value) {
      Promise.resolve(value.html).then(asHTML).then(callback);
    } else {
      Promise.resolve(Intent.invoke(value, callback)).then(callback);
    }
  };

  // quick and dirty way to check for Promise/ish values
  const isPromise_ish = value => value != null && 'then' in value;

  // in a hyper(node)`<div>${content}</div>` case
  // everything could happen:
  //  * it's a JS primitive, stored as text
  //  * it's null or undefined, the node should be cleaned
  //  * it's a component, update the content by rendering it
  //  * it's a promise, update the content once resolved
  //  * it's an explicit intent, perform the desired operation
  //  * it's an Array, resolve all values if Promises and/or
  //    update the node with the resulting list of content
  const setAnyContent = (node, childNodes) => {
    const diffOptions = {node: asNode, before: node};
    let fastPath = false;
    let oldValue;
    const anyContent = value => {
      switch (typeof value) {
        case 'string':
        case 'number':
        case 'boolean':
          if (fastPath) {
            if (oldValue !== value) {
              oldValue = value;
              childNodes[0].textContent = value;
            }
          } else {
            fastPath = true;
            oldValue = value;
            childNodes = domdiff(
              node.parentNode,
              childNodes,
              [text(node, value)],
              diffOptions
            );
          }
          break;
        case 'object':
        case 'undefined':
          if (value == null) {
            fastPath = false;
            childNodes = domdiff(
              node.parentNode,
              childNodes,
              [],
              diffOptions
            );
            break;
          }
        default:
          fastPath = false;
          oldValue = value;
          if (isArray(value)) {
            if (value.length === 0) {
              if (childNodes.length) {
                childNodes = domdiff(
                  node.parentNode,
                  childNodes,
                  [],
                  diffOptions
                );
              }
            } else {
              switch (typeof value[0]) {
                case 'string':
                case 'number':
                case 'boolean':
                  anyContent({html: value});
                  break;
                case 'object':
                  if (isArray(value[0])) {
                    value = value.concat.apply([], value);
                  }
                  if (isPromise_ish(value[0])) {
                    Promise.all(value).then(anyContent);
                    break;
                  }
                default:
                  childNodes = domdiff(
                    node.parentNode,
                    childNodes,
                    value,
                    diffOptions
                  );
                  break;
              }
            }
          } else if (canDiff(value)) {
            childNodes = domdiff(
              node.parentNode,
              childNodes,
              value.nodeType === DOCUMENT_FRAGMENT_NODE ?
                slice.call(value.childNodes) :
                [value],
              diffOptions
            );
          } else if (isPromise_ish(value)) {
            value.then(anyContent);
          } else if ('placeholder' in value) {
            invokeAtDistance(value, anyContent);
          } else if ('text' in value) {
            anyContent(String(value.text));
          } else if ('any' in value) {
            anyContent(value.any);
          } else if ('html' in value) {
            childNodes = domdiff(
              node.parentNode,
              childNodes,
              slice.call(
                createFragment(
                  node,
                  [].concat(value.html).join('')
                ).childNodes
              ),
              diffOptions
            );
          } else if ('length' in value) {
            anyContent(slice.call(value));
          } else {
            anyContent(Intent.invoke(value, anyContent));
          }
          break;
      }
    };
    return anyContent;
  };

  // there are four kind of attributes, and related behavior:
  //  * events, with a name starting with `on`, to add/remove event listeners
  //  * special, with a name present in their inherited prototype, accessed directly
  //  * regular, accessed through get/setAttribute standard DOM methods
  //  * style, the only regular attribute that also accepts an object as value
  //    so that you can style=${{width: 120}}. In this case, the behavior has been
  //    fully inspired by Preact library and its simplicity.
  const setAttribute = (node, name, original) => {
    const isSVG = OWNER_SVG_ELEMENT in node;
    let oldValue;
    // if the attribute is the style one
    // handle it differently from others
    if (name === 'style') {
      return Style(node, original, isSVG);
    }
    // the name is an event one,
    // add/remove event listeners accordingly
    else if (/^on/.test(name)) {
      let type = name.slice(2);
      if (type === CONNECTED || type === DISCONNECTED) {
        if (notObserving) {
          notObserving = false;
          observe();
        }
        components.add(node);
      }
      else if (name.toLowerCase() in node) {
        type = type.toLowerCase();
      }
      return newValue => {
        if (oldValue !== newValue) {
          if (oldValue) node.removeEventListener(type, oldValue, false);
          oldValue = newValue;
          if (newValue) node.addEventListener(type, newValue, false);
        }
      };
    }
    // the attribute is special ('value' in input)
    // and it's not SVG *or* the name is exactly data,
    // in this case assign the value directly
    else if (name === 'data' || (!isSVG && name in node)) {
      return newValue => {
        if (oldValue !== newValue) {
          oldValue = newValue;
          if (node[name] !== newValue) {
            node[name] = newValue;
            if (newValue == null) {
              node.removeAttribute(name);
            }
          }
        }
      };
    }
    else if (name in Intent.attributes) {
      return any => {
        oldValue = Intent.attributes[name](node, any);
        node.setAttribute(name, oldValue == null ? '' : oldValue);
      };
    }
    // in every other case, use the attribute node as it is
    // update only the value, set it as node only when/if needed
    else {
      let owner = false;
      const attribute = original.cloneNode(true);
      return newValue => {
        if (oldValue !== newValue) {
          oldValue = newValue;
          if (attribute.value !== newValue) {
            if (newValue == null) {
              if (owner) {
                owner = false;
                node.removeAttributeNode(attribute);
              }
              attribute.value = newValue;
            } else {
              attribute.value = newValue;
              if (!owner) {
                owner = true;
                node.setAttributeNode(attribute);
              }
            }
          }
        }
      };
    }
  };

  // style or textareas don't accept HTML as content
  // it's pointless to transform or analyze anything
  // different from text there but it's worth checking
  // for possible defined intents.
  const setTextContent = node => {
    let oldValue;
    const textContent = value => {
      if (oldValue !== value) {
        oldValue = value;
        if (typeof value === 'object' && value) {
          if (isPromise_ish(value)) {
            value.then(textContent);
          } else if ('placeholder' in value) {
            invokeAtDistance(value, textContent);
          } else if ('text' in value) {
            textContent(String(value.text));
          } else if ('any' in value) {
            textContent(value.any);
          } else if ('html' in value) {
            textContent([].concat(value.html).join(''));
          } else if ('length' in value) {
            textContent(slice.call(value).join(''));
          } else {
            textContent(Intent.invoke(value, textContent));
          }
        } else {
          node.textContent = value == null ? '' : value;
        }
      }
    };
    return textContent;
  };

  var Updates = {create: create$1, find};

  // hyper.Components might need connected/disconnected notifications
  // used by components and their onconnect/ondisconnect callbacks.
  // When one of these callbacks is encountered,
  // the document starts being observed.
  let notObserving = true;
  function observe() {

    // when hyper.Component related DOM nodes
    // are appended or removed from the live tree
    // these might listen to connected/disconnected events
    // This utility is in charge of finding all components
    // involved in the DOM update/change and dispatch
    // related information to them
    const dispatchAll = (nodes, type) => {
      const event = new Event(type);
      const length = nodes.length;
      for (let i = 0; i < length; i++) {
        let node = nodes[i];
        if (node.nodeType === ELEMENT_NODE) {
          dispatchTarget(node, event);
        }
      }
    };

    // the way it's done is via the components weak set
    // and recursively looking for nested components too
    const dispatchTarget = (node, event) => {
      if (components.has(node)) {
        node.dispatchEvent(event);
      }

      /* istanbul ignore next */
      const children = node.children || getChildren(node);
      const length = children.length;
      for (let i = 0; i < length; i++) {
        dispatchTarget(children[i], event);
      }
    };

    // The MutationObserver is the best way to implement that
    // but there is a fallback to deprecated DOMNodeInserted/Removed
    // so that even older browsers/engines can help components life-cycle
    try {
      (new MutationObserver(records => {
        const length = records.length;
        for (let i = 0; i < length; i++) {
          let record = records[i];
          dispatchAll(record.removedNodes, DISCONNECTED);
          dispatchAll(record.addedNodes, CONNECTED);
        }
      })).observe(document, {subtree: true, childList: true});
    } catch(o_O) {
      document.addEventListener('DOMNodeRemoved', event => {
        dispatchAll([event.target], DISCONNECTED);
      }, false);
      document.addEventListener('DOMNodeInserted', event => {
        dispatchAll([event.target], CONNECTED);
      }, false);
    }
  }

  // a weak collection of contexts that
  // are already known to hyperHTML
  const bewitched = new WeakMap;

  // all unique template literals
  const templates = TemplateMap();

  // better known as hyper.bind(node), the render is
  // the main tag function in charge of fully upgrading
  // or simply updating, contexts used as hyperHTML targets.
  // The `this` context is either a regular DOM node or a fragment.
  function render(template) {
    const wicked = bewitched.get(this);
    if (wicked && wicked.template === unique(template)) {
      update$1.apply(wicked.updates, arguments);
    } else {
      upgrade.apply(this, arguments);
    }
    return this;
  }

  // an upgrade is in charge of collecting template info,
  // parse it once, if unknown, to map all interpolations
  // as single DOM callbacks, relate such template
  // to the current context, and render it after cleaning the context up
  function upgrade(template) {
    template = unique(template);
    const info =  templates.get(template) ||
                  createTemplate.call(this, template);
    const fragment = importNode(this.ownerDocument, info.fragment);
    const updates = Updates.create(fragment, info.paths);
    bewitched.set(this, {template, updates});
    update$1.apply(updates, arguments);
    this.textContent = '';
    this.appendChild(fragment);
  }

  // an update simply loops over all mapped DOM operations
  function update$1() {
    const length = arguments.length;
    for (let i = 1; i < length; i++) {
      this[i - 1](arguments[i]);
    }
  }

  // a template can be used to create a document fragment
  // aware of all interpolations and with a list
  // of paths used to find once those nodes that need updates,
  // no matter if these are attributes, text nodes, or regular one
  function createTemplate(template) {
    const paths = [];
    const html = template.join(UIDC).replace(SC_RE, SC_PLACE);
    const fragment = createFragment(this, html);
    Updates.find(fragment, paths, template.slice());
    const info = {fragment, paths};
    templates.set(template, info);
    return info;
  }

  // some node could be special though, like a custom element
  // with a self closing tag, which should work through these changes.
  const SC_RE = selfClosing;
  const SC_PLACE = ($0, $1, $2) => {
    return VOID_ELEMENTS.test($1) ? $0 : ('<' + $1 + $2 + '></' + $1 + '>');
  };

  // all wires used per each context
  const wires = new WeakMap;

  // A wire is a callback used as tag function
  // to lazily relate a generic object to a template literal.
  // hyper.wire(user)`<div id=user>${user.name}</div>`; => the div#user
  // This provides the ability to have a unique DOM structure
  // related to a unique JS object through a reusable template literal.
  // A wire can specify a type, as svg or html, and also an id
  // via html:id or :id convention. Such :id allows same JS objects
  // to be associated to different DOM structures accordingly with
  // the used template literal without losing previously rendered parts.
  const wire = (obj, type) => obj == null ?
    content(type || 'html') :
    weakly(obj, type || 'html');

  // A wire content is a virtual reference to one or more nodes.
  // It's represented by either a DOM node, or an Array.
  // In both cases, the wire content role is to simply update
  // all nodes through the list of related callbacks.
  // In few words, a wire content is like an invisible parent node
  // in charge of updating its content like a bound element would do.
  const content = type => {
    let wire, container, content, template, updates;
    return function (statics) {
      statics = unique(statics);
      let setup = template !== statics;
      if (setup) {
        template = statics;
        content = fragment(document);
        container = type === 'svg' ?
          document.createElementNS(SVG_NAMESPACE, 'svg') :
          content;
        updates = render.bind(container);
      }
      updates.apply(null, arguments);
      if (setup) {
        if (type === 'svg') {
          append$4(content, slice.call(container.childNodes));
        }
        wire = wireContent(content);
      }
      return wire;
    };
  };

  // wires are weakly created through objects.
  // Each object can have multiple wires associated
  // and this is thanks to the type + :id feature.
  const weakly = (obj, type) => {
    const i = type.indexOf(':');
    let wire = wires.get(obj);
    let id = type;
    if (-1 < i) {
      id = type.slice(i + 1);
      type = type.slice(0, i) || 'html';
    }
    if (!wire) wires.set(obj, wire = {});
    return wire[id] || (wire[id] = content(type));
  };

  // a document fragment loses its nodes as soon
  // as it's appended into another node.
  // This would easily lose wired content
  // so that on a second render call, the parent
  // node wouldn't know which node was there
  // associated to the interpolation.
  // To prevent hyperHTML to forget about wired nodes,
  // these are either returned as Array or, if there's ony one entry,
  // as single referenced node that won't disappear from the fragment.
  // The initial fragment, at this point, would be used as unique reference.
  const wireContent = node => {
    const childNodes = node.childNodes;
    const length = childNodes.length;
    const wireNodes = [];
    for (let i = 0; i < length; i++) {
      let child = childNodes[i];
      if (
        child.nodeType === ELEMENT_NODE ||
        trim.call(child.textContent).length !== 0
      ) {
        wireNodes.push(child);
      }
    }
    return wireNodes.length === 1 ? wireNodes[0] : new Wire(wireNodes);
  };

  /*! (c) Andrea Giammarchi (ISC) */

  // all functions are self bound to the right context
  // you can do the following
  // const {bind, wire} = hyperHTML;
  // and use them right away: bind(node)`hello!`;
  const bind = context => render.bind(context);

  // the wire content is the lazy defined
  // html or svg property of each hyper.Component
  setup(content);

  var ENTER_KEY = 13;
  var runAction = function (app, action) {
      return action(app);
  };
  var findId = function (el) {
      var todoEl = el.closest('[data-id]');
      return todoEl instanceof HTMLElement ? Number(todoEl.dataset.id) : -1;
  };
  var handleAdd = function (e) {
      var value = e.target.value.trim();
      if (e.keyCode !== ENTER_KEY || value.length === 0) {
          return id;
      }
      e.target.value = '';
      return addTodo(value);
  };
  var handleToggleAll = function (e) {
      return updateAllCompleted(e.target.checked);
  };
  var handleComplete = function (e) {
      return updateCompleted(e.target.checked, findId(e.target));
  };
  var handleRemove = function (e) {
      return removeTodo(findId(e.target));
  };
  var handleRemoveAllCompleted = function (e) {
      return removeAllCompleted;
  };
  var handleFilterChange = function (e) {
      return setFilter(e.newURL.replace(/^.*#/, ''));
  };

  var maybeClass = function (className) { return function (condition) {
      return condition ? className : '';
  }; };
  var ifCompleted = maybeClass('completed');
  var ifSelected = maybeClass('selected');
  var filterTodos = function (_a) {
      var filter = _a.filter, todos = _a.todos;
      return todos.filter(function (t) {
          switch (filter) {
              case '/': return true;
              case '/active': return !t.completed;
              case '/completed': return t.completed;
          }
      });
  };
  var updateView = function (addAction) { return function (appNode, appState) {
      var completed = completedCount(appState);
      var todos = appState.todos;
      var filtered = filterTodos(appState);
      var remaining = todos.length - completed;
      return bind(appNode)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n    <header class=\"header\">\n      <h1>todos</h1>\n      <input class=\"new-todo\" name=\"new-todo\" placeholder=\"What needs to be done?\" autofocus onkeypress=\"", "\">\n    </header>\n    ", "\n    ", ""], ["\n    <header class=\"header\">\n      <h1>todos</h1>\n      <input class=\"new-todo\" name=\"new-todo\" placeholder=\"What needs to be done?\" autofocus onkeypress=\"", "\">\n    </header>\n    ", "\n    ", ""])), compose(addAction, handleAdd), renderTodoList(addAction, todos.length > 0 && remaining === 0, filtered), renderFooter(addAction, remaining, completed, appState));
  }; };
  var renderTodoList = function (addAction, allCompleted, todos) {
      return wire()(templateObject_2 || (templateObject_2 = __makeTemplateObject(["<section class=\"main\">\n    <input id=\"toggle-all\" class=\"toggle-all\" type=\"checkbox\" checked=", " onchange=", ">\n    <label for=\"toggle-all\">Mark all as complete</label>\n    <ul class=\"todo-list\">\n      <!-- These are here just to show the structure of the list items -->\n      <!-- List items should get the class editing when editing and completed when marked as completed -->\n      ", "\n    </ul>\n  </section>"], ["<section class=\"main\">\n    <input id=\"toggle-all\" class=\"toggle-all\" type=\"checkbox\" checked=", " onchange=", ">\n    <label for=\"toggle-all\">Mark all as complete</label>\n    <ul class=\"todo-list\">\n      <!-- These are here just to show the structure of the list items -->\n      <!-- List items should get the class editing when editing and completed when marked as completed -->\n      ", "\n    </ul>\n  </section>"])), allCompleted, compose(addAction, handleToggleAll), todos.map(renderTodo(addAction)));
  };
  var renderTodo = function (addAction) { return function (_a) {
      var id$$1 = _a.id, completed = _a.completed, description = _a.description;
      return wire()(templateObject_3 || (templateObject_3 = __makeTemplateObject(["<li data-id=\"", "\" class=\"", "\">\n    <div class=\"view\">\n      <input class=\"toggle\" type=\"checkbox\" checked=", " onchange=", ">\n      <label>", "</label>\n      <button class=\"destroy\" onclick=\"", "\"></button>\n    </div>\n    <input class=\"edit\" value=\"", "\">\n  </li>"], ["<li data-id=\"", "\" class=\"", "\">\n    <div class=\"view\">\n      <input class=\"toggle\" type=\"checkbox\" checked=", " onchange=", ">\n      <label>", "</label>\n      <button class=\"destroy\" onclick=\"", "\"></button>\n    </div>\n    <input class=\"edit\" value=\"", "\">\n  </li>"])), id$$1, ifCompleted(completed), completed, compose(addAction, handleComplete), description, compose(addAction, handleRemove), description);
  }; };
  var renderFooter = function (addAction, remainingCount, completedCount$$1, _a) {
      var todos = _a.todos, filter = _a.filter;
      return wire()(templateObject_4 || (templateObject_4 = __makeTemplateObject(["<footer class=\"footer\" style=\"", "\">\n    <!-- This should be 0 items left by default -->\n    <span class=\"todo-count\"><strong>", "</strong> ", " left</span>\n    <!-- Remove this if you don't implement routing -->\n    <ul class=\"filters\">\n      <li><a class=\"", "\" href=\"#/\">All</a><li>\n      <li><a class=\"", "\" href=\"#/active\">Active</a><li>\n      <li><a class=\"", "\" href=\"#/completed\">Completed</a><li>\n    </ul>\n    <!-- Hidden if no completed items are left \u2193 -->\n    <button class=\"clear-completed\" style=\"", "\" onclick=\"", "\">Clear completed</button>\n  </footer>"], ["<footer class=\"footer\" style=\"", "\">\n    <!-- This should be 0 items left by default -->\n    <span class=\"todo-count\"><strong>", "</strong> ", " left</span>\n    <!-- Remove this if you don't implement routing -->\n    <ul class=\"filters\">\n      <li><a class=\"", "\" href=\"#/\">All</a><li>\n      <li><a class=\"", "\" href=\"#/active\">Active</a><li>\n      <li><a class=\"", "\" href=\"#/completed\">Completed</a><li>\n    </ul>\n    <!-- Hidden if no completed items are left \u2193 -->\n    <button class=\"clear-completed\" style=\"", "\" onclick=\"", "\">Clear completed</button>\n  </footer>"])), todos.length === 0 ? 'display:none' : '', remainingCount, remainingCount === 1 ? 'item' : 'items', ifSelected(filter === '/'), ifSelected(filter === '/active'), ifSelected(filter === '/completed'), completedCount$$1 > 0 ? '' : 'display:none', compose(addAction, handleRemoveAllCompleted));
  };
  var templateObject_1, templateObject_2, templateObject_3, templateObject_4;

  var createHyperEventAdapter = function (scheduler) {
      var stream = new MulticastSource(never());
      return [function (action) { return stream.event(scheduler.currentTime(), action); }, stream];
  };

  // TODO:
  var fail = function (s) { throw new Error(s); };
  var qs = function (s, el) {
      return el.querySelector(s) || fail(s + " not found");
  };
  // TodoMVC is a relatively slow-moving app, but let's use
  // animation frames to do UI updates anyway
  var raf = function (a) {
      return constant$$1(a, nextAnimationFrame(window));
  };
  var appNode = qs('.todoapp', document);
  var appState = emptyApp;
  var scheduler = newDefaultScheduler();
  var _a = createHyperEventAdapter(scheduler), addAction = _a[0], todoActions = _a[1];
  var updateFilter = map$1(handleFilterChange, hashchange(window));
  var actions = merge$$1(todoActions, updateFilter);
  var stateUpdates = skipRepeats(scan$$1(runAction, appState, actions));
  var viewUpdates = scan$$1(updateView(addAction), appNode, chain$$1(raf, stateUpdates));
  runEffects$$1(viewUpdates, scheduler);

}());
//# sourceMappingURL=app.js.map
