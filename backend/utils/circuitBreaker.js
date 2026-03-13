const EventEmitter = require('events');
const logger = require('./logger');

/**
 * Circuit Breaker pattern implementation.
 * Protects external service calls (Cloudinary, email, etc.) from cascading failures.
 *
 * States:
 *  CLOSED   → normal operation, requests pass through
 *  OPEN     → failures exceeded threshold, requests fail fast
 *  HALF_OPEN → after resetTimeout, allows a probe request through
 */
class CircuitBreaker extends EventEmitter {
  constructor(name, options = {}) {
    super();
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold || 2;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.fallback = options.fallback || null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this._transition('HALF_OPEN');
      } else {
        // Fail fast — use fallback if available
        if (this.fallback) {
          logger.warn(`CircuitBreaker [${this.name}]: OPEN — using fallback`);
          return this.fallback();
        }
        throw new Error(`CircuitBreaker [${this.name}]: OPEN — service unavailable`);
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure(error);
      throw error;
    }
  }

  _onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this._transition('CLOSED');
      }
    }
  }

  _onFailure(error) {
    this.failureCount++;
    this.successCount = 0;
    this.lastFailureTime = Date.now();

    logger.warn(`CircuitBreaker [${this.name}]: failure ${this.failureCount}/${this.failureThreshold}`, {
      error: error.message
    });

    if (this.failureCount >= this.failureThreshold) {
      this._transition('OPEN');
    }
  }

  _transition(newState) {
    const oldState = this.state;
    this.state = newState;
    if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.successCount = 0;
    }
    logger.info(`CircuitBreaker [${this.name}]: ${oldState} → ${newState}`);
    this.emit('stateChange', { from: oldState, to: newState, name: this.name });
  }

  getState() { return this.state; }
  isOpen() { return this.state === 'OPEN'; }
  isClosed() { return this.state === 'CLOSED'; }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Pre-configured circuit breakers for external services
const breakers = {
  cloudinary: new CircuitBreaker('cloudinary', {
    failureThreshold: 3,
    resetTimeout: 60000,
    halfOpenSuccessThreshold: 2
  }),
  email: new CircuitBreaker('email', {
    failureThreshold: 3,
    resetTimeout: 120000,
    halfOpenSuccessThreshold: 1
  })
};

module.exports = CircuitBreaker;
module.exports.breakers = breakers;
