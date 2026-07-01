/**
 * useNightSurface — Returns the appropriate surface type for the review screen
 * based on system color scheme and time of day.
 *
 * Rule (DSGN-01): OLED theme is time-triggered, not user-toggled.
 * Returns 'oled' when:
 *   - System color scheme is 'dark' (iOS dark mode enabled)
 *   - AND the current hour is in the night window (≥ 19:00 or < 06:00)
 *
 * Otherwise returns 'light'.
 *
 * This is a pure presentational hook — it has no side effects and does NOT
 * modify the global app surface. The review screen reads the value and applies
 * it locally.
 *
 * Usage:
 *   const surface = useNightSurface();
 *   // surface === 'oled' | 'light'
 */
import { useColorScheme } from 'react-native';
import type { Surface } from '@/src/lib/theme';

/**
 * Pure predicate for the DSGN-01 OLED night-trigger condition.
 *
 * Returns `true` when the system is in dark mode AND the current hour is
 * within the night window (≥ 19:00 or < 06:00).
 *
 * Extracted from the private `isNightHour()` to allow unit-testing the full
 * truth table without a React render environment.
 *
 * @param colorScheme - The system color scheme ('light' | 'dark' | null | undefined)
 * @param hour - The current hour (0–23)
 */
export function isOledSurface(
  colorScheme: 'light' | 'dark' | null | undefined,
  hour: number,
): boolean {
  return colorScheme === 'dark' && (hour >= 19 || hour < 6);
}

/**
 * Returns `'oled'` when the system is in dark mode AND the current time is
 * within the night window; otherwise returns `'light'`.
 *
 * Delegates to `isOledSurface` — same behavior as before, now unit-testable.
 */
export function useNightSurface(): Surface {
  const colorScheme = useColorScheme();
  return isOledSurface(colorScheme, new Date().getHours()) ? 'oled' : 'light';
}
