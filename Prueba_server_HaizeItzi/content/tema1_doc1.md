# Lesson 1: EventEmitter Fundamentals - The Art of Sharing Control

**Minicourse**: Event Emitters (Yellow - Overcoming Greed)  
**Lesson**: 1 of 3  
**Duration**: 30 minutes  
**Stoic Theme**: Sharing Control - Distributing power rather than hoarding it

---

## 🎯 Learning Objectives

By the end of this lesson, you will be able to:

1. **Explain** the Observer pattern and how EventEmitter implements it in Node.js
2. **Create** basic event emitters and register event listeners
3. **Emit** events with and without data payloads
4. **Differentiate** between synchronous and asynchronous event handling
5. **Recognize** when to use events versus callbacks or Promises
6. **Apply** the Stoic principle of sharing control through decoupled architecture

---

## 📖 Introduction: The Greed of Centralized Control

### The Problem of Tight Coupling

Imagine a kingdom where the king personally handles every decision. Citizens cannot act without his explicit command. Merchants wait for royal approval before every transaction. Farmers cannot plant without consulting the throne. This centralization creates bottlenecks, fragility, and exhaustion. The king becomes overwhelmed, decisions are delayed, and if the king falls ill, the entire kingdom freezes.

This is what happens in code when we centralize control. When one object must know about and directly call every other object that needs to respond to its actions, we create tight coupling. The central object becomes a bottleneck, changes ripple through the system, and testing becomes nightmarish because everything depends on everything else.

**Epictetus** taught:

> *"Freedom is the only worthy goal in life. It is won by disregarding things that lie beyond our control."*

In software architecture, freedom comes from disregarding how others will use your events. An event emitter fires events without knowing or caring who listens. Listeners register themselves without the emitter needing to know about them. This is not irresponsibility—it is liberation through trust. Each component is free to respond to events in its own way, and the emitter is free from managing that complexity.

### The Observer Pattern: Distributed Wisdom

The Observer pattern, implemented by Node.js's EventEmitter class, embodies the Stoic principle of sharing control. Instead of one object commanding others directly, an object announces what happens and trusts that interested parties will respond appropriately. This is like a town crier announcing news in the square—they don't need to know who is listening or what they will do with the information. They simply announce, and those who care can act.

This pattern transforms greed (hoarding control, demanding to know everything) into generosity (sharing information, trusting others to respond). The yellow color of this lesson represents the warmth of shared sunlight—energy distributed rather than concentrated.

---

## 📚 Core Content

### 1. What is an EventEmitter?

An EventEmitter is a Node.js built-in class that implements the Observer pattern. It allows objects to emit named events and allows other objects to listen for those events. When an event is emitted, all registered listeners for that event are called synchronously in the order they were registered.

Think of an EventEmitter like a radio station. The station broadcasts programs without knowing who is listening. Listeners tune in to frequencies they care about. If no one is listening to a particular broadcast, that is fine—the station still broadcasts. If a thousand people are listening, that is also fine—each receives the same broadcast independently.

```javascript
const EventEmitter = require('events');

// Create an emitter instance
const emitter = new EventEmitter();

// Register a listener (subscribe to an event)
emitter.on('greet', () => {
  console.log('Hello, World!');
});

// Emit the event (broadcast)
emitter.emit('greet');
// Output: Hello, World!
```

This simple example demonstrates the core pattern. The code that emits the event does not need to know what the listener does. The listener does not need to know where the event comes from. They are decoupled, yet they work together harmoniously.

### 2. Registering Event Listeners

The most common method for registering listeners is the `.on()` method, which stands for "on this event, do this action." Each call to `.on()` registers another listener, and you can have as many listeners as you want for the same event. This is the generosity of the pattern—one announcement can serve many recipients.

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Multiple listeners for the same event
emitter.on('userLogin', () => {
  console.log('Logger: User logged in');
});

emitter.on('userLogin', () => {
  console.log('Analytics: Track login event');
});

emitter.on('userLogin', () => {
  console.log('Notification: Send welcome email');
});

// Emit the event once
emitter.emit('userLogin');

// Output:
// Logger: User logged in
// Analytics: Track login event
// Notification: Send welcome email
```

Notice how one event triggers three independent actions. The code that emits `userLogin` does not need to know about logging, analytics, or notifications. Each system registers its interest independently. This is sharing control—the emitter controls when the event occurs, but the listeners control how they respond.

#### The once() Method

Sometimes you want a listener to respond to an event only once, then automatically unregister. This is common for initialization tasks or one-time responses. The `.once()` method provides this functionality elegantly.

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// This listener will only fire once
emitter.once('serverReady', () => {
  console.log('Server is ready! Starting to accept connections.');
});

emitter.emit('serverReady');
// Output: Server is ready! Starting to accept connections.

emitter.emit('serverReady');
// No output - listener already ran and was removed

emitter.emit('serverReady');
// Still no output
```

The `.once()` method prevents memory leaks from listeners that should only run once but were registered with `.on()`. It embodies the Stoic principle of doing what is needed, then moving on, rather than clinging to responsibilities beyond their time.

### 3. Emitting Events with Data

Events become more powerful when you can pass data to listeners. The `.emit()` method accepts additional arguments after the event name, and these arguments are passed to all listeners. This is how the emitter shares context without tightly coupling to the listeners.

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

emitter.on('userLogin', (username, timestamp) => {
  console.log(`User ${username} logged in at ${timestamp}`);
});

emitter.on('userLogin', (username) => {
  console.log(`Welcome back, ${username}!`);
});

// Emit with data
const loginTime = new Date().toISOString();
emitter.emit('userLogin', 'alice', loginTime);

// Output:
// User alice logged in at 2025-10-29T15:30:00.000Z
// Welcome back, alice!
```

Notice how the second listener only uses one parameter even though two were provided. Each listener can use as much or as little of the data as it needs. This flexibility is another form of generosity—provide what might be useful and trust listeners to take what they need.

#### Error Events

By convention, EventEmitters should emit an 'error' event when something goes wrong. If an 'error' event is emitted and no listener is registered for it, Node.js will throw an exception and potentially crash the process. This forces you to handle errors deliberately, embodying the Stoic principle of facing obstacles directly rather than ignoring them.

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Without an error listener, this would crash the process
emitter.on('error', (error) => {
  console.error('An error occurred:', error.message);
});

// Emit an error event
emitter.emit('error', new Error('Database connection failed'));
// Output: An error occurred: Database connection failed
```

Always register an 'error' listener for any EventEmitter you create. This is not optional in production code—it is essential for resilience. As we learned in the async programming minicourse, errors will happen, and we must love them enough to handle them gracefully.

### 4. Synchronous Event Emission

This is a subtle but important point that surprises many developers. When you emit an event, all listeners are called **synchronously** in the order they were registered, before the `.emit()` call returns. This is different from setTimeout or Promises, which are asynchronous.

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

emitter.on('sync-event', () => {
  console.log('Listener 1');
});

emitter.on('sync-event', () => {
  console.log('Listener 2');
});

console.log('Before emit');
emitter.emit('sync-event');
console.log('After emit');

// Output:
// Before emit
// Listener 1
// Listener 2
// After emit
```

All listeners execute before "After emit" logs. This synchronous nature has important implications. If a listener performs a time-consuming operation, it blocks the event loop until it completes. If a listener throws an error and you do not catch it, it propagates up to the code that called `.emit()`. Understanding this timing is crucial for correct event-driven programming.

#### Making Listeners Asynchronous

If you need listeners to execute asynchronously, you must explicitly make them async. This is common when listeners need to perform I/O operations or other asynchronous work.

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Synchronous listener (blocks)
emitter.on('data', (data) => {
  console.log('Processing:', data);
  // Imagine expensive synchronous work here
});

// Asynchronous listener (doesn't block)
emitter.on('data', async (data) => {
  console.log('Async processing started:', data);
  await someAsyncOperation(data);
  console.log('Async processing complete:', data);
});

console.log('Before emit');
emitter.emit('data', 'test');
console.log('After emit');

// Output:
// Before emit
// Processing: test
// Async processing started: test
// After emit
// (later) Async processing complete: test
```

The async listener starts its work synchronously but returns immediately, allowing execution to continue. The await happens in the background. This pattern allows you to combine the immediate notification of synchronous events with the non-blocking nature of asynchronous operations.

### 5. Removing Event Listeners

Just as important as registering listeners is removing them when they are no longer needed. Failing to remove listeners causes memory leaks, as we will explore deeply in lesson three. The `.removeListener()` method (also available as `.off()`) removes a specific listener function.

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Must store a reference to remove later
function handleData(data) {
  console.log('Received:', data);
}

emitter.on('data', handleData);
emitter.emit('data', 'first');
// Output: Received: first

// Remove the listener
emitter.removeListener('data', handleData);
// Or use the alias: emitter.off('data', handleData);

emitter.emit('data', 'second');
// No output - listener was removed
```

Notice that you must have a reference to the exact function you want to remove. This is why anonymous arrow functions can be problematic if you need to remove them later. You cannot remove what you cannot reference. This teaches a lesson about clarity and intentionality—name your listeners if you might need to manage their lifecycle.

#### Removing All Listeners

Sometimes you want to remove all listeners for a particular event, or all listeners for all events. The `.removeAllListeners()` method provides this nuclear option.

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

emitter.on('data', () => console.log('Listener 1'));
emitter.on('data', () => console.log('Listener 2'));
emitter.on('error', () => console.log('Error handler'));

// Remove all 'data' listeners
emitter.removeAllListeners('data');

emitter.emit('data');
// No output - all 'data' listeners removed

emitter.emit('error');
// Output: Error handler (not removed)

// Remove ALL listeners for ALL events
emitter.removeAllListeners();

emitter.emit('error');
// No output - all listeners removed
```

Use this with caution. In most cases, you should remove specific listeners that you know you registered. Mass removal is typically only appropriate during cleanup or teardown of an emitter. This is like the Stoic practice of letting go—sometimes you must release all attachments at once, but usually, you release specific attachments mindfully.

### 6. Inspecting EventEmitters

EventEmitters provide methods to introspect their current state. This is useful for debugging and understanding how many listeners are registered for events.

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

emitter.on('data', () => {});
emitter.on('data', () => {});
emitter.on('error', () => {});

// Get all event names
const eventNames = emitter.eventNames();
console.log('Events:', eventNames);
// Output: Events: [ 'data', 'error' ]

// Count listeners for an event
const dataListeners = emitter.listenerCount('data');
console.log('Data listeners:', dataListeners);
// Output: Data listeners: 2

// Get the actual listener functions
const listeners = emitter.listeners('data');
console.log('Number of functions:', listeners.length);
// Output: Number of functions: 2
```

These introspection methods are particularly valuable when debugging memory leaks or unexpected behavior. If you suspect an event has too many listeners, you can check. If listeners are not being cleaned up, you can detect it. This is applying the Stoic principle of self-examination to your code—know thyself, including how many listeners you have registered.

### 7. When to Use Events vs Callbacks vs Promises

Understanding when to use each asynchronous pattern is a mark of mastery. Here is a decision framework based on the nature of the problem you are solving.

**Use Events When:**
- Multiple independent parties need to know about the same occurrence
- You want loose coupling between components
- The same event might occur multiple times over the lifetime of an object
- You do not know at design time how many listeners there will be
- Listeners might come and go dynamically

**Use Callbacks When:**
- There is exactly one recipient for the result
- The operation completes only once
- You are working with older APIs that expect callbacks
- The pattern is simple and linear

**Use Promises/Async-Await When:**
- You need to chain asynchronous operations
- Error handling needs to be centralized
- The operation completes only once
- You want cleaner, more readable async code

**Example Scenarios:**

```javascript
// EVENT: Server lifecycle - many listeners, ongoing events
const server = require('http').createServer();

server.on('request', handleRequest);     // Handle incoming requests
server.on('connection', logConnection);  // Log connections
server.on('error', handleError);         // Handle errors
server.on('close', cleanup);             // Cleanup on shutdown

// CALLBACK: File read - single recipient, one-time result
fs.readFile('data.txt', (error, data) => {
  if (error) handleError(error);
  else processData(data);
});

// PROMISE: Database query - single recipient, chainable, better error handling
db.query('SELECT * FROM users')
  .then(processResults)
  .then(sendResponse)
  .catch(handleError);

// ASYNC/AWAIT: Complex flow - readable, sequential appearance
async function getUserData(userId) {
  try {
    const user = await db.findUser(userId);
    const posts = await db.findPosts(user.id);
    return { user, posts };
  } catch (error) {
    handleError(error);
  }
}
```

The key insight is that events are about **broadcasting** to potentially many recipients over time, while callbacks and Promises are about **returning** a result to one recipient one time. Choose the pattern that matches your communication model.

---

## 💻 Practical Exercises

### Exercise 1: Build a Simple Logger

Create an event-based logging system where different components can listen for log events.

**Requirements:**
- Support different log levels (info, warn, error)
- Allow multiple loggers to listen to the same events
- Each logger can format messages differently

**Starter Code:**

```javascript
const EventEmitter = require('events');

class Logger extends EventEmitter {
  info(message) {
    // TODO: Emit 'log' event with level 'info' and message
  }
  
  warn(message) {
    // TODO: Emit 'log' event with level 'warn' and message
  }
  
  error(message) {
    // TODO: Emit 'log' event with level 'error' and message
  }
}

// Create logger instance
const logger = new Logger();

// TODO: Add listener for console logging
// TODO: Add listener for file logging (simulate)
// TODO: Add listener that only logs errors

// Test it
logger.info('Application started');
logger.warn('Low memory');
logger.error('Database connection failed');
```

**Solution:**

```javascript
const EventEmitter = require('events');

class Logger extends EventEmitter {
  info(message) {
    this.emit('log', 'INFO', message);
  }
  
  warn(message) {
    this.emit('log', 'WARN', message);
  }
  
  error(message) {
    this.emit('log', 'ERROR', message);
  }
}

// Create logger instance
const logger = new Logger();

// Console logger - logs everything with timestamps
logger.on('log', (level, message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
});

// File logger - simulates writing to file
logger.on('log', (level, message) => {
  // In real code, you would write to a file
  console.log(`FILE: Writing to log.txt: ${level} - ${message}`);
});

// Error-only logger - only listens to errors
logger.on('log', (level, message) => {
  if (level === 'ERROR') {
    console.log(`ALERT: Critical error occurred: ${message}`);
    // In real code, might send to error tracking service
  }
});

// Test it
logger.info('Application started');
logger.warn('Low memory');
logger.error('Database connection failed');

// Output:
// [2025-10-29T15:30:00.000Z] [INFO] Application started
// FILE: Writing to log.txt: INFO - Application started
// [2025-10-29T15:30:00.000Z] [WARN] Low memory
// FILE: Writing to log.txt: WARN - Low memory
// [2025-10-29T15:30:00.000Z] [ERROR] Database connection failed
// FILE: Writing to log.txt: ERROR - Database connection failed
// ALERT: Critical error occurred: Database connection failed
```

This exercise demonstrates how events allow multiple independent systems (console logging, file logging, error alerting) to respond to the same occurrence without knowing about each other. This is sharing control—the logger announces what happened, and each system responds in its own way.

### Exercise 2: User Registration System

Create a user registration system that uses events to trigger various actions when a user signs up.

**Requirements:**
- When a user registers, emit a 'userRegistered' event
- Send a welcome email (simulated)
- Create a user profile
- Log the registration
- Track analytics

**Starter Code:**

```javascript
const EventEmitter = require('events');

class UserService extends EventEmitter {
  registerUser(username, email) {
    // TODO: Create user object
    // TODO: Emit 'userRegistered' event with user data
    // TODO: Return user object
  }
}

const userService = new UserService();

// TODO: Add listeners for:
// - Sending welcome email
// - Creating user profile
// - Logging registration
// - Tracking analytics

// Test it
const newUser = userService.registerUser('alice', 'alice@example.com');
console.log('Registration complete:', newUser);
```

**Solution:**

```javascript
const EventEmitter = require('events');

class UserService extends EventEmitter {
  registerUser(username, email) {
    const user = {
      id: Date.now(),
      username,
      email,
      createdAt: new Date()
    };
    
    // Emit event with user data
    this.emit('userRegistered', user);
    
    return user;
  }
}

const userService = new UserService();

// Email service listens for registrations
userService.on('userRegistered', (user) => {
  console.log(`📧 Sending welcome email to ${user.email}`);
  // Simulate sending email
  setTimeout(() => {
    console.log(`   ✓ Email sent to ${user.email}`);
  }, 100);
});

// Profile service creates initial profile
userService.on('userRegistered', (user) => {
  console.log(`👤 Creating profile for ${user.username}`);
  const profile = {
    userId: user.id,
    bio: '',
    avatar: 'default.png'
  };
  console.log('   ✓ Profile created:', profile);
});

// Logger records the registration
userService.on('userRegistered', (user) => {
  const logEntry = `[${user.createdAt.toISOString()}] New user registered: ${user.username} (${user.email})`;
  console.log(`📝 ${logEntry}`);
});

// Analytics tracks the event
userService.on('userRegistered', (user) => {
  console.log(`📊 Analytics: User registration event tracked`);
  // In real code, would send to analytics service
});

// Test it
console.log('Starting registration...\n');
const newUser = userService.registerUser('alice', 'alice@example.com');
console.log('\n✅ Registration complete:', newUser);

// Output:
// Starting registration...
//
// 📧 Sending welcome email to alice@example.com
// 👤 Creating profile for alice
//    ✓ Profile created: { userId: 1698595200000, bio: '', avatar: 'default.png' }
// 📝 [2025-10-29T15:30:00.000Z] New user registered: alice (alice@example.com)
// 📊 Analytics: User registration event tracked
//
// ✅ Registration complete: { id: 1698595200000, username: 'alice', email: 'alice@example.com', createdAt: 2025-10-29T15:30:00.000Z }
//    ✓ Email sent to alice@example.com
```

This exercise demonstrates the power of decoupled architecture. The `UserService` does not need to know about emails, profiles, logging, or analytics. Each system registers its interest independently. Adding a new feature (like a notification service) requires only adding a new listener, not modifying the registration code. This is generosity in architecture—providing opportunities for others to participate without controlling how they participate.

### Exercise 3: Event Order Investigation

Investigate and understand the synchronous execution order of event listeners.

**Challenge:**

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

emitter.on('test', () => {
  console.log('Listener 1');
  // What if we emit another event here?
  emitter.emit('nested');
});

emitter.on('test', () => {
  console.log('Listener 2');
});

emitter.on('nested', () => {
  console.log('Nested listener');
});

console.log('Before emit');
emitter.emit('test');
console.log('After emit');

// Predict the output, then run it to verify
```

**Solution and Explanation:**

```
Before emit
Listener 1
Nested listener
Listener 2
After emit
```

The execution is synchronous and follows this order: "Before emit" logs first, then Listener 1 executes. When Listener 1 emits the 'nested' event, execution immediately jumps to the nested listener (synchronously), which logs "Nested listener". Only after the nested listener completes does execution return to continue with Listener 2. Finally, after all listeners for 'test' complete, "After emit" logs.

This demonstrates that event emission is synchronous and can be nested. If Listener 1 performs a long operation or emits many nested events, it blocks the completion of the other listeners. This is why async listeners (using async/await or setImmediate) are important for I/O operations—they prevent blocking.

---

## 🤔 Philosophical Reflection: Sharing Control as Liberation

### The Greed of Tight Coupling

In traditional procedural or object-oriented programming without events, objects often maintain direct references to all objects that depend on them. When something happens, the central object must explicitly call methods on each dependent object. This is control, but it is burdensome control. The central object becomes responsible for knowing about, managing, and calling all its dependents. This is greed—accumulating responsibility and control in one place.

Consider a simple example without events:

```javascript
class UserService {
  constructor() {
    this.emailService = new EmailService();
    this.profileService = new ProfileService();
    this.logger = new Logger();
    this.analytics = new Analytics();
  }
  
  registerUser(username, email) {
    const user = { username, email };
    
    // UserService must know about and manage all these services
    this.emailService.sendWelcomeEmail(user);
    this.profileService.createProfile(user);
    this.logger.logRegistration(user);
    this.analytics.trackRegistration(user);
    
    return user;
  }
}
```

This code works, but notice what `UserService` must do. It must know about four other services, instantiate them, and explicitly call methods on each one. If we want to add a notification service, we must modify `UserService`. If we want to remove analytics in production but keep it in development, we must modify `UserService`. The class is tightly coupled to its dependencies and carries the burden of managing them all.

### The Liberation of Events

Now consider the event-based version we built in Exercise 2. The `UserService` knows nothing about emails, profiles, logging, or analytics. It simply announces "a user registered" and provides the data. Each service independently registers its interest. Adding or removing services requires zero changes to `UserService`. This is sharing control—distributing responsibility rather than hoarding it.

**Marcus Aurelius** reflected on letting go of control:

> *"You always own the option of having no opinion. There is never any need to get worked up or to trouble your soul about things you can't control."*

The event emitter does not get worked up about who is listening or what they will do. It simply announces events and lets listeners control their own responses. This is not irresponsibility—it is appropriate responsibility. The emitter is responsible for knowing when events occur and providing accurate data. Listeners are responsible for deciding how to respond. Each has their domain of control, and neither invades the other's.

### Self-Assessment Questions

Reflect on how you structure control in your own code:

1. **Recognition**: Look at a class you have written recently. Does it directly call methods on many other objects, or does it emit events that others can listen to?

2. **Coupling**: If you wanted to add a new feature that responds to something happening in your system, would you need to modify existing code, or could you add a listener?

3. **Testing**: When you test a component, do you need to mock or stub many dependencies because it directly depends on them, or can you test it in isolation because it just emits events?

4. **Greed**: Are you trying to control exactly what happens in response to your events, or are you trusting listeners to respond appropriately in their own way?

5. **Freedom**: Does your code feel burdened by managing many relationships, or does it feel light because it broadcasts events and trusts others?

These questions are not about right or wrong. They are about awareness. Sometimes tight coupling is appropriate, especially for small, cohesive systems. But when systems grow, events provide a path to scaling complexity without scaling coupling.

---

## 📝 Summary & Next Steps

### Key Takeaways Checklist

After completing this lesson, you should understand:

- [ ] **EventEmitter** is Node.js's implementation of the Observer pattern
- [ ] **The Observer pattern** decouples event emitters from event listeners
- [ ] **Multiple listeners** can respond to the same event independently
- [ ] **Event emission is synchronous** by default—listeners execute immediately in order
- [ ] **The .on() method** registers persistent listeners
- [ ] **The .once() method** registers one-time listeners that auto-remove
- [ ] **Events can carry data** passed as additional arguments to .emit()
- [ ] **Error events** are special—unhandled error events crash the process
- [ ] **Listener cleanup** prevents memory leaks using .removeListener() or .off()
- [ ] **Events vs callbacks vs Promises** each suit different communication patterns
- [ ] **Sharing control** through events creates loosely coupled, scalable architectures

### What We've Learned

In this first lesson on Event Emitters, you have learned the fundamentals of event-driven programming in Node.js. You have seen how the EventEmitter class provides a simple, powerful API for implementing the Observer pattern. You understand that events are synchronous by default but can be made async when needed. You know how to register, emit, and remove listeners, and you understand when events are the appropriate choice versus callbacks or Promises.

Most importantly, you have begun to see how events embody the Stoic principle of sharing control. An event emitter does not hoard responsibility or try to control what listeners do. It announces what happens and trusts listeners to respond appropriately. This decoupling creates systems that are easier to extend, test, and maintain.

### Preview: Lesson 2 - Custom EventEmitters & Patterns

In the next lesson, we will deepen your mastery by exploring:

- **Creating custom EventEmitter classes** by extending the EventEmitter class
- **Common event patterns** like domain events, command events, and state change events
- **Event naming conventions** that make your code self-documenting
- **Chaining and composition** of event emitters
- **Real-world patterns** from Node.js core and popular libraries

**Stoic Connection**: We will explore how building custom emitters is like training students—you provide structure and announce milestones, but each student grows in their own way. Control through guidance, not domination.

### Practice Before Next Lesson

To reinforce your understanding:

1. **Refactor existing code**: Find a class with many dependencies and refactor it to use events
2. **Build a mini-project**: Create an event-driven task queue or notification system
3. **Read Node.js source**: Look at how core modules like `http` and `stream` use EventEmitter
4. **Experiment with timing**: Create listeners that take different amounts of time and observe synchronous blocking

---

## 🔗 References

**Technical Documentation**:
1. Node.js EventEmitter Documentation: https://nodejs.org/docs/latest/api/events.html
2. Observer Pattern (Gang of Four): Design Patterns book
3. Node.js Streams (EventEmitter in action): https://nodejs.org/docs/latest/api/stream.html

**Stoic Philosophy**:
4. "Meditations" by Marcus Aurelius - Book 7, on letting go of control
5. "The Enchiridion" by Epictetus - Section 1, on focusing only on what is in your control
6. "On the Shortness of Life" by Seneca - On not wasting energy controlling the uncontrollable

---

**END OF LESSON 1**

*Remember: True power comes not from controlling everything, but from controlling your domain well and trusting others to control theirs. Event emitters embody this wisdom—announce what happens, provide the data, and let listeners respond in their own way.*

🟡 **Next**: Lesson 2 - Custom EventEmitters & Patterns (30 minutes)
