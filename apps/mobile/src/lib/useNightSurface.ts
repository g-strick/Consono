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
 * Night window: 19:00 (7 PM) to 05:59 (5:59 AM inclusive).
 * Reads `new Date().getHours()` once per render (no timer needed for Phase 1).
 */
function isNightHour(): boolean {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 6;
}

/**
 * Returns `'oled'` when the system is in dark mode AND the current time is
 * within the night window; otherwise returns `'light'`.
 */
export function useNightSurface(): Surface {
  const colorScheme = useColorScheme();
  if (colorScheme === 'dark' && isNightHour()) {
    return 'oled';
  }
  return 'light';
}
