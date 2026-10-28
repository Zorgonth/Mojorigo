export default function BottleIcon({ color, size = 25 }: { color: "brown" | "white" | "green"; size?: number }) {
 const colours = { brown: ["#916235", "#6d4727"], white: ["#e6f0f8", "#71899c"], green: ["#409660", "#236740"] };
 const [fill, stroke] = colours[color];
 return <svg width={size} height={size} viewBox="0 0 24 28" fill="none" aria-hidden="true">
  <path d="M9 3h6v7c0 2 4 3.5 4 7v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7c0-3.5 4-5 4-7V3Z" fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
  <path d="M9 3h6M9 6h6" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
  <path d="M9 14c-1.5 1.3-1.5 2-1.5 4v5" stroke="white" strokeOpacity=".7" strokeWidth="1.5" strokeLinecap="round"/>
  <path d="M11 18h5v5h-5z" fill="white" fillOpacity=".65"/>
 </svg>;
}
