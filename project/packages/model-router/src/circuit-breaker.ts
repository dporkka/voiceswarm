export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenMaxCalls: number;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: number;
  private halfOpenCalls = 0;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions = {
      failureThreshold: 5,
      recoveryTimeout: 30000,
      halfOpenMaxCalls: 3,
    }
  ) {}

  getName(): string {
    return this.name;
  }

  getState(): CircuitState {
    if (this.state === 'open' && this.canAttemptReset()) {
      this.state = 'half-open';
      this.halfOpenCalls = 0;
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'open') {
      throw new CircuitBreakerOpenError(this.name);
    }

    if (currentState === 'half-open' && this.halfOpenCalls >= this.options.halfOpenMaxCalls) {
      throw new CircuitBreakerOpenError(this.name);
    }

    if (currentState === 'half-open') {
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.options.halfOpenMaxCalls) {
        this.state = 'closed';
        this.successes = 0;
        this.halfOpenCalls = 0;
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successes = 0;
    if (this.failures >= this.options.failureThreshold) {
      this.state = 'open';
    }
  }

  private canAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.options.recoveryTimeout;
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.halfOpenCalls = 0;
    this.lastFailureTime = undefined;
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(provider: string) {
    super(`Circuit breaker is OPEN for provider: ${provider}`);
    this.name = 'CircuitBreakerOpenError';
  }
}
