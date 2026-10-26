'use client';
export default function T() {
  return <button onClick={() => { throw new Error('Sentry test'); }}>Test</button>;
}
