import { useMemo, DependencyList } from 'react';

/**
 * Creates stable memoization for arrays of objects with ID fields.
 * Uses ID concatenation for stable dependency comparison.
 *
 * This hook solves the problem where arrays of objects cause useMemo to re-run
 * on every render because array references change even when contents are identical.
 * By creating a stable string key from object IDs, we can achieve true memoization.
 *
 * @example
 * const processed = useStableMemo(
 *   () => events.map(e => transform(e)),
 *   events,
 *   e => e.id
 * );
 *
 * @param factory - Function that computes the memoized value
 * @param array - Array of objects to track
 * @param idExtractor - Function to extract a unique ID from each object
 * @param extraDeps - Additional dependencies to include in memoization
 * @returns The memoized value
 */
export function useStableMemo<T, R>(
  factory: () => R,
  array: T[],
  idExtractor: (item: T) => string,
  extraDeps: DependencyList = []
): R {
  const stableKey = useMemo(
    () => array.map(idExtractor).sort().join(','),
    [array.length, ...extraDeps]
  );

  return useMemo(factory, [stableKey]);
}

/**
 * Utility to create stable key from event-like objects.
 * Useful when you need a stable identifier for arrays of Nostr events.
 *
 * @example
 * const eventKey = createEventKey(events);
 * const result = useMemo(() => processEvents(events), [eventKey]);
 *
 * @param events - Array of objects with an 'id' property
 * @returns Stable string key representing the array contents
 */
export function createEventKey<T extends { id: string }>(
  events: T[]
): string {
  if (events.length === 0) return '';
  return events.map(e => e.id).sort().join(',');
}
