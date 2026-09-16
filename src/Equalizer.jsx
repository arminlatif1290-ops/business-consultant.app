import React from "react";

// state: "idle" | "listening" | "thinking" | "speaking"
export default function Equalizer({ state = "idle" }) {
  const bars = Array.from({ length: 32 });
  return (
    <div className={`eqWrap eq-${state}`} aria-hidden="true">
      <div className="eqCore" />
      <div className="eqRing">
        {bars.map((_, i) => (
          <div key={i} className="eqBar" style={{ "--i": i }} />
        ))}
      </div>
    </div>
  );
}

export const equalizerCss = `
.eqWrap { position: relative; width: 220px; height: 220px; margin: 0 auto 12px; }
.eqCore {
  position: absolute; inset: 38%; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #B57BFF, var(--teal-deep));
  box-shadow: 0 0 40px rgba(124,58,237,0.45);
  transition: box-shadow 0.4s ease;
}
.eqRing { position: absolute; inset: 0; }
.eqBar {
  position: absolute; top: 50%; left: 50%;
  width: 3px; height: 14px;
  margin-left: -1.5px;
  border-radius: 2px;
  background: var(--brass);
  transform: rotate(calc(360deg / 32 * var(--i))) translate(0, -92px);
  transform-origin: 0 0;
  animation: eqPulse 2.6s ease-in-out infinite;
  animation-delay: calc(var(--i) * -0.08s);
}
@keyframes eqPulse {
  0%, 100% { height: 6px; opacity: 0.35; }
  50% { height: 22px; opacity: 0.9; }
}
.eq-listening .eqBar { animation-duration: 0.7s; background: var(--teal); }
.eq-listening .eqCore { box-shadow: 0 0 55px rgba(124,58,237,0.7); }
.eq-thinking .eqBar { animation-duration: 0.45s; }
.eq-thinking .eqCore { box-shadow: 0 0 55px rgba(232,121,249,0.55); }
.eq-speaking .eqBar { animation-duration: 0.9s; background: var(--brass); }
.eq-speaking .eqCore { box-shadow: 0 0 60px rgba(232,121,249,0.7); }
`;
