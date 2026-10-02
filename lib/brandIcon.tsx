import { ImageResponse } from "next/og";

export function renderBrandIcon(n: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
        }}
      >
        <svg width={Math.round(n * 0.62)} height={Math.round(n * 0.35)} viewBox="12 24 136 76" fill="none">
          <path d="M63,86 C56,58 42,42 24,36" stroke="#f97316" strokeWidth="14" strokeLinecap="round" />
          <path d="M97,86 C104,58 118,42 136,36" stroke="#f97316" strokeWidth="14" strokeLinecap="round" />
          <circle cx="24" cy="36" r="9" fill="#f97316" />
          <circle cx="136" cy="36" r="9" fill="#f97316" />
          <rect x="57" y="82" width="46" height="16" rx="8" fill="#f97316" />
        </svg>
      </div>
    ),
    { width: n, height: n }
  );
}
