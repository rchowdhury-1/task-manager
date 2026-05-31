'use client';
import { useEffect, useState } from 'react';
import { subscribeToPush } from '@/lib/notifications/push';
import { useMe } from '@/lib/api/hooks';

const ENGAGEMENT_THRESHOLD_DAYS = 1;
const LOCAL_STORAGE_KEY = 'notification-banner-state';

export function NotificationOptInBanner() {
  const { data: user } = useMe();
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.notificationsEnabled) return;

    const state = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (state === 'dismissed' || state === 'enabled') return;

    // Check engagement: was account created >= 1 day ago?
    const createdAt = new Date(user.createdAt);
    const daysAgo = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo < ENGAGEMENT_THRESHOLD_DAYS) return;

    // Check Notification API support
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'denied') return;

    setShow(true);
  }, [user]);

  const handleEnable = async () => {
    setSubmitting(true);
    try {
      await subscribeToPush();
      await fetch('/api/v1/notifications/preferences', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationsEnabled: true }),
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, 'enabled');
      setShow(false);
    } catch (e) {
      console.error(e);
      localStorage.setItem(LOCAL_STORAGE_KEY, 'dismissed');
      setShow(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, 'dismissed');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-40 bg-surface border border-border rounded-xl p-4 shadow-pop">
      <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-text-tertiary mb-2">
        DAILY QUOTES
      </p>
      <p className="text-sm text-text-primary mb-3">
        Get a calm reminder twice a day with a quote about habits and identity. Small consistency, big results.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleEnable}
          disabled={submitting}
          className="flex-1 bg-accent text-page text-sm font-medium rounded-lg py-2 hover:bg-accent-hover transition disabled:opacity-50"
        >
          {submitting ? 'Enabling\u2026' : 'Enable'}
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 text-sm text-text-secondary hover:text-text-primary transition"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
