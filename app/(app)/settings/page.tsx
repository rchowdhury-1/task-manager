'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DayRulesSection } from '@/components/settings/DayRulesSection';
import { HabitsSection } from '@/components/settings/HabitsSection';
import { AccountSection } from '@/components/settings/AccountSection';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { fadeInUp, staggerChildren } from '@/lib/animations';

type Tab = 'day-rules' | 'habits' | 'account';

const TABS: { id: Tab; label: string }[] = [
  { id: 'day-rules', label: 'Day Rules' },
  { id: 'habits', label: 'Habits' },
  { id: 'account', label: 'Account' },
];

export default function SettingsPage() {
  useEffect(() => { document.title = 'Settings \u00b7 Personal OS'; }, []);

  const [activeTab, setActiveTab] = useState<Tab>('day-rules');

  return (
    <ErrorBoundary>
    <motion.div
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
      className="max-w-[1180px] mx-auto"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="mb-8">
        <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-tertiary mb-2">
          Preferences &middot; Configuration
        </p>
        <h1 className="text-[32px] md:text-[44px] font-semibold leading-[1.02] tracking-display text-primary">
          Settings
        </h1>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-10">
        {/* Left: Tab list */}
        <motion.div variants={fadeInUp} className="md:w-52 shrink-0">
          {/* Desktop: vertical tabs */}
          <nav className="hidden md:flex flex-col gap-1">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    text-left px-3.5 py-2.5 text-[13.5px] rounded-lg transition-colors
                    ${isActive
                      ? 'bg-surface border border-border text-primary font-medium'
                      : 'text-secondary hover:text-primary hover:bg-surface-raised border border-transparent'
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Mobile: horizontal tabs */}
          <div className="md:hidden grid grid-cols-3 p-[3px] bg-surface border border-border rounded-lg">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-2 text-[12.5px] font-medium rounded-md transition-colors text-center
                    ${isActive
                      ? 'bg-page border border-border text-primary shadow-sm'
                      : 'text-secondary hover:text-primary'
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Right: Active section */}
        <motion.div variants={fadeInUp} className="flex-1 min-w-0">
          {activeTab === 'day-rules' && <DayRulesSection />}
          {activeTab === 'habits' && <HabitsSection />}
          {activeTab === 'account' && <AccountSection />}
        </motion.div>
      </div>
    </motion.div>
    </ErrorBoundary>
  );
}
