export default function BlackBullLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M63,79 C58,55 44,40 26,35"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M97,79 C102,55 116,40 134,35"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="26" cy="35" r="6" fill="currentColor" />
      <circle cx="134" cy="35" r="6" fill="currentColor" />
      <rect x="59" y="75" width="42" height="12" rx="6" fill="currentColor" />
    </svg>
  );
}
