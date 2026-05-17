'use client';
import { Suspense, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTasks, useCategories } from '@/lib/api/hooks';
import { CategorySidebar } from '@/components/lists/CategorySidebar';
import { ListView } from '@/components/lists/ListView';
import { MobileTopicStrip } from '@/components/lists/MobileTopicStrip';
import { fadeInUp } from '@/lib/animations';
import type { SmartListKey } from '@/lib/lists/smartLists';

export default function ListsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-surface-raised rounded-xl" />}>
      <ListsContent />
    </Suspense>
  );
}

function ListsContent() {
  useEffect(() => { document.title = 'Lists \u00b7 Personal OS'; }, []);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: categories, isLoading: catsLoading } = useCategories();

  // Derive active selection from URL params
  const topicParam = searchParams.get('topic');
  const smartParam = searchParams.get('smart') as SmartListKey | null;

  // Resolve active category ID from slug or direct ID
  const activeCategory = topicParam
    ? categories?.find(c => c.id === topicParam || c.slug === topicParam)?.id ?? null
    : null;
  const activeSmartList = smartParam && !topicParam ? smartParam : null;

  // Default to first category when nothing selected and data is loaded
  const effectiveCategory = activeCategory ?? (!activeSmartList ? categories?.[0]?.id ?? null : null);
  const effectiveSmartList = activeSmartList;

  const setActiveCategory = useCallback((id: string) => {
    const cat = categories?.find(c => c.id === id);
    const params = new URLSearchParams();
    params.set('topic', cat?.slug ?? id);
    router.replace(`/lists?${params.toString()}`);
  }, [router, categories]);

  const setActiveSmartList = useCallback((key: SmartListKey) => {
    const params = new URLSearchParams();
    params.set('smart', key);
    router.replace(`/lists?${params.toString()}`);
  }, [router]);

  if (tasksLoading || catsLoading) {
    return (
      <div className="max-w-[1180px] mx-auto animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
          <div className="hidden md:block space-y-3">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-surface-raised rounded-lg" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-12 w-64 bg-surface-raised rounded" />
            <div className="h-10 bg-surface-raised rounded-lg" />
            {[0, 1, 2].map(i => (
              <div key={i} className="h-16 bg-surface-raised rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const allTasks = tasks ?? [];

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="max-w-[1180px] mx-auto"
    >
      {/* Mobile topic strip */}
      <MobileTopicStrip
        activeCategory={effectiveCategory}
        activeSmartList={effectiveSmartList}
        onSelectCategory={setActiveCategory}
        onSelectSmartList={setActiveSmartList}
        tasks={allTasks}
      />

      {/* Desktop: sidebar + list view grid */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 md:gap-10 mt-4 md:mt-0">
        <CategorySidebar
          activeCategory={effectiveCategory}
          activeSmartList={effectiveSmartList}
          onSelectCategory={setActiveCategory}
          onSelectSmartList={setActiveSmartList}
          tasks={allTasks}
        />
        <ListView
          categoryId={effectiveCategory}
          smartList={effectiveSmartList}
          tasks={allTasks}
        />
      </div>
    </motion.div>
  );
}
