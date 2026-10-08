export const feedCache: Record<string, any> = {};

export function invalidateFeedCache() {
  for (const k of Object.keys(feedCache)) delete feedCache[k];
}
