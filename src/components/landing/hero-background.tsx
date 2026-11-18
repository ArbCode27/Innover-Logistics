import React from "react";

export const HeroBackground: React.FC = () => {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Mesh Gradient Base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cielo/20 via-background to-background dark:from-marino/60 dark:via-carbon dark:to-background" />

      {/* Atmospheric Radial Glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[450px] rounded-full bg-royal/20 blur-[130px] dark:bg-royal/30 animate-pulse-glow" />
      <div className="absolute top-1/4 -left-48 w-[500px] h-[500px] rounded-full bg-cielo/15 blur-[120px] dark:bg-marino/40" />
      <div className="absolute top-1/3 -right-48 w-[550px] h-[550px] rounded-full bg-royal/15 blur-[140px] dark:bg-royal/20" />

      {/* Subtle Topographical & Grid SVG Pattern */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.035] dark:opacity-[0.06] mix-blend-overlay"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id="hero-grid"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
            />
          </pattern>
          <radialGradient id="topo-fade" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="topo-mask">
            <rect width="100%" height="100%" fill="url(#topo-fade)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />

        {/* Abstract satellite signal contours */}
        <g mask="url(#topo-mask)" stroke="currentColor" fill="none" strokeWidth="0.75">
          <ellipse cx="50%" cy="38%" rx="180" ry="80" strokeDasharray="3 4" />
          <ellipse cx="50%" cy="38%" rx="280" ry="130" strokeDasharray="4 6" />
          <ellipse cx="50%" cy="38%" rx="390" ry="190" strokeDasharray="2 5" />
          <ellipse cx="50%" cy="38%" rx="520" ry="260" strokeDasharray="6 8" />
          <ellipse cx="50%" cy="38%" rx="680" ry="340" />
          <ellipse cx="50%" cy="38%" rx="860" ry="430" />
        </g>
      </svg>

      {/* Subtle Vignette overlay */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-background/80" />
    </div>
  );
};
