export async function withRetry<T>(
  fn: () => PromiseLike<{ data: T; error: any }>,
  retries = 2,
  delayMs = 1000
): Promise<{ data: T; error: any }> {
  const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

  let lastResult = await fn();
  let attempt = 0;

  while (lastResult.error && attempt < retries && !offline()) {
    attempt++;
    await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    if (offline()) break;
    lastResult = await fn();
  }

  return lastResult;
}
