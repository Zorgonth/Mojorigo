import { Recycle } from "lucide-react";
export default function GlassRecyclingIcon() {
 return <svg width="30" height="32" viewBox="0 0 30 32" fill="none" aria-hidden="true">
  <path d="M5 12C5 6.5 9 4 15 4s10 2.5 10 8v14c0 2-4.5 3-10 3S5 28 5 26V12Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  <ellipse cx="15" cy="10" rx="3" ry="2" stroke="currentColor" strokeWidth="1.5"/>
  <path d="M5 24c0 2 4.5 3 10 3s10-1 10-3" stroke="currentColor" strokeWidth="1.2"/>
  <Recycle x={10} y={15} width={10} height={10} strokeWidth={1.7}/>
 </svg>;
}
