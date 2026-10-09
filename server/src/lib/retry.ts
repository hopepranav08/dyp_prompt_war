export interface RetryOptions {
  retries?: number;
  baseMs?: number;
  /** Decides whether an error is transient (rate limit, 5xx, timeout) and worth retrying. */
  isRetryable?: (err: unknown) => boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Exponential backoff with full jitter — keeps bursts from hammering a struggling upstream. */
export async function withRetry<T>(fn: () => Promise<T>, { retries = 2, baseMs = 300, isRetryable = () => true }: RetryOptions = {}): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !isRetryable(err)) throw err;
      await sleep(Math.random() * baseMs * 2 ** attempt);
      attempt++;
    }
  }
}

/** Rejects if the promise does not settle in time, so one slow upstream can't hang a request. */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** HTTP-ish status codes that are safe to retry. */
export const isTransientStatus = (status: number | undefined) => status === 429 || (status !== undefined && status >= 500);
