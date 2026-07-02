/**
 * Retry Delay Calculation Strategies
 * 
 * Design Decision: Strategy pattern allows adding new retry behaviors
 * without modifying existing code. Each strategy calculates the delay
 * before the next retry attempt.
 * 
 * - FIXED: Constant delay between retries (e.g., always 5s)
 * - LINEAR: Delay grows linearly (e.g., 5s, 10s, 15s, 20s)
 * - EXPONENTIAL: Delay doubles each time with jitter (e.g., 1s, 2s, 4s, 8s)
 * 
 * All strategies respect maxDelay to prevent unbounded wait times.
 * Exponential adds random jitter to prevent thundering herd problems.
 */

export type RetryStrategyType = 'FIXED' | 'LINEAR' | 'EXPONENTIAL';

export interface RetryConfig {
  strategy: RetryStrategyType;
  baseDelay: number;
  maxDelay: number;
  maxRetries: number;
}

export function calculateRetryDelay(
  config: RetryConfig,
  attempt: number
): number {
  let delay: number;

  switch (config.strategy) {
    case 'FIXED':
      delay = config.baseDelay;
      break;

    case 'LINEAR':
      delay = config.baseDelay * attempt;
      break;

    case 'EXPONENTIAL': {
      const exponentialDelay = config.baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 0.3 * exponentialDelay;
      delay = exponentialDelay + jitter;
      break;
    }

    default:
      delay = config.baseDelay;
  }

  return Math.min(delay, config.maxDelay);
}

export function shouldRetry(attempt: number, maxRetries: number): boolean {
  return attempt < maxRetries;
}
