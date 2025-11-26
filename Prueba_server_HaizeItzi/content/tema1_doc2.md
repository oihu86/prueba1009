# Lesson 2: Custom EventEmitters & Patterns - Building Event-Driven Systems

**Minicourse**: Event Emitters (Yellow - Overcoming Greed)  
**Lesson**: 2 of 3  
**Duration**: 30 minutes  
**Stoic Theme**: Training Others - Providing structure while allowing independence

---

## 🎯 Learning Objectives

By the end of this lesson, you will be able to:

1. **Create** custom classes that extend EventEmitter to build domain-specific event systems
2. **Implement** common event patterns like domain events, state change events, and lifecycle events
3. **Apply** event naming conventions that make your code self-documenting and predictable
4. **Compose** multiple event emitters to build complex event-driven architectures
5. **Recognize** when to inherit from EventEmitter versus when to compose it
6. **Practice** the Stoic art of providing structure while trusting others to grow independently

---

## 📖 Introduction: The Teacher's Paradox

### Structure Without Domination

A wise teacher provides structure, resources, and guidance, then trusts students to learn in their own way. The teacher announces milestones, demonstrates techniques, and creates environments for growth, but does not control how each student internalizes the material. Some students excel through practice, others through reading, still others through discussion. The teacher cannot and should not dictate the path—only illuminate possibilities.

This is the paradox of teaching: the more you try to control exactly how students learn, the less they actually learn. True education comes from providing structure that enables independence, not from imposing rigid scripts that demand conformity. The best teachers make themselves eventually unnecessary, having equipped students to continue learning without supervision.

Custom EventEmitters embody this teaching philosophy in code. When you create a class that extends EventEmitter, you are creating a structure that announces what happens in your domain (like a teacher announcing lessons), but you do not control how others respond to those announcements (like students learning in their own ways). You provide the events, the data, the timing, but you trust listeners to do what is right for them.

**Seneca** wrote about the proper relationship between guide and student:

> *"Cling to someone else's wisdom as your own. You can learn from the living and the dead, but you must make the knowledge yours through practice."*

When you build custom emitters, you are providing wisdom (events that announce important occurrences) that others can cling to and make their own through their listener implementations. You are teaching through your API, not commanding through tight coupling.

---

## 📚 Core Content

### 1. Extending EventEmitter: Creating Domain-Specific Emitters

The most powerful use of EventEmitter is creating your own classes that inherit its capabilities. This lets you build domain objects that naturally emit events as part of their behavior, making them observable without tight coupling.

The pattern is simple: extend the EventEmitter class, call `super()` in your constructor, and emit events at appropriate moments in your methods. Here is a complete example of a Task class that emits events throughout a task's lifecycle.

```javascript
const EventEmitter = require('events');

class Task extends EventEmitter {
  constructor(title, description) {
    super(); // CRITICAL: Must call super() to initialize EventEmitter
    
    this.id = Date.now();
    this.title = title;
    this.description = description;
    this.status = 'pending';
    this.createdAt = new Date();
  }
  
  start() {
    if (this.status !== 'pending') {
      this.emit('error', new Error('Task already started or completed'));
      return;
    }
    
    this.status = 'in-progress';
    this.startedAt = new Date();
    
    // Emit event with task data
    this.emit('started', {
      id: this.id,
      title: this.title,
      startedAt: this.startedAt
    });
  }
  
  complete() {
    if (this.status !== 'in-progress') {
      this.emit('error', new Error('Task must be started before completing'));
      return;
    }
    
    this.status = 'completed';
    this.completedAt = new Date();
    
    const duration = this.completedAt - this.startedAt;
    
    this.emit('completed', {
      id: this.id,
      title: this.title,
      duration: duration
    });
  }
  
  fail(reason) {
    this.status = 'failed';
    this.failedAt = new Date();
    
    this.emit('failed', {
      id: this.id,
      title: this.title,
      reason: reason
    });
  }
}

// Using the custom emitter
const task = new Task('Write documentation', 'Create user guide');

// Register listeners
task.on('started', (data) => {
  console.log(`✓ Task started: ${data.title}`);
});

task.on('completed', (data) => {
  console.log(`✓ Task completed: ${data.title} (took ${data.duration}ms)`);
});

task.on('failed', (data) => {
  console.log(`✗ Task failed: ${data.title} - ${data.reason}`);
});

task.on('error', (error) => {
  console.error('Task error:', error.message);
});

// Trigger lifecycle
task.start();
setTimeout(() => {
  task.complete();
}, 1000);

// Output:
// ✓ Task started: Write documentation
// (after 1 second)
// ✓ Task completed: Write documentation (took 1000ms)
```

This pattern is powerful because the Task class focuses on its core responsibility (managing task state and lifecycle) while broadcasting events that allow other systems to respond. Logging listens to the events. Analytics might listen to the events. A UI might listen to update progress bars. The Task itself does not need to know about any of these concerns.

Notice the call to `super()` in the constructor. This is absolutely required when extending any class in JavaScript, including EventEmitter. Forgetting this will cause runtime errors because the EventEmitter functionality will not be initialized. Think of `super()` as asking the parent class to set up its part of the house before you add your own furniture.

### 2. Event Naming Conventions: Self-Documenting APIs

The names you choose for events are crucial for creating intuitive, maintainable event-driven systems. Good event names make your code self-documenting, reducing the need for extensive documentation and making the system easier to understand and extend. Here are the conventions that have emerged from years of Node.js development.

**Use Verb Tense to Indicate Timing**

Past tense indicates something has already happened. These are notification events that announce completed actions. Listeners can respond but cannot prevent the action because it has already occurred.

```javascript
// Past tense events - action already completed
emitter.emit('started');      // The task started
emitter.emit('completed');    // The task completed
emitter.emit('userLoggedIn'); // User has logged in
emitter.emit('dataReceived'); // Data has been received
```

Present tense or infinitive indicates something is about to happen or should happen. These can be used for command events or for allowing listeners to intercede before an action completes.

```javascript
// Present/infinitive events - action about to happen or being requested
emitter.emit('start');        // Request to start
emitter.emit('complete');     // Request to complete
emitter.emit('beforeSave');   // About to save (listeners can modify)
emitter.emit('validate');     // Request validation
```

The choice between past and present tense has philosophical implications. Past tense embodies acceptance (what happened, happened) while present tense embodies intervention (we can still influence what is about to happen). Choose based on whether you want listeners to observe or participate.

**Prefix Events by Category**

For complex systems with many events, prefixing by category makes the event space more navigable and prevents naming collisions.

```javascript
// Lifecycle events
emitter.emit('task:created');
emitter.emit('task:started');
emitter.emit('task:completed');

// Error events
emitter.emit('task:failed');
emitter.emit('task:error');

// State change events
emitter.emit('task:stateChanged', oldState, newState);

// Data events
emitter.emit('data:received');
emitter.emit('data:validated');
emitter.emit('data:processed');
```

The colon notation (or you might see dot notation in some systems) creates a namespace. This makes it immediately clear what domain an event belongs to and what kind of event it is. When you see `task:completed`, you immediately understand this is a lifecycle event in the task domain.

**Use Specific, Descriptive Names**

Generic names like `update` or `change` or `event` are rarely helpful. Specific names like `userProfileUpdated` or `passwordChanged` or `connectionEstablished` tell listeners exactly what happened. This specificity is a form of generosity—you are making it easy for future developers (including future you) to understand the system.

```javascript
// Vague (avoid)
emitter.emit('update');
emitter.emit('change');
emitter.emit('done');

// Specific (prefer)
emitter.emit('profileUpdated');
emitter.emit('passwordChanged');
emitter.emit('processingComplete');
```

### 3. Common Event Patterns

Certain patterns appear repeatedly in event-driven systems. Recognizing and applying these patterns makes your code more predictable and maintainable because other developers will recognize the patterns and immediately understand the architecture.

#### Pattern 1: Lifecycle Events

Objects with a lifecycle (created, started, active, paused, stopped, destroyed) should emit events at each transition. This is like announcing chapters in a story—listeners can follow along and respond at appropriate moments.

```javascript
const EventEmitter = require('events');

class Server extends EventEmitter {
  constructor(port) {
    super();
    this.port = port;
    this.state = 'initialized';
  }
  
  start() {
    this.emit('starting');
    
    // Simulate server startup
    this.state = 'starting';
    setTimeout(() => {
      this.state = 'running';
      this.emit('started', { port: this.port });
      this.emit('ready');
    }, 100);
  }
  
  stop() {
    this.emit('stopping');
    
    this.state = 'stopping';
    setTimeout(() => {
      this.state = 'stopped';
      this.emit('stopped');
    }, 100);
  }
}

const server = new Server(3000);

server.on('starting', () => console.log('Server is starting...'));
server.on('started', (info) => console.log(`Server started on port ${info.port}`));
server.on('ready', () => console.log('Server is ready to accept connections'));
server.on('stopping', () => console.log('Server is stopping...'));
server.on('stopped', () => console.log('Server stopped'));

server.start();
setTimeout(() => server.stop(), 2000);
```

Lifecycle events allow different systems to hook into different stages. The monitoring system might care about `started` and `stopped`. The load balancer might care about `ready` and `stopping`. The logging system might care about everything. Each can listen to what matters to them.

#### Pattern 2: State Change Events

When objects have state that changes over time, emit events before and after state changes. This allows listeners to observe state transitions, validate changes, or even prevent changes by throwing errors in `before` events.

```javascript
const EventEmitter = require('events');

class StateMachine extends EventEmitter {
  constructor(initialState) {
    super();
    this.state = initialState;
  }
  
  transition(newState) {
    const oldState = this.state;
    
    // Emit before event - listeners can validate or modify
    this.emit('beforeTransition', oldState, newState);
    
    // Make the change
    this.state = newState;
    
    // Emit after events - listeners can react
    this.emit('afterTransition', oldState, newState);
    this.emit('stateChanged', newState, oldState);
  }
  
  getState() {
    return this.state;
  }
}

const machine = new StateMachine('idle');

// Validate transitions
machine.on('beforeTransition', (oldState, newState) => {
  console.log(`Validating transition from ${oldState} to ${newState}`);
  
  // Invalid transitions could throw here
  const validTransitions = {
    'idle': ['working', 'paused'],
    'working': ['idle', 'paused'],
    'paused': ['working', 'idle']
  };
  
  if (!validTransitions[oldState].includes(newState)) {
    throw new Error(`Invalid transition from ${oldState} to ${newState}`);
  }
});

// Log all state changes
machine.on('stateChanged', (newState, oldState) => {
  console.log(`State changed: ${oldState} → ${newState}`);
});

machine.transition('working');
machine.transition('paused');
machine.transition('idle');

// This would throw an error:
// machine.transition('invalid');
```

The before and after pattern is particularly powerful because it separates validation (before) from reaction (after). Validators run before the change and can prevent it. Reactors run after the change and assume it was valid. This separation of concerns is another form of sharing control—validators control whether changes happen, reactors control what happens in response.

#### Pattern 3: Data Flow Events

When data flows through your system (received, validated, transformed, stored), emit events at each stage. This creates a observable pipeline where each stage announces its completion and provides the transformed data to the next stage.

```javascript
const EventEmitter = require('events');

class DataPipeline extends EventEmitter {
  async process(rawData) {
    try {
      // Stage 1: Data received
      this.emit('dataReceived', rawData);
      
      // Stage 2: Validation
      const validation = this.validate(rawData);
      if (!validation.valid) {
        this.emit('validationFailed', validation.errors);
        throw new Error('Validation failed');
      }
      this.emit('dataValidated', rawData);
      
      // Stage 3: Transformation
      const transformed = this.transform(rawData);
      this.emit('dataTransformed', transformed);
      
      // Stage 4: Storage
      const stored = await this.store(transformed);
      this.emit('dataStored', stored);
      
      // Final event
      this.emit('processingComplete', stored);
      
      return stored;
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  validate(data) {
    // Simple validation
    return {
      valid: data && data.length > 0,
      errors: data && data.length > 0 ? [] : ['Data is empty']
    };
  }
  
  transform(data) {
    // Simple transformation
    return data.toUpperCase();
  }
  
  async store(data) {
    // Simulate async storage
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ id: Date.now(), data });
      }, 100);
    });
  }
}

const pipeline = new DataPipeline();

// Monitor each stage
pipeline.on('dataReceived', (data) => {
  console.log('📥 Data received:', data);
});

pipeline.on('dataValidated', (data) => {
  console.log('✓ Data validated');
});

pipeline.on('dataTransformed', (data) => {
  console.log('🔄 Data transformed:', data);
});

pipeline.on('dataStored', (result) => {
  console.log('💾 Data stored with ID:', result.id);
});

pipeline.on('processingComplete', (result) => {
  console.log('✅ Processing complete!');
});

pipeline.on('validationFailed', (errors) => {
  console.error('❌ Validation failed:', errors);
});

// Process data
pipeline.process('hello world');
```

This pattern creates transparency in your data processing. Each stage announces its work, allowing monitoring systems to track progress, logging systems to record steps, and error handling systems to identify exactly where things went wrong. The pipeline itself just focuses on transforming data, while the events allow others to observe and react.

### 4. Composition vs Inheritance: When to Extend vs Contain

A design question arises: should your class extend EventEmitter, or should it contain an EventEmitter as a property? This is the classic composition versus inheritance question, and the answer depends on your use case. Let me walk you through both approaches and when to use each.

**Inheritance: When Your Class IS an Emitter**

Use inheritance (extends) when event emission is a core part of your class's identity and purpose. The class is fundamentally observable, and emitting events is central to what it does.

```javascript
const EventEmitter = require('events');

// This class IS an emitter - its purpose is to be observed
class ObservableCounter extends EventEmitter {
  constructor(startValue = 0) {
    super();
    this.value = startValue;
  }
  
  increment() {
    this.value++;
    this.emit('incremented', this.value);
  }
  
  decrement() {
    this.value--;
    this.emit('decremented', this.value);
  }
}

// Clean, simple API
const counter = new ObservableCounter();
counter.on('incremented', (value) => console.log('Value:', value));
counter.increment();
```

This approach is clean when the class's entire purpose is to be an observable thing. The class exposes the full EventEmitter API (on, once, emit, etc.) which is appropriate because that is what the class is.

**Composition: When Your Class HAS an Emitter**

Use composition (containing) when event emission is just one aspect of your class among many responsibilities, or when you want to control which EventEmitter methods are exposed.

```javascript
const EventEmitter = require('events');

// This class HAS an emitter - it's one aspect among many
class UserRepository {
  constructor() {
    this.users = new Map();
    this.events = new EventEmitter(); // Composition
  }
  
  // Expose only the listener methods you want
  on(event, listener) {
    return this.events.on(event, listener);
  }
  
  once(event, listener) {
    return this.events.once(event, listener);
  }
  
  // Core functionality - repository methods
  create(user) {
    this.users.set(user.id, user);
    this.events.emit('userCreated', user);
    return user;
  }
  
  findById(id) {
    return this.users.get(id);
  }
  
  delete(id) {
    const user = this.users.get(id);
    this.users.delete(id);
    this.events.emit('userDeleted', user);
    return user;
  }
}

const repo = new UserRepository();
repo.on('userCreated', (user) => console.log('Created:', user));

const user = repo.create({ id: 1, name: 'Alice' });
```

This approach is better when the class has a primary purpose (storing users) and event emission is a secondary feature that supports observability. You can also control which EventEmitter methods are exposed (notice we did not expose `emit` or `removeAllListeners`) which prevents external code from emitting events on your behalf or accidentally breaking your listeners.

The composition approach also avoids polluting your class's namespace with all of EventEmitter's methods. When a class has many methods of its own, inheriting from EventEmitter adds many more methods (listenerCount, eventNames, rawListeners, etc.) that may not be relevant to users of your class.

### 5. Chaining Event Emitters: Building Complex Systems

In complex systems, you often have multiple emitters that need to coordinate or forward events to each other. This is where understanding how to chain and compose emitters becomes valuable. You can create hierarchical event systems where child emitters bubble events up to parent emitters, or you can create middleware layers that listen to one emitter and emit to another after transforming or filtering events.

#### Pattern: Event Forwarding

Sometimes you want one emitter to listen to another and re-emit its events, possibly with a different name or additional data. This creates a chain of responsibility where events flow through multiple layers.

```javascript
const EventEmitter = require('events');

class ChildComponent extends EventEmitter {
  doSomething() {
    console.log('Child: Doing something');
    this.emit('childAction', { component: 'child' });
  }
}

class ParentComponent extends EventEmitter {
  constructor() {
    super();
    this.child = new ChildComponent();
    
    // Forward child events to parent
    this.child.on('childAction', (data) => {
      console.log('Parent: Child did something');
      // Re-emit with additional context
      this.emit('componentAction', {
        ...data,
        parent: 'parent',
        timestamp: new Date()
      });
    });
  }
  
  triggerChild() {
    this.child.doSomething();
  }
}

const parent = new ParentComponent();

parent.on('componentAction', (data) => {
  console.log('Observer: Received event', data);
});

parent.triggerChild();

// Output:
// Child: Doing something
// Parent: Child did something
// Observer: Received event { component: 'child', parent: 'parent', timestamp: 2025-10-29... }
```

This pattern creates an event hierarchy where low-level events bubble up through layers, potentially being enriched or transformed at each level. This is common in UI frameworks (DOM events bubble up through the element tree) and in complex applications (module events bubble up to application-level events).

#### Pattern: Event Aggregation

Sometimes you have multiple independent emitters and you want to aggregate their events into a single stream. This is useful for monitoring, logging, or coordinating across multiple subsystems.

```javascript
const EventEmitter = require('events');

class EventAggregator extends EventEmitter {
  constructor() {
    super();
    this.sources = [];
  }
  
  addSource(emitter, name) {
    this.sources.push({ emitter, name });
    
    // Listen to all events from this source
    const originalEmit = emitter.emit.bind(emitter);
    
    emitter.emit = (event, ...args) => {
      // Call original emit
      originalEmit(event, ...args);
      
      // Also emit on aggregator with source name
      this.emit('aggregated', {
        source: name,
        event: event,
        args: args,
        timestamp: new Date()
      });
    };
  }
}

// Create multiple independent emitters
const serviceA = new EventEmitter();
const serviceB = new EventEmitter();
const serviceC = new EventEmitter();

// Aggregate them
const aggregator = new EventAggregator();
aggregator.addSource(serviceA, 'ServiceA');
aggregator.addSource(serviceB, 'ServiceB');
aggregator.addSource(serviceC, 'ServiceC');

// Single listener for all events from all sources
aggregator.on('aggregated', (data) => {
  console.log(`[${data.source}] ${data.event}`, data.args);
});

// Emit from different sources
serviceA.emit('started');
serviceB.emit('dataProcessed', { count: 100 });
serviceC.emit('error', new Error('Something failed'));

// Output:
// [ServiceA] started []
// [ServiceB] dataProcessed [ { count: 100 } ]
// [ServiceC] error [ Error: Something failed ]
```

This aggregation pattern is powerful for creating unified monitoring systems, centralized logging, or coordination layers that need to respond to events from multiple independent subsystems without creating tight coupling between those subsystems.

---

## 💻 Practical Exercises

### Exercise 1: Build an Observable Shopping Cart

Create a shopping cart class that emits events for all important operations. This exercise will help you practice creating domain-specific emitters with lifecycle events.

**Requirements:**
- Extend EventEmitter
- Emit events when items are added, removed, or quantity changes
- Emit events when cart is cleared or checkout begins
- Include relevant data with each event

**Starter Code:**

```javascript
const EventEmitter = require('events');

class ShoppingCart extends EventEmitter {
  constructor() {
    super();
    this.items = [];
  }
  
  addItem(item, quantity = 1) {
    // TODO: Add item to cart
    // TODO: Emit 'itemAdded' event with item and quantity
  }
  
  removeItem(itemId) {
    // TODO: Remove item from cart
    // TODO: Emit 'itemRemoved' event with item details
  }
  
  updateQuantity(itemId, newQuantity) {
    // TODO: Update item quantity
    // TODO: Emit 'quantityChanged' event
  }
  
  clear() {
    // TODO: Clear all items
    // TODO: Emit 'cartCleared' event
  }
  
  checkout() {
    // TODO: Begin checkout process
    // TODO: Emit 'checkoutStarted' event with cart total
  }
  
  getTotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
}

// Test your implementation
const cart = new ShoppingCart();

// Add listeners
cart.on('itemAdded', (data) => {
  console.log(`Added: ${data.item.name} x${data.quantity}`);
});

// Add more listeners...

// Test operations
cart.addItem({ id: 1, name: 'Book', price: 15 }, 2);
cart.addItem({ id: 2, name: 'Pen', price: 2 }, 5);
cart.updateQuantity(1, 3);
cart.removeItem(2);
cart.checkout();
```

**Solution:**

```javascript
const EventEmitter = require('events');

class ShoppingCart extends EventEmitter {
  constructor() {
    super();
    this.items = [];
  }
  
  addItem(item, quantity = 1) {
    // Check if item already exists
    const existing = this.items.find(i => i.id === item.id);
    
    if (existing) {
      existing.quantity += quantity;
      this.emit('quantityChanged', {
        item: existing,
        oldQuantity: existing.quantity - quantity,
        newQuantity: existing.quantity
      });
    } else {
      const cartItem = { ...item, quantity };
      this.items.push(cartItem);
      this.emit('itemAdded', {
        item: cartItem,
        quantity: quantity,
        cartTotal: this.getTotal()
      });
    }
  }
  
  removeItem(itemId) {
    const index = this.items.findIndex(i => i.id === itemId);
    
    if (index === -1) {
      this.emit('error', new Error(`Item ${itemId} not found in cart`));
      return;
    }
    
    const removed = this.items.splice(index, 1)[0];
    this.emit('itemRemoved', {
      item: removed,
      cartTotal: this.getTotal()
    });
  }
  
  updateQuantity(itemId, newQuantity) {
    const item = this.items.find(i => i.id === itemId);
    
    if (!item) {
      this.emit('error', new Error(`Item ${itemId} not found in cart`));
      return;
    }
    
    const oldQuantity = item.quantity;
    item.quantity = newQuantity;
    
    this.emit('quantityChanged', {
      item: item,
      oldQuantity: oldQuantity,
      newQuantity: newQuantity,
      cartTotal: this.getTotal()
    });
  }
  
  clear() {
    const itemCount = this.items.length;
    this.items = [];
    
    this.emit('cartCleared', {
      itemsRemoved: itemCount
    });
  }
  
  checkout() {
    const total = this.getTotal();
    const itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
    
    this.emit('checkoutStarted', {
      total: total,
      itemCount: itemCount,
      items: [...this.items] // Copy of items
    });
  }
  
  getTotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
}

// Test the implementation
const cart = new ShoppingCart();

// Comprehensive listeners
cart.on('itemAdded', (data) => {
  console.log(`✓ Added: ${data.item.name} x${data.quantity} ($${data.cartTotal})`);
});

cart.on('itemRemoved', (data) => {
  console.log(`✓ Removed: ${data.item.name} ($${data.cartTotal})`);
});

cart.on('quantityChanged', (data) => {
  console.log(`✓ Updated: ${data.item.name} ${data.oldQuantity} → ${data.newQuantity} ($${data.cartTotal})`);
});

cart.on('cartCleared', (data) => {
  console.log(`✓ Cart cleared (${data.itemsRemoved} items removed)`);
});

cart.on('checkoutStarted', (data) => {
  console.log(`✓ Checkout: ${data.itemCount} items, Total: $${data.total}`);
});

cart.on('error', (error) => {
  console.error(`✗ Error: ${error.message}`);
});

// Test operations
console.log('=== Shopping Cart Test ===\n');
cart.addItem({ id: 1, name: 'Book', price: 15 }, 2);
cart.addItem({ id: 2, name: 'Pen', price: 2 }, 5);
cart.addItem({ id: 1, name: 'Book', price: 15 }, 1); // Add more of existing item
cart.updateQuantity(1, 5);
cart.removeItem(2);
cart.checkout();
```

This exercise demonstrates how events create a complete audit trail of cart operations. Analytics can track what users add, remove, and buy. The UI can update in real time. Inventory systems can react to checkout events. All without the shopping cart knowing about any of these systems.

### Exercise 2: State Machine with Validation

Create a state machine that uses before and after events to validate transitions and notify listeners of state changes.

**Requirements:**
- Implement a state machine for a document workflow (draft → review → approved → published)
- Emit before and after events for each transition
- Allow listeners to validate and potentially reject transitions in the before event
- Track the history of state transitions

**Solution:**

```javascript
const EventEmitter = require('events');

class DocumentWorkflow extends EventEmitter {
  constructor(documentId) {
    super();
    this.documentId = documentId;
    this.currentState = 'draft';
    this.history = [{ state: 'draft', timestamp: new Date(), reason: 'Created' }];
    
    // Define valid transitions
    this.validTransitions = {
      'draft': ['review'],
      'review': ['draft', 'approved'],
      'approved': ['review', 'published'],
      'published': [] // Final state - no transitions allowed
    };
  }
  
  transition(newState, reason = '') {
    const oldState = this.currentState;
    
    // Emit before event - listeners can throw to prevent transition
    try {
      this.emit('beforeTransition', {
        from: oldState,
        to: newState,
        documentId: this.documentId,
        reason: reason
      });
    } catch (error) {
      this.emit('transitionRejected', {
        from: oldState,
        to: newState,
        reason: error.message
      });
      throw error;
    }
    
    // Validate transition
    if (!this.validTransitions[oldState].includes(newState)) {
      const error = new Error(`Invalid transition from ${oldState} to ${newState}`);
      this.emit('transitionRejected', { from: oldState, to: newState, reason: error.message });
      throw error;
    }
    
    // Make the transition
    this.currentState = newState;
    this.history.push({
      state: newState,
      timestamp: new Date(),
      reason: reason
    });
    
    // Emit after events
    this.emit('afterTransition', {
      from: oldState,
      to: newState,
      documentId: this.documentId
    });
    
    this.emit('stateChanged', {
      newState: newState,
      oldState: oldState,
      documentId: this.documentId
    });
    
    // Emit specific state events
    this.emit(`entered:${newState}`, {
      from: oldState,
      documentId: this.documentId
    });
  }
  
  getState() {
    return this.currentState;
  }
  
  getHistory() {
    return [...this.history]; // Return copy
  }
}

// Create workflow
const doc = new DocumentWorkflow('doc-123');

// Add business rule validators
doc.on('beforeTransition', (data) => {
  console.log(`Validating: ${data.from} → ${data.to}`);
  
  // Example validation: cannot approve on weekends
  if (data.to === 'approved') {
    const day = new Date().getDay();
    if (day === 0 || day === 6) {
      throw new Error('Cannot approve documents on weekends');
    }
  }
  
  // Example validation: must have reason for going back to draft
  if (data.to === 'draft' && data.from !== 'draft') {
    if (!data.reason || data.reason.trim() === '') {
      throw new Error('Must provide reason for returning to draft');
    }
  }
});

// Log all state changes
doc.on('stateChanged', (data) => {
  console.log(`✓ State changed: ${data.oldState} → ${data.newState}`);
});

// Handle rejection
doc.on('transitionRejected', (data) => {
  console.error(`✗ Transition rejected: ${data.from} → ${data.to} (${data.reason})`);
});

// React to specific states
doc.on('entered:approved', (data) => {
  console.log('📧 Sending approval notification...');
});

doc.on('entered:published', (data) => {
  console.log('🎉 Document is now public!');
});

// Test the workflow
console.log('=== Document Workflow Test ===\n');
console.log('Current state:', doc.getState());

doc.transition('review', 'Ready for review');
doc.transition('approved', 'Looks good');
doc.transition('published', 'Release to public');

// This would fail:
// doc.transition('draft', 'Go back'); // published → draft is not valid

console.log('\nFinal state:', doc.getState());
console.log('\nHistory:', doc.getHistory());
```

This exercise demonstrates the power of before and after events for implementing complex business logic. Validators are separate from the state machine logic, making the system extensible and testable. New validation rules can be added by simply registering new listeners—no need to modify the DocumentWorkflow class itself.

---

## 🤔 Philosophical Reflection: The Teacher's Wisdom

### Providing Structure, Not Control

When you create a custom EventEmitter, you are essentially creating a teaching structure. You announce the curriculum (what events exist), you announce when lessons happen (when events are emitted), and you provide resources (event data), but you do not control what students (listeners) do with this information. Some listeners will log. Some will trigger other actions. Some will transform data and pass it on. You cannot and should not try to control all of this.

This is the essence of the Stoic teaching philosophy that Epictetus exemplified. He provided structure through his lectures and writings, but he trusted each student to internalize and apply the wisdom in their own way. Some students became philosophers themselves. Others became statesmen. Others became merchants who applied Stoic principles to business. Epictetus did not demand uniformity of outcome—he provided wisdom and trusted each person to use it appropriately for their circumstances.

Your custom emitters should embody this same trust. Emit events with good data at appropriate times, use clear naming conventions that make the events self-documenting, and trust listeners to respond appropriately. Do not try to control or even know about all listeners. Provide the structure, share the control, and watch as independent components coordinate through events without tight coupling.

### Self-Assessment Questions

Reflect on how you design observable systems:

1. **Event Design**: When you create a class that emits events, do you carefully consider event names and what data to include, or do you add events haphazardly as needs arise?

2. **Trust**: Do you feel anxious not knowing who is listening to your events or what they are doing with them, or do you trust that listeners will handle events appropriately?

3. **Coupling**: Look at a recent class you wrote that coordinates with other classes. Does it have direct references and calls to many other classes, or does it emit events that others can listen to?

4. **Extension**: If you needed to add new behavior that responds to something happening in your system, would you need to modify existing code, or could you add a new listener?

5. **Teaching**: Are your classes like authoritarian lecturers who demand specific responses, or like wise teachers who provide structure and trust students to learn in their own way?

---

## 📝 Summary & Next Steps

### Key Takeaways Checklist

After completing this lesson, you should understand how to create effective custom event emitters and organize event-driven systems:

- [ ] **Custom emitters** extend EventEmitter and call super() in the constructor
- [ ] **Event naming conventions** use past tense for completed actions, present for impending actions
- [ ] **Prefixing events** with category (like `task:completed`) organizes the event space
- [ ] **Lifecycle events** announce state transitions in objects with a lifecycle
- [ ] **State change events** use before and after patterns for validation and reaction
- [ ] **Data flow events** make pipelines observable at each transformation stage
- [ ] **Inheritance vs composition** depends on whether events are central or peripheral to the class
- [ ] **Event forwarding** creates hierarchies where events bubble up through layers
- [ ] **Event aggregation** combines events from multiple sources into a unified stream
- [ ] **Teaching philosophy** means providing structure (events) while trusting listeners to respond independently

### What We've Learned

In this lesson, you have learned how to create sophisticated event-driven architectures by building custom EventEmitter classes. You understand common patterns like lifecycle events, state change events, and data flow events. You know when to inherit from EventEmitter versus when to compose it, and you can chain and aggregate multiple emitters to build complex systems.

Most importantly, you have seen how custom emitters embody the Stoic principle of providing structure while sharing control. A well-designed emitter is like a good teacher—it announces important occurrences with clear, descriptive names and provides useful data, but it does not try to control or even know about how listeners will respond. This creates systems that are loosely coupled, easy to extend, and resilient to change.

### Preview: Lesson 3 - Memory Management & Best Practices

In the final lesson of this minicourse, we will address the practical concerns of using events in production systems:

- **Memory leaks** from forgotten listeners and how to prevent them
- **Listener limits** and when to increase them safely
- **Performance considerations** of synchronous event emission
- **Testing strategies** for event-driven code
- **Debugging techniques** for tracing events through complex systems
- **Best practices** for maintainable event-driven architectures

**Stoic Connection**: We will explore how memory leaks are a form of attachment—holding onto what is no longer needed. The Stoic virtue of letting go applies directly to removing listeners when they are no longer useful.

---

## 🔗 References

**Technical Documentation**:
1. Node.js EventEmitter API: https://nodejs.org/docs/latest/api/events.html
2. EventEmitter Source Code: https://github.com/nodejs/node/blob/main/lib/events.js
3. Observer Pattern (Gang of Four): Design Patterns: Elements of Reusable Object-Oriented Software

**Stoic Philosophy**:
4. "Discourses" by Epictetus - On teaching and learning
5. "Letters from a Stoic" by Seneca - Letter 6, On sharing knowledge
6. "Meditations" by Marcus Aurelius - Book 6, On proper relationships with others

---

**END OF LESSON 2**

*Remember: The best teachers provide structure and wisdom, then trust students to apply it in their own way. The best event emitters announce what happens with clarity, then trust listeners to respond appropriately. Structure without domination, guidance without control.*

🟡 **Next**: Lesson 3 - Memory Management & Best Practices (30 minutes)
