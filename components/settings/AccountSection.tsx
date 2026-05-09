'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useMe, useUpdateMe, useLogout } from '@/lib/api/hooks';
import { ThemeToggle } from '@/components/ThemeToggle';

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
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-surface-raised rounded-lg" />
        <div className="h-12 bg-surface-raised rounded-lg" />
        <div className="h-12 bg-surface-raised rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Profile card */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center text-lg font-semibold shrink-0">
            {me?.name
              ? me.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
              : me?.email?.[0]?.toUpperCase() ?? '?'}
          </div>

          {/* Name + Email */}
          <div className="flex-1 space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
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
                  className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {dirty && (
                  <button
                    onClick={handleSaveName}
                    disabled={updateMe.isPending}
                    className="px-3 py-2 text-xs font-medium bg-accent text-white rounded-md disabled:opacity-50 hover:bg-accent/90 transition-colors"
                  >
                    {updateMe.isPending ? 'Saving…' : 'Save'}
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                Email Address
              </label>
              <p className="px-3 py-2 text-sm bg-surface-raised border border-border rounded-md text-secondary">
                {me?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-primary">Preferences</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Theme</p>
            <p className="text-xs text-tertiary">Toggle between light and dark mode.</p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Sign out */}
      <div className="border-t border-border pt-4">
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="px-5 py-2.5 text-sm font-medium bg-p1 text-white rounded-lg hover:bg-p1/90 transition-colors disabled:opacity-50"
        >
          {logout.isPending ? 'Signing out…' : 'Log Out'}
        </button>
      </div>
    </div>
  );
}
