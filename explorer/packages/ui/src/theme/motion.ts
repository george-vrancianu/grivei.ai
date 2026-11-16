import { keyframes } from "@mui/material/styles";

/** The skeleton's shimmer: a band sweeping across a block (the design's 1.6 s linear loop). */
export const shimmer = keyframes({ from: { transform: "translateX(-100%)" }, to: { transform: "translateX(100%)" } });

/** The map skeleton's pulse: the neutral areas breathe between 30% and 55% opacity (1.8 s ease-in-out). */
export const pulse = keyframes({ "0%, 100%": { opacity: 0.3 }, "50%": { opacity: 0.55 } });
