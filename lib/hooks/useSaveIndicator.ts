'use client';
import { useState, useRef, useCallback } from 'react';

export type SaveState = 'idle' | 'saving' | 'saved';

export function useSaveIndicator() {
  const [state, setState] = useState<SaveState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSaving = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('saving');
  }, []);

  const markSaved = useCallback(() => {
    setState('saved');
    timerRef.current = setTimeout(() => setState('idle'), 1500);
  }, []);

  const markIdle = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('idle');
  }, []);

  return { state, markSaving, markSaved, markIdle };
}
