export async function withRetry<T>(
  fn: () => PromiseLike<{ data: T; error: any }>,
  retries = 2,
  delayMs = 1000
): Promise<{ data: T; error: any }> {
  let lastResult = await fn();
  let attempt = 0;

  while (lastResult.error && attempt < retries) {
    attempt++;
    await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    lastResult = await fn();
  }

  return lastResult;
}
