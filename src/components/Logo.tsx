import clsx from "clsx";

export function Logo({
  className,
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <svg width="30" height="30" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="tennet-navy" x1="4" y1="4" x2="30" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#20305E" />
            <stop offset="1" stopColor="#0B1330" />
          </linearGradient>
          <linearGradient id="tennet-gold" x1="16" y1="10" x2="40" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#F0C468" />
            <stop offset="1" stopColor="#B6822A" />
          </linearGradient>
        </defs>
        <path
          d="M4 5H33L26 12H24.5V39H16.5V12H4V5Z"
          fill="url(#tennet-navy)"
        />
        <path
          d="M18.5 39V27.5L38 8V19.5L18.5 39Z"
          fill="url(#tennet-gold)"
        />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[19px] font-semibold tracking-tight">
          <span className="text-ink">TEN</span>
          <span className="text-accent">N</span>
          <span className="text-ink">E</span>
          <span className="text-accent">T</span>
        </span>
        {showTagline && (
          <span className="mt-1 text-[9.5px] font-medium uppercase tracking-[0.2em] text-ink-faint">
            Digital Services
          </span>
        )}
      </span>
    </span>
  );
}
