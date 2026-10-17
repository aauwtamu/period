export function WaveDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 64"
      preserveAspectRatio="none"
      className={`wave-divider ${className}`}
      aria-hidden="true"
    >
      <path
        d="M0 32C120 0 240 0 360 32S600 64 720 32S960 0 1080 32S1320 64 1440 32V64H0Z"
        fill="currentColor"
      />
    </svg>
  );
}
