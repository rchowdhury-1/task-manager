export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="26" height="26" rx="7" fill="var(--color-accent)" />
      <rect x="3" y="3" width="26" height="9" rx="7" fill="currentColor" fillOpacity="0.18" />
      <circle cx="22" cy="22" r="3" fill="white" />
    </svg>
  );
}
