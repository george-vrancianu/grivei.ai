/** Hides text from the eye and keeps it for screen readers (a label the design leaves out but a reader needs). */
export const visuallyHidden = { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" } as const;
