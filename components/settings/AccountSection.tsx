'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useQueryClient as __useQueryClient } from '@tanstack/react-query';
import { useMe, useUpdateMe, useLogout } from '@/lib/api/hooks';
import { ThemeToggle } from '@/components/ThemeToggle';
import { fadeInUp, staggerChildren } from '@/lib/animations';
import { subscribeToPush, unsubscribeFromPush } from '@/lib/notifications/push';

function NotificationToggle({ enabled }: { enabled: boolean }) {
  const [toggling, setToggling] = useState(false);
  const [supported, setSupported] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const queryClient = __useQueryClient();

  useEffect(() => {
    if (typeof Notification === 'undefined' || !('PushManager' in window)) {
      setSupported(false);
    } else if (Notification.permission === 'denied') {
      setBlocked(true);
    }
  }, []);

  const handleToggle = async () => {
    setToggling(true);
    try {
      if (enabled) {
        await unsubscribeFromPush();
        await fetch('/api/v1/notifications/preferences', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationsEnabled: false }),
        });
        toast.success('Notifications disabled');
      } else {
        await subscribeToPush();
        await fetch('/api/v1/notifications/preferences', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationsEnabled: true }),
        });
        toast.success('Notifications enabled');
      }
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      console.error('Notification toggle failed:', e);
      if (enabled) {
        toast.error("Couldn't disable notifications.");
      } else {
        if (typeof Notification !== 'undefined') {
          if (Notification.permission === 'denied') {
            toast.error('Notifications are blocked. Enable them in your browser settings.');
          } else if (Notification.permission === 'default') {
            toast.error('Notification permission was not granted. Please try again.');
          } else {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            toast.error(`Could not enable notifications: ${msg}`);
          }
        } else {
          toast.error("Notifications aren't supported in this browser.");
        }
      }
    } finally {
      setToggling(false);
    }
  };

  const disabled = !supported || blocked || toggling;
  const subText = !supported
    ? "Your browser doesn't support notifications."
    : blocked
    ? 'Notifications blocked. Enable in browser/OS settings to use.'
    : 'Receive a quote about habits and identity twice a day.';

  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-[14px] font-medium text-primary">Daily quote notifications</p>
        <p className="text-[12.5px] text-tertiary mt-0.5">{subText}</p>
      </div>
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`
          relative w-11 h-6 rounded-full transition-colors shrink-0
          ${enabled ? 'bg-accent' : 'bg-surface-raised border border-border'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label={enabled ? 'Disable notifications' : 'Enable notifications'}
      >
        <span className={`
          absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
          ${enabled ? 'translate-x-[18px]' : 'translate-x-0'}
        `} />
      </button>
    </div>
  );
}

function TrialStatus({ trialEndsAt }: { trialEndsAt?: string | Date | null }) {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const expired = daysLeft === 0;

  return (
    <div>
      <label className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-tertiary block mb-1.5">
        Trial
      </label>
      <p className={`px-3 py-2.5 text-[14px] border border-border rounded-lg ${expired ? 'bg-surface-raised text-secondary' : 'bg-surface text-primary'}`}>
        {expired ? 'Trial expired' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
      </p>
    </div>
  );
}

export function AccountSection() {
  const { data: me, isLoading } = useMe();
  const updateMe = useUpdateMe();
  const logout = useLogout();

  const [name, setName] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (me?.name !== undefined) {
      setName(me.name ?? '');
      setDirty(false);
    }
  }, [me?.name]);

  const handleSaveName = () => {
    if (!dirty) return;
    updateMe.mutate(
      { name: name.trim() || undefined },
      {
        onSuccess: () => { setDirty(false); toast.success('Name updated'); },
        onError: () => toast.error("Couldn't update name."),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse max-w-lg">
        <div className="h-32 bg-surface-raised rounded-xl" />
        <div className="h-20 bg-surface-raised rounded-xl" />
        <div className="h-12 bg-surface-raised rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-lg"
    >
      {/* Section header */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-[18px] md:text-[22px] font-semibold text-primary">
          Account
        </h2>
        <p className="text-[13px] text-secondary mt-0.5">
          Your profile, preferences, and sign out.
        </p>
      </motion.div>

      {/* Profile card */}
      <motion.div variants={fadeInUp} className="bg-surface border border-border rounded-xl p-5 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center text-lg font-semibold shrink-0">
            {me?.name
              ? me.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
              : me?.email?.[0]?.toUpperCase() ?? '?'}
          </div>

          {/* Name + Email */}
          <div className="w-full flex-1 space-y-4">
            <div>
              <label className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-tertiary block mb-1.5">
                Full Name
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setDirty(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                  }}
                  placeholder="Your name"
                  className="flex-1 px-3 py-2.5 text-[14px] bg-surface border border-border rounded-lg text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {dirty && (
                  <button
                    onClick={handleSaveName}
                    disabled={updateMe.isPending}
                    className="px-3.5 py-2.5 text-[12.5px] font-medium bg-accent text-white rounded-lg disabled:opacity-50 hover:bg-accent-hover transition-colors"
                  >
                    {updateMe.isPending ? 'Saving\u2026' : 'Save'}
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-tertiary block mb-1.5">
                Email Address
              </label>
              <p className="px-3 py-2.5 text-[14px] bg-surface-raised border border-border rounded-lg text-secondary">
                {me?.email}
              </p>
            </div>

            <TrialStatus trialEndsAt={me?.trialEndsAt} />
          </div>
        </div>
      </motion.div>

      {/* Preferences */}
      <motion.div variants={fadeInUp} className="bg-surface border border-border rounded-xl p-5 md:p-6 space-y-4">
        <h3 className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-tertiary">
          Preferences
        </h3>

        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-[14px] font-medium text-primary">Theme</p>
            <p className="text-[12.5px] text-tertiary mt-0.5">Toggle between light and dark mode.</p>
          </div>
          <ThemeToggle />
        </div>

        <NotificationToggle enabled={me?.notificationsEnabled ?? false} />
      </motion.div>

      {/* Sign out */}
      <motion.div variants={fadeInUp} className="border-t border-border pt-5">
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="px-5 py-2.5 text-[13px] font-medium border border-border text-secondary rounded-lg hover:text-accent hover:border-accent transition-colors disabled:opacity-50"
        >
          {logout.isPending ? 'Signing out\u2026' : 'Log Out'}
        </button>
      </motion.div>
    </motion.div>
  );
}
