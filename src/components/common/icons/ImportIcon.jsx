// tuf-search: #ImportIcon #importIcon #icons
export function ImportIcon({
  size = "24px",
  color = "currentColor",
  className = "",
  strokeWidth = "2",
  ...props
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <polyline
        points="17 13 11 13 11 7"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <line
        x1="21"
        y1="3"
        x2="11"
        y2="13"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="M21,13v7a1,1,0,0,1-1,1H4a1,1,0,0,1-1-1V4A1,1,0,0,1,4,3h7"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}
