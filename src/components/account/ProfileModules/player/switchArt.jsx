const STEM_BODY = "M 213.413 58.335 L 297.599 58.471 L 297.5 87.688 C 297.493 92.808 297.376 98.499 297.635 103.569 C 297.822 107.193 300.693 112.46 301.493 116.174 C 302.559 121.12 301.735 126.088 301.939 130.987 L 301.926 136.077 C 304.686 136.059 315.836 136.144 315.836 136.144 L 315.333 301.065 L 303.633 300.945 L 303.655 269.823 L 289.568 269.867 L 280.409 269.917 L 280.315 271.273 C 275.989 271.376 225.387 271.4 225.387 271.4 L 225.295 268.067 L 207.453 268.049 L 207.482 277.771 L 195.24 277.698 C 195.24 277.698 196.464 144.389 196.715 136.281 L 208.783 136.212 L 208.799 125.314 C 208.783 121.996 208.686 119.162 209.598 115.921 C 210.731 111.898 212.93 108.3 213.218 104.081 C 213.62 98.197 213.477 91.969 213.477 86.057 C 213.528 76.818 213.413 58.335 213.413 58.335 Z";

const STEM_CROSS = "M 225.115 185.256 L 285.847 185.025 L 285.671 214.51 L 315.615 214.552 L 315.604 219.624 L 285.59 219.685 L 285.584 269.863 L 280.315 271.273 L 280.534 190.146 L 230.261 190.119 L 230.171 271.432 L 225.118 271.444 L 225.109 219.601 L 195.779 219.688 L 195.783 214.643 L 225.131 214.583 L 225.115 185.256 Z";

const STEM_CAP = "M 264.325 58.381 L 269.23 58.389 L 269.286 130.937 L 301.939 130.987 L 301.926 136.077 L 208.779 136.213 L 208.779 130.911 L 240.775 130.941 L 240.743 58.385 L 245.79 58.366 L 245.817 130.936 L 264.31 130.961 L 264.325 58.381 Z";

const LINEAR_STEM_BODY = "M 225.413 58.335 L 309.599 58.471 L 309.5 87.688 C 309.493 92.808 309.376 98.499 309.635 103.569 C 309.822 107.193 312.693 112.46 313.493 116.174 C 314.559 121.12 313.735 126.088 313.939 130.987 L 313.926 136.077 C 316.686 136.059 326.836 136.144 326.836 136.144 L 326.333 301.065 L 314.633 300.945 L 314.655 269.823 L 300.568 269.867 L 291.409 269.917 L 291.315 271.273 C 286.989 271.376 236.387 271.4 236.387 271.4 L 236.295 268.067 L 218.453 268.049 L 218.482 277.771 L 206.24 277.698 C 206.24 277.698 207.464 144.389 207.715 136.281 L 220.783 136.212 L 220.799 125.314 C 220.783 121.996 220.686 119.162 221.598 115.921 C 222.731 111.898 224.93 108.3 225.218 104.081 C 225.62 98.197 225.477 91.969 225.477 86.057 C 225.528 76.818 225.413 58.335 225.413 58.335 Z";

const LINEAR_STEM_CROSS = "M 236.115 185.256 L 296.847 185.025 L 296.671 214.51 L 326.615 214.552 L 326.604 219.624 L 296.59 219.685 L 296.584 269.863 L 291.315 271.273 L 291.534 190.146 L 241.261 190.119 L 241.171 271.432 L 236.118 271.444 L 236.109 219.601 L 206.779 219.688 L 206.783 214.643 L 236.131 214.583 L 236.115 185.256 Z";

const LINEAR_STEM_CAP = "M 276.325 58.381 L 281.23 58.389 L 281.286 130.937 L 313.939 130.987 L 313.926 136.077 L 220.779 136.213 L 220.779 130.911 L 252.775 130.941 L 252.743 58.385 L 257.79 58.366 L 257.817 130.936 L 276.31 130.961 L 276.325 58.381 Z";

const SPRING = "M 244.224 286.252 C 257.829 286.101 279.307 285.813 286.851 285.71 C 280.965 285.033 258.269 282.324 245.231 279.382 C 244.104 279.127 242.675 278.735 241.765 278.006 C 240.894 276.365 242.002 275.585 243.463 274.868 C 248.367 274.579 280.482 274.52 291.185 274.76 C 291.508 274.767 292.794 275.197 292.373 276.847 C 292.021 278.227 290.21 278.224 289.758 278.245 L 253.693 277.725 C 256.421 278.28 288.674 281.193 289.735 282.255 C 290.964 283.483 290.515 285.67 288.969 285.896 C 284.418 287.177 262.194 288.52 248.647 288.512 C 247.777 288.511 283.067 293.725 289.978 295.415 C 291.045 295.677 291.591 299.554 289.06 299.164 C 274.971 296.984 260.95 293.934 247.054 290.684 C 246.307 290.509 245.17 290.317 242.855 289.237 C 240.635 287.166 243.67 286.259 244.224 286.252 Z M 244.224 299.843 C 260.952 299.658 289.58 299.266 289.58 299.266 C 287.04 300.608 262.984 302.113 248.647 302.104 C 247.777 302.104 283.067 307.316 289.978 309.007 C 291.045 309.268 291.591 313.146 289.06 312.756 C 274.971 310.576 260.95 307.526 247.054 304.276 C 246.307 304.101 245.17 303.909 242.855 302.828 C 240.635 300.757 243.67 299.85 244.224 299.843 Z M 244.224 313.436 C 260.952 313.251 289.58 312.857 289.58 312.857 C 287.04 314.2 262.984 315.705 248.647 315.695 C 247.777 315.695 283.067 320.908 289.978 322.598 C 291.013 322.852 291.558 326.509 289.278 326.372 C 285.539 327.255 262.534 328.206 248.647 328.201 C 247.777 328.199 283.067 331.715 289.978 332.856 C 290.128 332.881 290.268 332.954 290.39 333.06 C 291.661 333.27 292.985 334.104 292.609 335.468 C 291.724 336.286 291.816 336.634 290.493 336.696 L 240.976 336.298 L 240.982 335.429 C 241.886 334.413 243.64 334.254 244.988 334.218 C 252.392 334.035 259.884 334.395 267.283 334.564 C 269.941 334.624 274.633 334.538 279.171 334.259 C 268.409 332.942 257.695 331.343 247.054 329.664 C 246.307 329.547 245.17 329.418 242.855 328.689 C 240.635 327.292 243.67 326.681 244.224 326.677 C 259.228 326.565 283.807 326.339 288.712 326.294 C 274.74 324.117 260.835 321.09 247.054 317.867 C 246.307 317.693 245.17 317.5 242.855 316.42 C 240.635 314.349 243.67 313.442 244.224 313.436 Z";

const TOP_HOUSING = [
  "M 215.897 131.941 L 321.112 131.935 C 324.854 132.011 327.626 132.092 329.857 132.465 L 329.857 215.56 L 203.58 215.56 L 203.58 131.95 L 203.808 131.95 L 215.897 131.941 Z",
  "M 137.937 215.56 L 155.574 144.177 C 157.35 139.26 162.018 133.891 167.251 132.576 C 171.671 131.464 177.217 132.13 181.788 131.967 L 203.58 131.95 L 203.58 215.56 L 137.937 215.56 Z",
  "M 336.951 136.232 C 339.437 138.909 375.944 187.369 397.141 215.56 L 329.857 215.56 L 329.857 132.465 C 332.849 132.965 334.869 133.99 336.951 136.232 Z",
  "M 412.094 235.463 L 124.579 235.535 L 131.356 215.56 L 397.141 215.56 C 405.935 227.256 412.094 235.463 412.094 235.463 Z",
];

const LOWER_HOUSING = "M 240.301 189.508 L 292.891 189.508 L 292.891 234.789 L 423.114 234.778 L 422.825 253.832 C 423.722 254.863 407.127 253.635 404.246 254.33 C 402.259 254.498 404.173 274.027 404.074 275.145 C 404.351 274.677 408.403 277.968 408.26 279.826 C 409.436 279.826 403.918 294.25 403.482 294.25 L 399.539 346.65 C 399.47 345.824 394.252 347.917 393.235 350.159 C 393.049 351.087 371.331 352.94 370.86 350.546 C 371.599 350.479 368.926 347.834 367.684 347.947 L 164.856 346.794 C 164.88 347.211 164.362 349.082 163.812 349.867 C 158.234 352.336 138.692 350.32 138.457 349.968 L 138.428 347.887 L 133.232 346.732 L 128.578 283.853 C 127.552 284.215 126.708 281.269 126.938 281.188 C 126.457 280.747 127.924 277.154 128.406 277.595 L 127.67 255.463 C 127.513 255.508 114.553 255.842 107.733 254.236 L 107.142 234.804 L 240.301 234.793 Z";

const MOLD_RIGHT = "M 365.672 254.573 L 396.823 254.573 L 394.021 350.1 C 395.963 350.966 378.332 354.034 369.663 350.166 L 365.672 254.573 Z";

const MOLD_LEFT = "M 136.271 352.074 L 167.422 352.074 L 164.62 256.547 C 166.562 255.681 148.931 252.613 140.262 256.481 L 136.271 352.074 Z";

const MOLD_RIDGE = "M 183.157 319.907 L 350.125 319.907 L 350.125 319.923 C 363.383 317.082 367.203 309.782 367.203 309.782 C 365.626 316.411 360.133 321.298 350.125 324.281 L 350.125 324.295 L 183.157 324.295 L 183.157 324.273 C 173.165 321.289 167.68 316.404 166.105 309.782 C 166.105 309.782 169.92 317.072 183.157 319.917 Z";

const LEAF_RIGHT_TOP = "M 287.144 235.605 L 321.913 235.605 L 321.913 270.849 L 287.144 270.849 L 287.144 235.605 Z";

const LEAF_RIGHT_BOTTOM = "M 321.913 285.067 L 287.144 285.067 L 287.144 270.849 L 321.913 270.849 L 321.913 285.067 Z";

const LEAF_LEFT_TOP = "M 208.242 269.849 L 243.011 269.849 L 244.009 234.605 L 209.24 234.605 L 208.242 269.849 Z";

const LEAF_LEFT_BOTTOM = "M 243.011 269.849 L 208.242 269.849 L 207.84 284.067 L 242.609 284.067 L 243.011 269.849 Z";

const LEAF_SHEAR = "matrix(1, 0, 0.028294, 1, -5.015749, -1)";
const LEAF_FLIP = "matrix(1, 0, 0, 1, -0.000003, 0.000015)";
const LEAF_FLIP_BOTTOM = "matrix(1, 0, 0, 1, -0.000015, -0.00003)";
const STEM_SHIFT = "translate(12 0)";

const JACKET = "#bcbcbc";
const JACKET_EDGE = "#8b8b8b";
const PIN = "#7c7c7c";
const SPRING_START = "#923e26";
const SPRING_END = "#714333";
const TOP_FILL_OPACITY = 1;
const TOP_STROKE_OPACITY = 1;
const OUTLINE_WIDTH = 3;
const FALLBACK_EDGE = "#959595";
const REF_HOUSING_RGB = [107, 107, 107];
const REF_LEAF_RGB = [126, 126, 126];
const REF_LEAF_EDGE_RGB = [80, 80, 80];

function SpringDef({ id }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="660.547" y1="1004.23" x2="670.438" y2="958.414" gradientTransform="matrix(0.280584, 0, 0, 0.280584, 80.541054, 12.596008)">
      <stop offset="0" stopColor={SPRING_START} />
      <stop offset="1" stopColor={SPRING_END} />
    </linearGradient>
  );
}

function rgbFromHex(hex) {
  const n = parseInt(String(hex || "").slice(1), 16);
  if (!Number.isFinite(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hexFromRgb(channels) {
  return `#${channels.map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsv([r, g, b]) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { h: hue, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToRgb({ h, s, v }) {
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = v - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;
  if (h < 60) {
    red = chroma;
    green = x;
  } else if (h < 120) {
    red = x;
    green = chroma;
  } else if (h < 180) {
    green = chroma;
    blue = x;
  } else if (h < 240) {
    green = x;
    blue = chroma;
  } else if (h < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }
  return [(red + match) * 255, (green + match) * 255, (blue + match) * 255];
}

function relatedHsv(hex, refFrom, refTo) {
  const rgb = rgbFromHex(hex);
  if (!rgb) return FALLBACK_EDGE;
  const base = rgbToHsv(rgb);
  const from = rgbToHsv(refFrom);
  const to = rgbToHsv(refTo);
  const valueScale = from.v > 1e-6 ? to.v / from.v : 1;
  return hexFromRgb(
    hsvToRgb({
      h: base.h,
      s: Math.min(1, Math.max(0, base.s + (to.s - from.s))),
      v: Math.min(1, Math.max(0, base.v * valueScale)),
    }),
  );
}

function mixHex(hex, target, amount) {
  const from = rgbFromHex(hex);
  const to = rgbFromHex(target);
  if (!from || !to) return FALLBACK_EDGE;
  const mix = Math.min(1, Math.max(0, amount));
  return hexFromRgb(from.map((channel, index) => channel + (to[index] - channel) * mix));
}

function luminance(hex) {
  const rgb = rgbFromHex(hex);
  if (!rgb) return 0;
  return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
}

function housingEdge(hex, amount) {
  return luminance(hex) > 0.15 ? mixHex(hex, "#000000", amount) : mixHex(hex, "#aaaaaa", amount);
}

function TopHousing({ color, opacity }) {
  return (
    <g
      className="switch-diagram__top"
      fill={color}
      fillOpacity={TOP_FILL_OPACITY * opacity}
      stroke={housingEdge(color, 0.3)}
      strokeOpacity={TOP_STROKE_OPACITY * opacity}
      strokeWidth={13}
      fillRule="nonzero"
      paintOrder="fill"
    >
      {TOP_HOUSING.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </g>
  );
}

function LowerHousing({ color }) {
  const mold = mixHex(color, "#000000", 0.4);
  const well = mixHex(color, "#000000", 0.2);
  const leaf = relatedHsv(color, REF_HOUSING_RGB, REF_LEAF_RGB);
  const leafEdge = relatedHsv(color, REF_HOUSING_RGB, REF_LEAF_EDGE_RGB);
  return (
    <g className="switch-diagram__lower">
      <path d={LOWER_HOUSING} fill={color} />
      <rect x="370.132" y="234.843" width="52.903" height="19.797" fill="none" stroke={mold} strokeWidth={OUTLINE_WIDTH} />
      <path d={MOLD_RIGHT} fill="none" stroke={mold} strokeWidth={OUTLINE_WIDTH} />
      <path d={MOLD_LEFT} fill="none" stroke={mold} strokeWidth={OUTLINE_WIDTH} transform="matrix(1, 0, 0, 1, 0.000011, -0.000014)" />
      <rect x="107.132" y="234.843" width="52.903" height="19.797" fill="none" stroke={mold} strokeWidth={OUTLINE_WIDTH} />
      <path d={MOLD_RIDGE} fill={well} stroke={mold} />
      <path d={LEAF_RIGHT_TOP} fill={leaf} transform={LEAF_SHEAR} />
      <path d={LEAF_RIGHT_BOTTOM} fill={leafEdge} transform={LEAF_SHEAR} />
      <path d={LEAF_LEFT_TOP} fill={leaf} transform={LEAF_FLIP} />
      <path d={LEAF_LEFT_BOTTOM} fill={leafEdge} transform={LEAF_FLIP_BOTTOM} />
    </g>
  );
}

function SwitchShell({ base, top, opacity, gradientId, children }) {
  return (
    <>
      <defs>
        <SpringDef id={gradientId} />
      </defs>
      <rect x="347.404" y="163.821" width="36.423" height="74.091" fill={PIN} />
      {children}
      <TopHousing color={top} opacity={opacity} />
      <path fill={`url(#${gradientId})`} d={SPRING} />
      <LowerHousing color={base} />
    </>
  );
}

function MechanicalStem({ stem, stemDark, body, cross, cap, leg, edgePoints }) {
  return (
    <>
      <path fill={stem} d={body} />
      <path fill={stem} d={leg} />
      <path fill={stemDark} d={cross} />
      <path fill={stemDark} d={cap} />
      <polyline fill={stemDark} points={edgePoints} />
    </>
  );
}

export function LinearArt({ base, top, stem, stemDark, opacity, gradientId }) {
  return (
    <SwitchShell base={base} top={top} opacity={opacity} gradientId={gradientId}>
      <MechanicalStem
        stem={stem}
        stemDark={stemDark}
        body={LINEAR_STEM_BODY}
        cross={LINEAR_STEM_CROSS}
        cap={LINEAR_STEM_CAP}
        leg="M 208.07 186.615 L 181.698 277.703 L 207.867 277.703"
        edgePoints="202.012 207.258 207.083 190.026 207.083 277.706 202.021 277.708"
      />
    </SwitchShell>
  );
}

export function TactileArt({ base, top, stem, stemDark, opacity, gradientId }) {
  return (
    <SwitchShell base={base} top={top} opacity={opacity} gradientId={gradientId}>
      <g transform={STEM_SHIFT}>
        <MechanicalStem
          stem={stem}
          stemDark={stemDark}
          body={STEM_BODY}
          cross={STEM_CROSS}
          cap={STEM_CAP}
          leg="M 197.07 186.615 L 180.979 226.642 C 180.027 228.612 185.064 231.345 186.136 232.495 C 186.325 232.698 188.818 234.192 186.716 241.449 L 178.09 277.65 C 178.09 277.65 188.144 277.703 196.867 277.703"
          edgePoints="191.012 201.527 196.083 189.089 196.083 277.706 191.021 277.708"
        />
      </g>
    </SwitchShell>
  );
}

export function ClickyArt({ base, top, stem, stemDark, opacity, gradientId }) {
  return (
    <SwitchShell base={base} top={top} opacity={opacity} gradientId={gradientId}>
      <g transform={STEM_SHIFT}>
        <path fill={stem} d="M 213.413 58.335 L 297.599 58.471 L 297.5 87.688 C 297.493 92.808 297.376 98.499 297.635 103.569 C 297.822 107.193 300.693 112.46 301.493 116.174 C 302.559 121.12 301.735 126.088 301.939 130.987 L 301.926 136.077 C 304.686 136.059 315.836 136.144 315.836 136.144 L 315.797 148.998 L 196.526 148.998 C 196.608 142.202 196.675 137.596 196.715 136.281 L 208.783 136.212 L 208.799 125.314 C 208.783 121.996 208.686 119.162 209.598 115.921 C 210.731 111.898 212.93 108.3 213.218 104.081 C 213.62 98.197 213.477 91.969 213.477 86.057 C 213.528 76.818 213.413 58.335 213.413 58.335 Z" />
        <path fill={JACKET} d="M 197.07 186.615 L 180.979 226.642 C 180.027 228.612 185.064 231.345 186.136 232.495 C 186.325 232.698 188.818 234.192 186.716 241.449 L 178.09 277.65 C 178.09 277.65 188.144 277.703 196.867 277.703" />
        <polyline fill={JACKET_EDGE} points="191.012 201.527 196.083 189.089 196.083 277.706 191.021 277.708" />
        <rect x="231.572" y="138.437" width="47.465" height="66.152" fill={stem} />
        <path fill={JACKET} d="M 315.787 301.065 L 303.633 301.049 L 303.655 269.823 L 289.568 269.867 L 280.409 269.917 L 280.315 271.273 C 275.989 271.376 225.387 271.4 225.387 271.4 L 225.295 268.067 L 207.453 268.049 L 207.482 277.771 L 195.24 277.698 L 195.222 185.382 L 315.797 185.382 L 315.787 301.065 Z" />
        <path fill={JACKET_EDGE} d="M 225.115 185.256 L 285.847 185.025 L 285.671 214.51 L 285.59 219.685 L 285.584 269.863 L 280.315 271.273 L 280.534 190.146 L 230.261 190.119 L 230.171 271.432 L 225.118 271.444 L 225.109 219.601 L 225.131 214.583 L 225.115 185.256 Z" />
        <path fill={stemDark} d={STEM_CAP} />
        <path fill={JACKET_EDGE} d="M 243.101 201.576 L 267.857 201.388 L 267.75 271.363 L 243.103 271.444 L 243.101 201.576 Z" />
        <rect x="246.024" y="205.21" width="18.561" height="66.152" fill={stem} />
        <rect x="228.503" y="201.355" width="55.642" height="3.528" fill={JACKET_EDGE} />
        <path fill={stemDark} d="M 231.483 148.922 L 279.235 148.998 L 279.229 154.088 L 231.483 154.224 L 231.483 148.922 Z" />
      </g>
    </SwitchShell>
  );
}

export function MembraneArt() {
  return (
    <g fill="currentColor" stroke="currentColor">
      <rect x="38.778" y="344.785" width="440.6" height="45.891" />
      <rect x="104.463" y="323.993" width="309.23" height="45.891" strokeWidth={5} />
      <path
        fill="none"
        strokeWidth={13}
        paintOrder="markers stroke"
        d="M 175.632 255.003 C 155.234 255.342 128.2 325.104 128.2 325.104 L 389.956 325.434 C 389.956 325.434 362.205 255.275 337.281 254.959 C 325.122 254.805 316.098 272.902 258.506 274.969 C 223.712 275.909 194.842 254.978 175.632 255.003 Z"
      />
      <path
        strokeOpacity="0"
        paintOrder="stroke markers"
        transform="matrix(0, 1, -1, 0, 527.880497, -344.423587)"
        d="M 465.112 247.387 H 538.991 L 538.991 216.819 L 611.834 268.803 L 538.991 320.786 L 538.991 290.219 H 465.112 V 247.387 Z"
      />
    </g>
  );
}

export const SWITCH_ART = {
  linear: LinearArt,
  tactile: TactileArt,
  clicky: ClickyArt,
};
