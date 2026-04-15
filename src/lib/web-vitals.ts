import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";

export function reportWebVitals() {
  onCLS(console.debug);
  onINP(console.debug);
  onLCP(console.debug);
  onFCP(console.debug);
  onTTFB(console.debug);
}
