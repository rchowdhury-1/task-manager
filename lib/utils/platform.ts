export function isMacPlatform(): boolean {
  if (typeof window === 'undefined') return false;

  // Modern API (Chromium browsers)
  const uaData = (navigator as any).userAgentData;
  if (uaData?.platform) {
    return uaData.platform.toLowerCase().includes('mac');
  }

  // Fallback: userAgent string (Safari, older browsers)
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function getShortcutLabel(key: string): string {
  return isMacPlatform() ? `⌘${key.toUpperCase()}` : `Ctrl+${key.toUpperCase()}`;
}
