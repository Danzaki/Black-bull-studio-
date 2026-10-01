export default function BlackBullLogo({
  className = "h-7 w-auto text-[#f97316]",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="12 24 136 76"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Black Bull Studio"
      role="img"
    >
      <path
        d="M63,86 C56,58 42,42 24,36"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M97,86 C104,58 118,42 136,36"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <circle cx="24" cy="36" r="9" fill="currentColor" />
      <circle cx="136" cy="36" r="9" fill="currentColor" />
      <rect x="57" y="82" width="46" height="16" rx="8" fill="currentColor" />
    </svg>
  );
}
