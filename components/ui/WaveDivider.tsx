/** Grafismo orgânico (onda amazônica) para separar seções. */
export function WaveDivider({
  className = "",
  color = "var(--ink)",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <div className={className} aria-hidden>
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="block w-full h-[60px]"
      >
        <path
          d="M0,32 C240,80 480,0 720,24 C960,48 1200,80 1440,40 L1440,80 L0,80 Z"
          fill={color}
        />
      </svg>
    </div>
  );
}
