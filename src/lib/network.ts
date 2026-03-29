export class ExternalRequestTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`External request timed out after ${timeoutMs}ms`);
    this.name = "ExternalRequestTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export const EXTERNAL_TIMEOUTS = {
  fast: 8_000,
  standard: 12_000,
} as const;

function mergeSignals(signals: Array<AbortSignal | null | undefined>) {
  const available = signals.filter((signal): signal is AbortSignal => Boolean(signal));
  if (available.length <= 1) {
    return available[0];
  }

  const controller = new AbortController();
  const abort = () => controller.abort();

  for (const signal of available) {
    if (signal.aborted) {
      controller.abort();
      break;
    }

    signal.addEventListener("abort", abort, { once: true });
  }

  return controller.signal;
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number,
) {
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: mergeSignals([init.signal ?? null, timeoutController.signal]),
    });
  } catch (error) {
    if (timeoutController.signal.aborted) {
      throw new ExternalRequestTimeoutError(timeoutMs);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
