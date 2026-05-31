export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export function haptic(type: HapticType = 'light') {
  if (typeof window === 'undefined') return;
  if (!('vibrate' in navigator)) return;

  const patterns: Record<HapticType, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 30, 10],
    warning: [20, 30, 20],
    error: [30, 50, 30, 50, 30],
  };

  navigator.vibrate(patterns[type]);
}
