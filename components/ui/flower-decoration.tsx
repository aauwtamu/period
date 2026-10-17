export function FlowerDecoration({
  className = "",
  smile = false,
}: {
  className?: string;
  smile?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M60 22C76-10 104 12 91 39C127 33 132 68 99 76C126 102 98 126 76 101C68 134 32 125 39 95C9 115-10 85 20 68C-13 52 7 21 35 38C26 7 54-8 60 22Z"
        fill="currentColor"
      />
      {smile ? (
        <g stroke="#861337" strokeWidth="3" strokeLinecap="round">
          <path d="M43 55v5m30-5v5M45 72q15 16 30 0" />
        </g>
      ) : (
        <circle cx="60" cy="62" r="9" fill="var(--blush)" />
      )}
    </svg>
  );
}
