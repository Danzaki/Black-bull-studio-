"use client";

import { useId } from "react";

export default function BlackBullLogo({ className = "h-6 w-6" }: { className?: string }) {
  const gradId = `bbHexGrad-${useId()}`;

  return (
    <svg viewBox="0 0 160 160" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>

      <g transform="translate(80,80) scale(0.8)">
        <polygon
          points="0,-68 59,-34 59,34 0,68 -59,34 -59,-34"
          fill="#000000"
          stroke={`url(#${gradId})`}
          strokeWidth="4"
        />

        <path
          d="M -24 -36 L -24 36 L 7 36 C 26 36, 36 26, 36 10
             C 36 -2, 29 -10, 19 -14 C 27 -17, 33 -26, 33 -36
             C 33 -50, 22 -57, 3 -57 L -24 -57 Z
             M 0 -40 L 3 -40 C 12 -40, 15 -36, 15 -29 C 15 -22, 12 -19, 3 -19 L 0 -19 Z
             M 0 -2 L 7 -2 C 17 -2, 21 3, 21 10 C 21 17, 17 21, 7 21 L 0 21 Z"
          fill={`url(#${gradId})`}
          fillRule="evenodd"
        />
      </g>
    </svg>
  );
}
