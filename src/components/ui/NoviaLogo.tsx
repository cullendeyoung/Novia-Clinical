// Novia Clinical Logo Component
// This embeds the logo directly to ensure it always displays

export default function NoviaLogo({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Star/burst icon */}
      <g transform="translate(0, 5)">
        {/* Main vertical line */}
        <line x1="20" y1="0" x2="20" y2="40" stroke="#0077B6" strokeWidth="2" />
        {/* Main horizontal line */}
        <line x1="0" y1="20" x2="40" y2="20" stroke="#0077B6" strokeWidth="2" />
        {/* Diagonal lines */}
        <line x1="5" y1="5" x2="35" y2="35" stroke="#0077B6" strokeWidth="1.5" />
        <line x1="35" y1="5" x2="5" y2="35" stroke="#0077B6" strokeWidth="1.5" />
        {/* Secondary diagonals */}
        <line x1="10" y1="2" x2="30" y2="38" stroke="#00B4D8" strokeWidth="1" />
        <line x1="30" y1="2" x2="10" y2="38" stroke="#00B4D8" strokeWidth="1" />
        {/* Center dot */}
        <circle cx="20" cy="20" r="3" fill="#00B4D8" />
        {/* Top accent */}
        <circle cx="20" cy="3" r="2" fill="#00B4D8" />
      </g>

      {/* "novia" text */}
      <text
        x="50"
        y="32"
        fontFamily="Inter, sans-serif"
        fontSize="28"
        fontWeight="600"
        fill="#0077B6"
      >
        novia
      </text>

      {/* "clinical intelligence" subtext */}
      <text
        x="50"
        y="46"
        fontFamily="Inter, sans-serif"
        fontSize="10"
        fontWeight="400"
        fill="#00B4D8"
        letterSpacing="0.5"
      >
        clinical intelligence
      </text>
    </svg>
  );
}
