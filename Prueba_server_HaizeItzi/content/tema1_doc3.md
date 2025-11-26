# Lesson 3: Memory Management & Best Practices - The Art of Letting Go

**Minicourse**: Event Emitters (Green/Yellow - Overcoming Greed/Envy)  
**Lesson**: 3 of 3  
**Duration**: 30 minutes  
**Stoic Theme**: Letting Go - Releasing what is no longer needed

---

## 🎯 Learning Objectives

By the end of this lesson, you will be able to:

1. **Identify** and **prevent** memory leaks caused by forgotten event listeners
2. **Configure** listener limits appropriately with `setMaxListeners()` to avoid false warnings
3. **Understand** the performance implications of synchronous event emission
4. **Write** comprehensive tests for event-driven code using isolation and mocking techniques
5. **Debug** complex event flows using Node.js built-in tools and logging strategies
6. **Apply** best practices for maintainable, production-ready event-driven architectures
7. **Practice** the Stoic virtue of releasing attachments—removing listeners when they are no longer useful

---

## 📖 Introduction: The Burden of What We Keep

### Attachment as Impediment

In Stoic philosophy, attachment to things we no longer need is a primary source of suffering. Marcus Aurelius writes, "Confine yourself to the present. The mind that worries about the future invites anxiety into the now." Similarly, holding onto objects, relationships, or habits that have outlived their usefulness creates weight that slows our progress and clouds our judgment.

This principle applies with surprising precision to programming, particularly to event-driven systems. Every listener you register creates a reference that must be maintained in memory. When that listener is no longer needed—when the component that created it has been destroyed, or when the user has navigated away, or when the functionality has been disabled—that reference becomes dead weight. It consumes memory, degrades performance, and creates opportunities for bugs.

The technical term for this is a **memory leak**: a situation where memory that is no longer needed is not released back to the system. Memory leaks are insidious because they accumulate gradually. A single forgotten listener might cost only a few kilobytes, barely noticeable. But over time, as users interact with your application, creating and destroying components, opening and closing connections, that forgotten cleanup code leads to an ever-growing pile of abandoned references.

Eventually, the application slows. Memory usage climbs. Garbage collection runs more frequently, causing perceptible pauses. In the worst cases, the application crashes with an out-of-memory error. And the root cause, traced back through profiling tools and heap dumps, is often a simple oversight: a listener that was never removed.

### The Discipline of Release

The Stoics taught a practice called *apatheia*—not indifference, but rather freedom from destructive passions through rational understanding. Applied to event listeners, this means developing the discipline to release references when they are no longer needed. It means accepting that every `.on()` creates a responsibility, and that responsibility is fulfilled only when you call `.removeListener()` or when you use `.once()` for naturally self-cleaning listeners.

This lesson explores the practical techniques for preventing memory leaks in event-driven Node.js applications. You will learn to recognize the patterns that cause leaks, to configure systems that warn you when leaks are likely, and to test your code rigorously to ensure cleanup happens correctly. Most importantly, you will develop the mental habit of asking, whenever you register a listener: "When will this no longer be needed, and how will I ensure it is removed?"

As Epictetus wrote, "Freedom is secured not by the fulfilling of desires, but by removing them." In Node.js, freedom from memory leaks is secured not by adding more listeners, but by religiously removing those that are no longer needed.

---

## 🔴 Part 1: Memory Leaks - The Problem of Forgotten References

### Understanding How Listeners Create References

When you call `emitter.on(eventName, listener)`, Node.js stores a reference to your listener function in an internal array. As long as that reference exists, the JavaScript garbage collector cannot reclaim the memory used by the listener function or any variables it closes over.

Consider this common pattern:

```javascript
const EventEmitter = require('events');

class DataService extends EventEmitter {
  constructor() {
    super();
    this.cache = new Map();
  }

  getData(key) {
    return this.cache.get(key);
  }
}

class UIComponent {
  constructor(dataService) {
    this.dataService = dataService;
    this.largeDataStructure = new Array(1000000).fill('data');

    // Register listener - creates reference to 'this'
    this.dataService.on('update', (key) => {
      const data = this.dataService.getData(key);
      console.log(`Component received update: ${key}`);
      // This closure captures 'this', including 'largeDataStructure'
    });
  }

  destroy() {
    // BUG: Listener never removed!
    // Memory leak: largeDataStructure remains in memory
  }
}

// Simulating component lifecycle
const service = new DataService();

// Create and destroy components repeatedly
for (let i = 0; i < 100; i++) {
  const component = new UIComponent(service);
  component.destroy();
}

// Result: 100 listeners still registered, each holding 1 million elements
// Memory usage: ~800MB+ of leaked memory
console.log(`Listener count: ${service.listenerCount('update')}`);
// Output: Listener count: 100
```

**What went wrong?**

1. Each `UIComponent` registers a listener on the shared `DataService`
2. The listener is an arrow function that closes over `this`, capturing the entire component instance
3. The component instance includes `largeDataStructure`, a 1MB array
4. When `component.destroy()` is called, the component thinks it's cleaning up, but it never calls `removeListener()`
5. The `DataService` still holds a reference to the listener, which holds a reference to the component, which holds a reference to `largeDataStructure`
6. Garbage collection cannot reclaim the memory because the reference chain is still alive
7. Each iteration of the loop leaks another 1MB, accumulating to 100MB+ of wasted memory

### The Correct Pattern: Always Remove Listeners

Here's the corrected version:

```javascript
class UIComponent {
  constructor(dataService) {
    this.dataService = dataService;
    this.largeDataStructure = new Array(1000000).fill('data');

    // Store listener as instance method so we can remove it later
    this.updateHandler = (key) => {
      const data = this.dataService.getData(key);
      console.log(`Component received update: ${key}`);
    };

    this.dataService.on('update', this.updateHandler);
  }

  destroy() {
    // ✅ CRITICAL: Remove listener to break reference chain
    this.dataService.removeListener('update', this.updateHandler);

    // Optional: Null out references to help GC
    this.updateHandler = null;
    this.largeDataStructure = null;
    this.dataService = null;
  }
}

// Now the loop doesn't leak memory
const service = new DataService();

for (let i = 0; i < 100; i++) {
  const component = new UIComponent(service);
  component.destroy();
}

console.log(`Listener count: ${service.listenerCount('update')}`);
// Output: Listener count: 0
```

**Key improvements:**

1. Listener is stored as `this.updateHandler` so we have a reference to remove it later
2. `destroy()` explicitly calls `removeListener()` to break the reference chain
3. Optional additional cleanup nulls out references (helps but not strictly required if listener is removed)
4. Memory is properly reclaimed, preventing leaks

### Common Memory Leak Patterns

**Pattern 1: Timers that register listeners**

```javascript
// ❌ LEAK: setInterval creates listeners that never get removed
class AutoRefreshComponent {
  constructor(emitter) {
    this.emitter = emitter;

    setInterval(() => {
      this.emitter.on('data', this.handleData);
    }, 1000);
  }

  handleData(data) {
    console.log(data);
  }

  destroy() {
    // BUG: interval never cleared, listeners keep accumulating
  }
}

// ✅ FIXED: Store interval ID and clear on destroy
class AutoRefreshComponent {
  constructor(emitter) {
    this.emitter = emitter;
    this.intervalId = setInterval(() => {
      this.emitter.on('data', this.handleData);
    }, 1000);
  }

  handleData(data) {
    console.log(data);
  }

  destroy() {
    clearInterval(this.intervalId);
    this.emitter.removeListener('data', this.handleData);
  }
}
```

**Pattern 2: Event listeners in React/Vue components**

```javascript
// ❌ LEAK: Listener registered in componentDidMount but never removed
class ReactComponent extends React.Component {
  componentDidMount() {
    this.props.eventBus.on('message', this.handleMessage);
  }

  handleMessage = (msg) => {
    this.setState({ lastMessage: msg });
  }

  render() {
    return <div>{this.state.lastMessage}</div>;
  }
}

// ✅ FIXED: Remove listener in componentWillUnmount
class ReactComponent extends React.Component {
  componentDidMount() {
    this.props.eventBus.on('message', this.handleMessage);
  }

  componentWillUnmount() {
    this.props.eventBus.removeListener('message', this.handleMessage);
  }

  handleMessage = (msg) => {
    this.setState({ lastMessage: msg });
  }

  render() {
    return <div>{this.state.lastMessage}</div>;
  }
}
```

**Pattern 3: Listeners in Express middleware**

```javascript
const EventEmitter = require('events');
const express = require('express');

const app = express();
const notificationBus = new EventEmitter();

// ❌ LEAK: Each request creates a new listener that never gets removed
app.get('/stream', (req, res) => {
  notificationBus.on('notification', (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });

  // BUG: Connection may close, but listener remains
});

// ✅ FIXED: Remove listener when connection closes
app.get('/stream', (req, res) => {
  const handler = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  notificationBus.on('notification', handler);

  req.on('close', () => {
    notificationBus.removeListener('notification', handler);
    console.log('Client disconnected, listener removed');
  });
});
```

### Using `.once()` for Self-Cleaning Listeners

For events that should only be handled once, use `.once()` instead of `.on()`:

```javascript
const EventEmitter = require('events');

class ConnectionManager extends EventEmitter {
  connect() {
    // Simulate async connection
    setTimeout(() => {
      this.emit('connected');
    }, 1000);
  }
}

const manager = new ConnectionManager();

// ✅ GOOD: Automatically removes listener after first emission
manager.once('connected', () => {
  console.log('Connected! Starting application...');
});

manager.connect();

// Listener is automatically removed, no memory leak
console.log(`Listener count after emission: ${manager.listenerCount('connected')}`);
// Output: Listener count after emission: 0
```

**When to use `.once()`:**

- Initialization events (ready, connected, loaded)
- One-time user actions (firstClick, initialSubmit)
- Lifecycle events (created, destroyed)
- Promises wrapped as events

**Stoic Reflection**: Using `.once()` is like accepting that some experiences are meant to happen only once. The listener knows its purpose, fulfills it, and then releases itself—no attachment, no lingering presence, just the natural completion of its role.

---

## ⚠️ Part 2: Listener Limits and `setMaxListeners()`

### The Default Limit: 10 Listeners

Node.js EventEmitter includes a built-in memory leak detector. By default, if you add more than **10 listeners** to a single event, you'll see a warning:

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Add 11 listeners to trigger warning
for (let i = 0; i < 11; i++) {
  emitter.on('data', () => console.log(`Listener ${i}`));
}

// Warning: Possible EventEmitter memory leak detected. 11 data listeners added.
// Use emitter.setMaxListeners() to increase limit
```

**Why this warning exists:**

In most scenarios, having more than 10 listeners for a single event suggests a bug—usually the memory leak pattern we discussed earlier where listeners are being added repeatedly without being removed. The warning is Node.js trying to help you catch these bugs early.

### When to Increase the Limit

However, there are legitimate cases where you need more than 10 listeners:

**Legitimate Scenario 1: Pub/Sub Systems**

```javascript
const EventEmitter = require('events');

class MessageBus extends EventEmitter {
  constructor() {
    super();
    // Many subscribers is expected in pub/sub patterns
    this.setMaxListeners(100);
  }
}

const bus = new MessageBus();

// 50 microservices subscribe to 'userCreated' event
for (let i = 0; i < 50; i++) {
  bus.on('userCreated', (user) => {
    console.log(`Service ${i} processing new user: ${user.id}`);
  });
}

// No warning, this is expected behavior
```

**Legitimate Scenario 2: Plugin Systems**

```javascript
const EventEmitter = require('events');

class PluginManager extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Support up to 50 plugins
    this.plugins = [];
  }

  loadPlugin(plugin) {
    this.plugins.push(plugin);

    // Each plugin registers multiple lifecycle listeners
    plugin.on('initialize', () => this.emit('pluginInitialized', plugin));
    plugin.on('execute', () => this.emit('pluginExecuted', plugin));
  }
}
```

**Legitimate Scenario 3: Testing**

```javascript
const EventEmitter = require('events');

describe('EventEmitter stress test', () => {
  it('should handle 100 simultaneous listeners', () => {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(100);

    let callCount = 0;

    // Register 100 test listeners
    for (let i = 0; i < 100; i++) {
      emitter.on('test', () => callCount++);
    }

    emitter.emit('test');

    expect(callCount).toBe(100);
  });
});
```

### Setting Limits Appropriately

**Per-emitter limit:**

```javascript
const emitter = new EventEmitter();
emitter.setMaxListeners(20); // Affects only this instance
```

**Global default (affects all new emitters):**

```javascript
const EventEmitter = require('events');

// Change default for all new EventEmitters
EventEmitter.defaultMaxListeners = 20;

const emitter1 = new EventEmitter();
const emitter2 = new EventEmitter();
// Both use new default of 20
```

**Unlimited listeners (use with extreme caution):**

```javascript
emitter.setMaxListeners(0); // 0 = unlimited, disables warnings

// ⚠️ WARNING: Only use if you're absolutely certain you won't leak memory
// You lose the safety net that catches bugs
```

### Guidelines for Setting Limits

| Scenario | Recommended Limit | Reasoning |
|----------|------------------|-----------|
| **Standard application** | 10 (default) | Catches most bugs |
| **Pub/Sub with 5-20 subscribers** | 25 | Small buffer above expected max |
| **Pub/Sub with 20-50 subscribers** | 75 | Generous buffer |
| **Plugin system (10-30 plugins)** | 50 | Depends on listeners per plugin |
| **Testing environment** | 100-200 | Higher limits for stress tests |
| **Never** | 0 (unlimited) | Removes leak detection |

**Stoic Wisdom**: Setting appropriate limits is like the Stoic practice of *praemeditatio malorum*—anticipating potential problems and preparing for them. You set limits high enough to accommodate legitimate use, but not so high that you lose the warning system that protects you from your own mistakes.

---

## ⚡ Part 3: Performance Considerations

### Synchronous Event Emission

One critical characteristic of EventEmitter is that **listeners are called synchronously** when you emit an event:

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

emitter.on('data', () => {
  console.log('Listener 1');
});

emitter.on('data', () => {
  console.log('Listener 2');
});

console.log('Before emit');
emitter.emit('data');
console.log('After emit');

// Output (strictly synchronous):
// Before emit
// Listener 1
// Listener 2
// After emit
```

**Implications:**

1. **Blocking**: If a listener performs slow synchronous work (e.g., complex calculations, synchronous I/O), it blocks the event loop
2. **Order guarantees**: Listeners execute in registration order
3. **Error propagation**: Errors in listeners bubble up immediately

### Problem: Slow Listeners Block the Event Loop

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

emitter.on('process', (data) => {
  // BAD: Synchronous CPU-intensive work
  for (let i = 0; i < 1000000000; i++) {
    Math.sqrt(i);
  }
  console.log('Finished processing:', data);
});

console.log('Starting...');
emitter.emit('process', 'data'); // Blocks here for several seconds
console.log('Continuing...'); // Doesn't print until listener completes
```

### Solution 1: Async Listeners with process.nextTick()

```javascript
const EventEmitter = require('events');

class AsyncEmitter extends EventEmitter {
  emitAsync(eventName, ...args) {
    // Defer emission to next tick
    process.nextTick(() => {
      this.emit(eventName, ...args);
    });
  }
}

const emitter = new AsyncEmitter();

emitter.on('process', (data) => {
  for (let i = 0; i < 1000000000; i++) {
    Math.sqrt(i);
  }
  console.log('Finished processing:', data);
});

console.log('Starting...');
emitter.emitAsync('process', 'data'); // Returns immediately
console.log('Continuing...'); // Prints before listener executes

// Output:
// Starting...
// Continuing...
// Finished processing: data (appears later)
```

### Solution 2: Offload Work to Worker Threads

```javascript
const EventEmitter = require('events');
const { Worker } = require('worker_threads');

class WorkerEmitter extends EventEmitter {
  constructor() {
    super();
    this.worker = new Worker('./worker.js');

    this.worker.on('message', (result) => {
      this.emit('result', result);
    });
  }

  processAsync(data) {
    this.worker.postMessage({ type: 'process', data });
  }
}

const emitter = new WorkerEmitter();

emitter.on('result', (result) => {
  console.log('Worker result:', result);
});

emitter.processAsync({ value: 42 });
// Main thread continues, worker processes in parallel
```

### Solution 3: Use Streams for Large Datasets

```javascript
const EventEmitter = require('events');
const { Readable } = require('stream');

// ❌ BAD: Emit all data at once (blocks)
class BadDataSource extends EventEmitter {
  start() {
    const largeArray = new Array(1000000).fill('data');

    largeArray.forEach((item) => {
      this.emit('data', item); // Blocks until all 1M items processed
    });

    this.emit('end');
  }
}

// ✅ GOOD: Use streams for chunked processing
class GoodDataSource extends Readable {
  constructor() {
    super({ objectMode: true });
    this.count = 0;
    this.max = 1000000;
  }

  _read() {
    if (this.count < this.max) {
      this.push({ data: `item-${this.count}` });
      this.count++;
    } else {
      this.push(null); // Signal end
    }
  }
}

const stream = new GoodDataSource();

stream.on('data', (chunk) => {
  console.log('Processing:', chunk);
  // Backpressure automatically managed
});

stream.on('end', () => {
  console.log('All data processed');
});
```

### Performance Best Practices

1. **Keep listeners fast** - Avoid synchronous I/O, complex calculations
2. **Use async patterns** - `process.nextTick()`, worker threads, async/await
3. **Limit listener count** - Too many listeners = slower emission
4. **Use streams for data** - Better backpressure management
5. **Profile regularly** - Use `--prof` flag or Chrome DevTools

```javascript
// Example: Profiling emitter performance
const EventEmitter = require('events');

const emitter = new EventEmitter();

// Add 1000 listeners
for (let i = 0; i < 1000; i++) {
  emitter.on('data', () => {
    // Minimal work
  });
}

console.time('emit-1000-listeners');
emitter.emit('data', 'test');
console.timeEnd('emit-1000-listeners');
// Output: emit-1000-listeners: 0.123ms

// Demonstrates: 1000 listeners = minimal overhead if listeners are fast
```

---

## 🧪 Part 4: Testing Event-Driven Code

### Challenge: Testing Asynchronous Events

Testing event-driven code requires special patterns because events are inherently asynchronous and decoupled. Traditional assert-and-verify patterns don't work well.

### Pattern 1: Spy on Emissions

```javascript
const EventEmitter = require('events');

describe('UserService', () => {
  it('should emit "created" event when user is saved', (done) => {
    const service = new UserService();

    // Spy: Track if event was emitted
    service.once('created', (user) => {
      expect(user.id).toBeDefined();
      expect(user.name).toBe('Alice');
      done(); // Signal async test complete
    });

    service.createUser({ name: 'Alice' });
  });
});
```

### Pattern 2: Promise Wrapper for Event Testing

```javascript
function waitForEvent(emitter, eventName, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${eventName}`));
    }, timeout);

    emitter.once(eventName, (...args) => {
      clearTimeout(timer);
      resolve(args);
    });

    emitter.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

describe('MessageBus', () => {
  it('should emit message event', async () => {
    const bus = new MessageBus();

    const promise = waitForEvent(bus, 'message');

    bus.send({ text: 'Hello' });

    const [message] = await promise;
    expect(message.text).toBe('Hello');
  });

  it('should timeout if event not emitted', async () => {
    const bus = new MessageBus();

    await expect(
      waitForEvent(bus, 'never-emitted', 100)
    ).rejects.toThrow('Timeout waiting for never-emitted');
  });
});
```

### Pattern 3: Verify Listener Cleanup

```javascript
describe('UIComponent', () => {
  it('should remove listener on destroy', () => {
    const service = new DataService();
    const component = new UIComponent(service);

    // Initial state: 1 listener
    expect(service.listenerCount('update')).toBe(1);

    component.destroy();

    // After destroy: 0 listeners (no leak)
    expect(service.listenerCount('update')).toBe(0);
  });

  it('should not leak memory over many create/destroy cycles', () => {
    const service = new DataService();

    for (let i = 0; i < 100; i++) {
      const component = new UIComponent(service);
      component.destroy();
    }

    // If cleanup is correct, should still be 0
    expect(service.listenerCount('update')).toBe(0);
  });
});
```

### Pattern 4: Mock Emitters for Isolation

```javascript
class MockEmitter extends EventEmitter {
  constructor() {
    super();
    this.emissions = [];
  }

  emit(eventName, ...args) {
    this.emissions.push({ event: eventName, args });
    return super.emit(eventName, ...args);
  }

  getEmissions(eventName) {
    return this.emissions.filter(e => e.event === eventName);
  }

  clearEmissions() {
    this.emissions = [];
  }
}

describe('DataProcessor', () => {
  it('should emit progress events during processing', async () => {
    const mockEmitter = new MockEmitter();
    const processor = new DataProcessor(mockEmitter);

    await processor.process([1, 2, 3, 4, 5]);

    const progressEvents = mockEmitter.getEmissions('progress');
    expect(progressEvents.length).toBe(5);
    expect(progressEvents[0].args[0]).toBe(20); // 20% progress
    expect(progressEvents[4].args[0]).toBe(100); // 100% progress
  });
});
```

### Pattern 5: Integration Tests with Real Emitters

```javascript
describe('Full event flow integration', () => {
  it('should handle complete user registration flow', async () => {
    const eventBus = new EventEmitter();
    const userService = new UserService(eventBus);
    const emailService = new EmailService(eventBus);
    const analyticsService = new AnalyticsService(eventBus);

    // Set up spies
    const emailSpy = jest.fn();
    const analyticsSpy = jest.fn();

    emailService.on('emailSent', emailSpy);
    analyticsService.on('eventTracked', analyticsSpy);

    // Execute flow
    await userService.register({ email: 'test@example.com', name: 'Test' });

    // Verify side effects
    expect(emailSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'test@example.com' })
    );

    expect(analyticsSpy).toHaveBeenCalledWith('userRegistered', {
      userId: expect.any(String),
    });
  });
});
```

### Testing Checklist

- [ ] Test that events are emitted with correct data
- [ ] Test that listeners receive events in expected order
- [ ] Test that error events are handled properly
- [ ] Test listener cleanup (no memory leaks)
- [ ] Test timeout scenarios (events that never arrive)
- [ ] Test edge cases (no listeners, multiple listeners)
- [ ] Use mocks to isolate components
- [ ] Write integration tests for complete flows

---

## 🐛 Part 5: Debugging Event-Driven Systems

### Challenge: Tracing Event Flows

In complex event-driven systems, it can be difficult to trace how events propagate through multiple emitters and listeners. You emit an event in one place, and the effects ripple through many listeners across different modules.

### Technique 1: Event Logging Middleware

```javascript
const EventEmitter = require('events');

class DebuggableEmitter extends EventEmitter {
  constructor(name = 'Unnamed') {
    super();
    this.name = name;

    // Intercept 'emit' to log all events
    const originalEmit = this.emit.bind(this);
    this.emit = (eventName, ...args) => {
      console.log(`[${this.name}] Emit: ${eventName}`, args);
      return originalEmit(eventName, ...args);
    };

    // Log when listeners are added/removed
    this.on('newListener', (eventName) => {
      console.log(`[${this.name}] Listener added: ${eventName}`);
    });

    this.on('removeListener', (eventName) => {
      console.log(`[${this.name}] Listener removed: ${eventName}`);
    });
  }
}

// Usage
const emitter = new DebuggableEmitter('UserService');

emitter.on('created', (user) => {
  console.log('Handler: User created', user);
});

emitter.emit('created', { id: 1, name: 'Alice' });

// Output:
// [UserService] Listener added: created
// [UserService] Emit: created [ { id: 1, name: 'Alice' } ]
// Handler: User created { id: 1, name: 'Alice' }
```

### Technique 2: Listener Registry for Inspection

```javascript
class InspectableEmitter extends EventEmitter {
  constructor() {
    super();
    this.listenerRegistry = new Map();
  }

  on(eventName, listener) {
    if (!this.listenerRegistry.has(eventName)) {
      this.listenerRegistry.set(eventName, []);
    }

    // Store metadata about listener
    this.listenerRegistry.get(eventName).push({
      func: listener,
      addedAt: new Date(),
      stack: new Error().stack,
    });

    return super.on(eventName, listener);
  }

  removeListener(eventName, listener) {
    if (this.listenerRegistry.has(eventName)) {
      const listeners = this.listenerRegistry.get(eventName);
      const index = listeners.findIndex(l => l.func === listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }

    return super.removeListener(eventName, listener);
  }

  inspectListeners() {
    const report = {};

    for (const [eventName, listeners] of this.listenerRegistry) {
      report[eventName] = listeners.map(l => ({
        addedAt: l.addedAt,
        stack: l.stack.split('\n').slice(0, 5).join('\n'),
      }));
    }

    return report;
  }
}

// Usage
const emitter = new InspectableEmitter();

emitter.on('data', () => {});
emitter.on('data', () => {});

console.log(emitter.inspectListeners());
// Shows: When each listener was added and from where (stack trace)
```

### Technique 3: EventEmitter Profiler

```javascript
class ProfiledEmitter extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      emissionCounts: {},
      listenerDurations: {},
    };
  }

  emit(eventName, ...args) {
    // Track emission count
    this.metrics.emissionCounts[eventName] =
      (this.metrics.emissionCounts[eventName] || 0) + 1;

    const listeners = this.listeners(eventName);

    // Time each listener
    listeners.forEach((listener, index) => {
      const start = Date.now();
      listener(...args);
      const duration = Date.now() - start;

      const key = `${eventName}:listener-${index}`;
      if (!this.metrics.listenerDurations[key]) {
        this.metrics.listenerDurations[key] = [];
      }
      this.metrics.listenerDurations[key].push(duration);
    });

    return listeners.length > 0;
  }

  getMetrics() {
    const report = {
      emissions: this.metrics.emissionCounts,
      avgDurations: {},
    };

    for (const [key, durations] of Object.entries(this.metrics.listenerDurations)) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      report.avgDurations[key] = `${avg.toFixed(2)}ms`;
    }

    return report;
  }
}

// Usage
const emitter = new ProfiledEmitter();

emitter.on('process', () => {
  // Simulate slow work
  for (let i = 0; i < 1000000; i++) Math.sqrt(i);
});

emitter.on('process', () => {
  // Simulate fast work
  console.log('Fast listener');
});

for (let i = 0; i < 10; i++) {
  emitter.emit('process');
}

console.log(emitter.getMetrics());
// Shows: Number of emissions and average duration per listener
```

### Technique 4: Using Node.js Debugger

```javascript
// Start Node with inspector:
// node --inspect-brk your-file.js

const EventEmitter = require('events');
const emitter = new EventEmitter();

emitter.on('data', (value) => {
  debugger; // Breakpoint: Execution pauses here in Chrome DevTools
  console.log('Received:', value);
});

emitter.emit('data', 'test');

// In Chrome DevTools (chrome://inspect):
// - See call stack showing who emitted the event
// - Inspect 'value' parameter
// - Step through listener execution
```

### Debugging Checklist

- [ ] Add logging to track event emissions
- [ ] Log listener additions/removals
- [ ] Profile listener performance
- [ ] Use Chrome DevTools for step debugging
- [ ] Check listener counts periodically (memory leak detection)
- [ ] Trace event propagation through system
- [ ] Monitor event frequency (flooding detection)

---

## ✅ Part 6: Best Practices Checklist

### Memory Management

- [ ] **Always remove listeners** when components are destroyed or no longer need events
- [ ] **Use `.once()` for one-time events** instead of `.on()` + manual removal
- [ ] **Store listener references** in component instances so you can remove them later
- [ ] **Avoid anonymous functions** in production event listeners (can't remove them later)
- [ ] **Clear intervals/timeouts** that register or emit events
- [ ] **Null out references** in cleanup code to help garbage collection
- [ ] **Test cleanup code** to verify listeners are removed (check `listenerCount()`)

### Performance

- [ ] **Keep listeners fast** - offload heavy work to worker threads or async processing
- [ ] **Use streams** for large datasets instead of emitting each item individually
- [ ] **Limit listener count** per event (default 10 is usually fine)
- [ ] **Profile slow listeners** using timing or profiling tools
- [ ] **Consider async emission** with `process.nextTick()` for non-critical events
- [ ] **Batch emissions** if emitting many events in rapid succession

### Error Handling

- [ ] **Always handle 'error' events** - uncaught error events crash your app
- [ ] **Wrap listener code in try-catch** if it might throw
- [ ] **Emit 'error' events** when async operations fail
- [ ] **Test error paths** to ensure error events are emitted correctly

### Code Organization

- [ ] **Use classes that extend EventEmitter** for domain-specific event systems
- [ ] **Document events** in JSDoc comments (event names, data structure)
- [ ] **Use symbols for private events** to prevent external listening
- [ ] **Name events clearly** using verb-noun pattern (e.g., 'dataReceived', 'connectionClosed')
- [ ] **Emit events at the end** of operations, after state changes
- [ ] **Provide useful data** in events (don't require listeners to query for context)

### Testing

- [ ] **Test event emissions** (spy on events to verify they fire with correct data)
- [ ] **Test listener behavior** (verify listeners respond correctly to events)
- [ ] **Test cleanup** (verify `listenerCount()` returns 0 after destroy)
- [ ] **Test error events** (verify they're emitted in failure scenarios)
- [ ] **Use mocks** to isolate components in unit tests
- [ ] **Write integration tests** for complete event flows

### Production Monitoring

- [ ] **Log unexpected high listener counts** (may indicate memory leak)
- [ ] **Monitor event emission rates** (flooding can cause performance issues)
- [ ] **Track listener cleanup** (log warnings if cleanup fails)
- [ ] **Use APM tools** (Application Performance Monitoring) to detect memory leaks in production

---

## 🏋️ Practical Exercise: Build a Memory-Safe Event System

**Goal**: Create a robust event-driven notification system that properly manages memory and handles errors.

### Requirements

1. **NotificationBus class** that extends EventEmitter
2. **Subscriber registration** with automatic cleanup after a timeout
3. **Error handling** for failed notifications
4. **Memory leak prevention** through automatic listener removal
5. **Metrics tracking** (notification count, active subscribers)
6. **Comprehensive tests** to verify no memory leaks

### Starter Code

```javascript
const EventEmitter = require('events');

class NotificationBus extends EventEmitter {
  constructor() {
    super();
    this.subscribers = new Map();
    this.metrics = {
      notificationsSent: 0,
      activeSubscribers: 0,
    };
  }

  /**
   * Subscribe to notifications with automatic cleanup after timeout
   * @param {string} subscriberId - Unique identifier for subscriber
   * @param {Function} handler - Notification handler
   * @param {number} timeoutMs - Auto-unsubscribe after this duration (default: 60000)
   */
  subscribe(subscriberId, handler, timeoutMs = 60000) {
    // TODO: Implement
    // 1. Register handler for 'notification' event
    // 2. Store subscriber info in this.subscribers
    // 3. Set timeout to auto-unsubscribe
    // 4. Update metrics
  }

  /**
   * Unsubscribe from notifications
   * @param {string} subscriberId - Subscriber to remove
   */
  unsubscribe(subscriberId) {
    // TODO: Implement
    // 1. Remove listener
    // 2. Clear timeout
    // 3. Update metrics
  }

  /**
   * Send notification to all subscribers
   * @param {Object} notification - Notification data
   */
  notify(notification) {
    // TODO: Implement
    // 1. Emit 'notification' event
    // 2. Handle errors from listeners
    // 3. Update metrics
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
}

module.exports = NotificationBus;
```

### Solution

```javascript
const EventEmitter = require('events');

class NotificationBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Support many subscribers

    this.subscribers = new Map();
    this.metrics = {
      notificationsSent: 0,
      activeSubscribers: 0,
    };
  }

  subscribe(subscriberId, handler, timeoutMs = 60000) {
    // Create wrapper that handles errors
    const wrappedHandler = (notification) => {
      try {
        handler(notification);
      } catch (error) {
        console.error(`Error in subscriber ${subscriberId}:`, error);
        this.emit('error', error, subscriberId);
      }
    };

    // Register listener
    this.on('notification', wrappedHandler);

    // Set auto-cleanup timeout
    const timeoutId = setTimeout(() => {
      console.log(`Auto-unsubscribing ${subscriberId} after timeout`);
      this.unsubscribe(subscriberId);
    }, timeoutMs);

    // Store subscriber metadata
    this.subscribers.set(subscriberId, {
      handler: wrappedHandler,
      timeoutId,
      subscribedAt: new Date(),
    });

    this.metrics.activeSubscribers = this.subscribers.size;

    console.log(`Subscriber ${subscriberId} registered`);
  }

  unsubscribe(subscriberId) {
    const subscriber = this.subscribers.get(subscriberId);

    if (!subscriber) {
      console.warn(`Subscriber ${subscriberId} not found`);
      return;
    }

    // Remove listener
    this.removeListener('notification', subscriber.handler);

    // Clear timeout
    clearTimeout(subscriber.timeoutId);

    // Remove from registry
    this.subscribers.delete(subscriberId);

    this.metrics.activeSubscribers = this.subscribers.size;

    console.log(`Subscriber ${subscriberId} unsubscribed`);
  }

  notify(notification) {
    if (!notification || typeof notification !== 'object') {
      throw new Error('Notification must be an object');
    }

    this.metrics.notificationsSent++;

    const hasListeners = this.emit('notification', notification);

    if (!hasListeners) {
      console.warn('Notification sent but no active subscribers');
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  // Cleanup method for shutdown
  shutdown() {
    for (const subscriberId of this.subscribers.keys()) {
      this.unsubscribe(subscriberId);
    }

    this.removeAllListeners();
    console.log('NotificationBus shut down');
  }
}

module.exports = NotificationBus;
```

### Test Suite

```javascript
const NotificationBus = require('./NotificationBus');

describe('NotificationBus', () => {
  let bus;

  beforeEach(() => {
    bus = new NotificationBus();
  });

  afterEach(() => {
    bus.shutdown();
  });

  test('should register and notify subscribers', () => {
    const handler = jest.fn();

    bus.subscribe('user-1', handler);
    bus.notify({ message: 'Hello' });

    expect(handler).toHaveBeenCalledWith({ message: 'Hello' });
  });

  test('should auto-unsubscribe after timeout', async () => {
    const handler = jest.fn();

    bus.subscribe('user-1', handler, 100); // 100ms timeout

    // Initial state: 1 subscriber
    expect(bus.getMetrics().activeSubscribers).toBe(1);

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // After timeout: 0 subscribers
    expect(bus.getMetrics().activeSubscribers).toBe(0);

    // Notification not received
    bus.notify({ message: 'Test' });
    expect(handler).not.toHaveBeenCalled();
  });

  test('should handle errors in subscribers gracefully', () => {
    const errorHandler = jest.fn();
    const goodHandler = jest.fn();

    bus.on('error', errorHandler);

    bus.subscribe('bad-subscriber', () => {
      throw new Error('Handler failed');
    });

    bus.subscribe('good-subscriber', goodHandler);

    bus.notify({ message: 'Test' });

    // Error event emitted
    expect(errorHandler).toHaveBeenCalled();

    // Good handler still executed
    expect(goodHandler).toHaveBeenCalled();
  });

  test('should not leak memory with many subscribe/unsubscribe cycles', () => {
    for (let i = 0; i < 100; i++) {
      const handler = jest.fn();
      bus.subscribe(`user-${i}`, handler, 1000);
      bus.unsubscribe(`user-${i}`);
    }

    // After cleanup: 0 listeners (no leak)
    expect(bus.listenerCount('notification')).toBe(0);
    expect(bus.getMetrics().activeSubscribers).toBe(0);
  });

  test('should track metrics correctly', () => {
    bus.subscribe('user-1', jest.fn());
    bus.subscribe('user-2', jest.fn());

    expect(bus.getMetrics().activeSubscribers).toBe(2);

    bus.notify({ message: 'One' });
    bus.notify({ message: 'Two' });

    expect(bus.getMetrics().notificationsSent).toBe(2);

    bus.unsubscribe('user-1');

    expect(bus.getMetrics().activeSubscribers).toBe(1);
  });
});
```

### What You've Learned

1. **Memory-safe design**: Auto-cleanup with timeouts prevents forgotten subscriptions
2. **Error handling**: Wrapped listeners catch errors without crashing the bus
3. **Metrics tracking**: Monitoring provides visibility into system health
4. **Testability**: Comprehensive tests verify no leaks and correct behavior
5. **Production-ready patterns**: Shutdown method, error events, logging

**Stoic Reflection**: This exercise demonstrates the Stoic principle of *praemeditatio malorum*—anticipating problems (memory leaks, errors, timeouts) and building safeguards against them. By designing systems that automatically clean up after themselves, you embody the Stoic virtue of discipline and foresight.

---

## 🧘 Stoic Reflection: The Discipline of Release

### Impermanence in Code and Life

The Stoics taught that attachment to impermanent things causes suffering. Everything in the physical world—relationships, possessions, even our own bodies—is temporary. The wise person accepts this impermanence and practices *apatheia*: freedom from destructive attachment through rational understanding.

In event-driven programming, every listener you register is an attachment—a connection between two parts of your system. While the connection exists, it serves a purpose: it allows communication, enables reactions to changes, creates flexibility. But when that purpose is fulfilled—when the component is destroyed, when the feature is disabled, when the user navigates away—the attachment must be released.

Forgetting to release is attachment in its most literal form: holding onto something that no longer serves its purpose. The listener lingers in memory, a ghost of functionality that once was. It consumes resources, creates hidden complexity, and eventually leads to system degradation.

### The Practice of Letting Go

Marcus Aurelius wrote, "Loss is nothing else but change, and change is Nature's delight." In programming, releasing a listener is not a loss—it is a return to simplicity. The memory is freed, the reference is removed, the system becomes lighter.

Developing the habit of proper cleanup requires mindfulness—the same quality the Stoics cultivated in their daily practices. Each time you write `.on()`, you must remember to write the corresponding cleanup code. Each time you create a component, you must imagine its destruction and prepare for it.

This is not paranoia; it is wisdom. It is accepting that everything you create will eventually cease to be useful, and planning for that inevitability. It is the programming equivalent of Seneca's advice to meditate on impermanence: "Let us prepare our minds as if we'd come to the very end of life. Let us postpone nothing. Let us balance life's books each day."

### Freedom Through Discipline

The Stoics distinguished between things we control and things we don't. We cannot control whether our applications will run forever, whether users will use our features, whether components will live indefinitely. But we **can** control our cleanup code. We can ensure that every listener has a corresponding removal. We can use `.once()` where appropriate. We can test for leaks.

This discipline creates freedom. Systems that properly clean up after themselves are systems that can scale, that can run for days or months without restart, that respond predictably to user actions. Memory leaks are a form of technical debt—a burden carried forward, accumulating interest, eventually causing collapse.

By practicing disciplined cleanup, you honor the Stoic principle that virtue is its own reward. The reward is not praise or recognition—it is the knowledge that your systems are robust, that they will serve their purpose reliably, and that when their time comes, they will end cleanly.

### Reflection Questions

1. **Where in your codebase might listeners be forgotten?** Take a moment to review your components, modules, or classes. Do they all have cleanup methods? Are they being called?

2. **How do you test for memory leaks?** Do your tests verify that `listenerCount()` returns zero after cleanup? If not, add these tests—they are your safeguard.

3. **What attachments do you carry in your own life?** Just as code must let go of unused listeners, we must let go of habits, relationships, or possessions that no longer serve us. What can you release?

4. **How does practicing cleanup in code teach you about letting go in life?** The discipline of removing listeners is a meditation on impermanence. Each act of cleanup is a small reminder that everything is temporary.

---

## 📚 Summary and Key Takeaways

### Memory Management

1. **Memory leaks occur when listeners are not removed**, creating reference chains that prevent garbage collection
2. **Always remove listeners** in cleanup/destroy methods using `.removeListener()`
3. **Use `.once()` for one-time events** to avoid manual cleanup
4. **Test cleanup code** by verifying `listenerCount()` returns 0 after destroy

### Listener Limits

1. **Default limit is 10 listeners** per event; exceeding triggers a warning
2. **Warnings indicate potential memory leaks** in most cases—fix the root cause
3. **Increase limits only when necessary** for legitimate high-listener scenarios (pub/sub, plugins)
4. **Never set limit to 0 (unlimited)** unless you're absolutely certain you won't leak

### Performance

1. **Listeners execute synchronously** when events are emitted
2. **Keep listeners fast** to avoid blocking the event loop
3. **Use `process.nextTick()` or worker threads** for heavy async work
4. **Prefer streams over events** for processing large datasets

### Testing

1. **Use promise wrappers** to test asynchronous event flows
2. **Spy on emissions** to verify events fire with correct data
3. **Test cleanup** to prevent memory leaks
4. **Use mocks** to isolate components in unit tests

### Debugging

1. **Add logging** to track event emissions and listener additions/removals
2. **Profile listeners** to identify performance bottlenecks
3. **Use Node.js debugger** to step through event flows
4. **Monitor listener counts** in production to detect leaks early

### Best Practices

1. **Document events** in JSDoc comments
2. **Name events clearly** using verb-noun patterns
3. **Handle 'error' events** to prevent crashes
4. **Use symbols for private events**
5. **Emit events at the end** of operations, after state changes

### Stoic Wisdom

**"Loss is nothing else but change, and change is Nature's delight."** - Marcus Aurelius

Just as the Stoics practiced letting go of attachments to find freedom, we must practice removing listeners to prevent memory leaks. Every `.on()` creates a responsibility; every cleanup method fulfills that responsibility. Discipline in cleanup creates systems that are robust, scalable, and maintainable—just as discipline in life creates character that is resilient, adaptable, and wise.

---

## 🔗 References

**Technical Documentation**:
1. Node.js EventEmitter API: https://nodejs.org/docs/latest/api/events.html
2. Memory Management in V8: https://v8.dev/blog/trash-talk
3. Node.js Debugging Guide: https://nodejs.org/en/docs/guides/debugging-getting-started/
4. EventEmitter Best Practices: https://github.com/nodejs/node/blob/main/doc/guides/event-loop-timers-and-nexttick.md

**Testing Resources**:
5. Jest Testing Framework: https://jestjs.io/
6. Mocha Event Testing: https://mochajs.org/#asynchronous-code
7. Node.js Testing Best Practices: https://github.com/goldbergyoni/nodebestpractices#3-code-style-practices

**Stoic Philosophy**:
8. "Meditations" by Marcus Aurelius - Book 10, On impermanence and acceptance
9. "Letters from a Stoic" by Seneca - Letter 78, On the discipline of assent
10. "The Discourses" by Epictetus - Book 4, Chapter 1, On freedom through discipline

**Memory Leak Resources**:
11. "Node.js Memory Leak Detection" - https://nodejs.org/en/docs/guides/simple-profiling/
12. "Debugging Memory Leaks in Node.js" - https://www.alxolr.com/articles/how-to-find-memory-leaks-in-node-js
13. Chrome DevTools Memory Profiler: https://developer.chrome.com/docs/devtools/memory-problems/

---

## 🎓 What's Next?

**Congratulations!** You have completed the Custom EventEmitters minicourse. You now understand:

✅ The Observer pattern and how EventEmitter implements it  
✅ How to create custom event-driven architectures  
✅ Memory leak prevention through disciplined cleanup  
✅ Performance optimization for event-driven systems  
✅ Testing and debugging techniques for event flows  
✅ The Stoic practice of letting go, applied to programming  

**Preview: Next Minicourse**

In the next minicourse, you will explore **Streams: Processing Without Consuming** (Indigo - Overcoming Gluttony). You will learn how to process large datasets efficiently without loading everything into memory at once, embodying the Stoic principle that nature does not hurry yet accomplishes everything.

---

**END OF LESSON 3**

*Remember: Just as the Stoics taught that virtue comes from letting go of attachments, clean code comes from religiously removing listeners when they are no longer needed. Every `.on()` is a promise; every `.removeListener()` is a promise kept. Practice this discipline, and your systems will be as resilient as Stoic character—built to last, adaptable to change, and free from the burden of what is no longer useful.*

🟢 **Minicourse Complete!** You have mastered the art of event-driven programming with wisdom and discipline.