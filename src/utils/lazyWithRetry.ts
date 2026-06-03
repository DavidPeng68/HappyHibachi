import { lazy } from 'react';

/**
 * Wrapper around React.lazy that retries failed chunk loads.
 *
 * When a dynamic import fails (e.g. ChunkLoadError after a deploy or network
 * hiccup), this helper:
 *   1. Clears webpack's internal chunk cache so the retry actually re-fetches.
 *   2. Retries the import up to `maxRetries` times with exponential back-off.
 *   3. On final failure, does a hard page reload (once) so the browser fetches
 *      the updated asset manifest.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LazyFactory = () => Promise<{ default: React.ComponentType<any> }>;

export default function lazyWithRetry(importFn: LazyFactory, maxRetries = 3) {
  return lazy(() => retryImport(importFn, maxRetries));
}

/**
 * Clear webpack's internal chunk cache so a failed chunk can be re-fetched.
 * Webpack stores installed chunks in __webpack_require__.f and marks failed
 * ones in a "installedChunks" map. We clear the failed entries so the next
 * import() actually hits the network again instead of replaying the error.
 */
function clearFailedChunks(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webpackRequire = (window as any).__webpack_require__;
    if (!webpackRequire) return;

    const installedChunks =
      // CRA / webpack 5 — the map lives on the jsonp runtime
      webpackRequire.O?.installedChunks ??
      // Some webpack configs expose it directly
      webpackRequire.m?.installedChunks;

    if (installedChunks && typeof installedChunks === 'object') {
      for (const chunkId of Object.keys(installedChunks)) {
        // 0 = installed, undefined = not loaded, [resolve,reject,promise] = loading
        // anything else (e.g. a rejected promise stored as the value) is a failure
        const status = installedChunks[chunkId];
        if (status !== 0 && status !== undefined) {
          delete installedChunks[chunkId];
        }
      }
    }
  } catch {
    // Non-critical — worst case the retry just fails again
  }
}

async function retryImport(
  importFn: LazyFactory,
  retriesLeft: number,
  delay = 1000
): ReturnType<LazyFactory> {
  try {
    return await importFn();
  } catch (error) {
    if (retriesLeft <= 0) {
      // Last resort: if we haven't already reloaded for this session, reload
      // so the browser picks up the new asset manifest.
      const key = 'chunk_reload';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
      throw error;
    }

    // Clear webpack chunk cache before retrying so we actually re-fetch
    clearFailedChunks();

    await new Promise((r) => setTimeout(r, delay));
    return retryImport(importFn, retriesLeft - 1, delay * 2);
  }
}
