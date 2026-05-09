export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface-raised animate-pulse rounded-lg ${className}`} />
  );
}
