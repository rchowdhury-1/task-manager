// Shared category (topic) definitions used by both server (seeding, AI) and
// client (badge/dot styling). Categories are per-user rows in the categories
// table; tasks reference them by slug. Nothing outside this file should
// hardcode a specific topic slug.

export const CATEGORY_SLUG_REGEX = /^[a-z0-9_-]+$/;

// Topics every new account starts with. Deliberately generic and deletable
// (isSystem: false) — they are suggestions, not fixtures.
export const STARTER_CATEGORIES = [
  { slug: 'learning', label: 'Learning', colour: 'violet', icon: 'book',     sortOrder: 0 },
  { slug: 'fitness',  label: 'Fitness',  colour: 'green',  icon: 'dumbbell', sortOrder: 1 },
  { slug: 'errands',  label: 'Errands',  colour: 'amber',  icon: 'cart',     sortOrder: 2 },
  { slug: 'projects', label: 'Projects', colour: 'blue',   icon: 'target',   sortOrder: 3 },
] as const;

// Emoji rendering for category icons (sidebar, topic strip).
export const CATEGORY_ICON_EMOJI: Record<string, string> = {
  briefcase: '💼',
  book: '📖',
  code: '💻',
  layers: '📚',
  truck: '🚚',
  heart: '❤️',
  dumbbell: '💪',
  cart: '🛒',
  target: '🎯',
};

export const DEFAULT_CATEGORY_ICON = '📁';

// Styling per palette colour (the categories.colour column), not per slug.
// `fallback` is used for tasks whose category has been deleted or is unknown.
export interface CategoryColourStyle {
  bg: string;
  text: string;
  bgDark: string;
  textDark: string;
  dot: string;
  border: string;
}

export const CATEGORY_COLOUR_STYLES: Record<string, CategoryColourStyle> = {
  blue:   { bg: 'bg-[#EFF6FF]', text: 'text-[#1D4ED8]', bgDark: 'dark:bg-[#172554]', textDark: 'dark:text-[#60A5FA]', dot: 'bg-tag-blue',   border: 'var(--color-tag-blue)' },
  violet: { bg: 'bg-[#F5F3FF]', text: 'text-[#7C3AED]', bgDark: 'dark:bg-[#2E1065]', textDark: 'dark:text-[#A78BFA]', dot: 'bg-tag-violet', border: 'var(--color-tag-violet)' },
  amber:  { bg: 'bg-[#FFFBEB]', text: 'text-[#92400E]', bgDark: 'dark:bg-[#451A03]', textDark: 'dark:text-[#FBBF24]', dot: 'bg-tag-amber',  border: 'var(--color-tag-amber)' },
  green:  { bg: 'bg-[#F0FDF4]', text: 'text-[#15803D]', bgDark: 'dark:bg-[#14532D]', textDark: 'dark:text-[#4ADE80]', dot: 'bg-tag-green',  border: 'var(--color-tag-green)' },
  slate:  { bg: 'bg-[#F8FAFC]', text: 'text-[#475569]', bgDark: 'dark:bg-[#1E293B]', textDark: 'dark:text-[#94A3B8]', dot: 'bg-tag-slate',  border: 'var(--color-tag-slate)' },
  rose:   { bg: 'bg-[#FFF1F2]', text: 'text-[#BE123C]', bgDark: 'dark:bg-[#4C0519]', textDark: 'dark:text-[#FB7185]', dot: 'bg-tag-rose',   border: 'var(--color-tag-rose)' },
};

export const FALLBACK_COLOUR_STYLE: CategoryColourStyle = CATEGORY_COLOUR_STYLES.slate;

export function colourStyle(colour: string | null | undefined): CategoryColourStyle {
  return CATEGORY_COLOUR_STYLES[colour ?? ''] ?? FALLBACK_COLOUR_STYLE;
}
