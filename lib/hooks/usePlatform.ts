'use client';
import { useState, useEffect } from 'react';
import { isMacPlatform } from '@/lib/utils/platform';

export function useIsMac() {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => { setIsMac(isMacPlatform()); }, []);
  return isMac;
}

export function useShortcutLabel(key: string) {
  const isMac = useIsMac();
  return isMac ? `⌘${key.toUpperCase()}` : `Ctrl+${key.toUpperCase()}`;
}
