'use client';
import { useState } from 'react';
import { DayRulesSection } from '@/components/settings/DayRulesSection';
import { HabitsSection } from '@/components/settings/HabitsSection';
import { AccountSection } from '@/components/settings/AccountSection';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type Tab = 'day-rules' | 'habits' | 'account';

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: 'day-rules', label: 'Day Rules', description: 'Configure focus areas and daily hour limits.' },
  { id: 'habits', label: 'Habits', description: 'Manage your daily habits and routines.' },
  { id: 'account', label: 'Account', description: 'Your profile, preferences, and sign out.' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('day-rules');

  const currentTab = TABS.find(t => t.id === activeTab)!;

  return (
    <ErrorBoundary>
    <div className="space-y-6 max-w-[1100px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Settings</h1>
        <p className="text-sm text-secondary mt-0.5">Configure your Personal OS preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: Tab list */}
        <div className="md:w-56 shrink-0">
          {/* Desktop: vertical tabs */}
          <nav className="hidden md:flex flex-col gap-0.5">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    text-left px-3 py-2 text-sm rounded-md transition-colors
                    ${isActive
                      ? 'bg-accent-muted text-accent font-medium border-l-2 border-accent'
                      : 'text-secondary hover:text-primary hover:bg-surface-raised'
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Mobile: horizontal tabs */}
          <div className="md:hidden flex gap-1 bg-surface-raised rounded-lg p-1">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 px-3 py-1.5 text-sm rounded-md transition-colors text-center
                    ${isActive
                      ? 'bg-surface text-accent font-medium shadow-sm'
                      : 'text-secondary hover:text-primary'
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active section */}
        <div className="flex-1 min-w-0">
          {/* Section header */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-primary">{currentTab.label}</h2>
            <p className="text-xs text-tertiary mt-0.5">{currentTab.description}</p>
          </div>

          {/* Section content */}
          {activeTab === 'day-rules' && <DayRulesSection />}
          {activeTab === 'habits' && <HabitsSection />}
          {activeTab === 'account' && <AccountSection />}
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
