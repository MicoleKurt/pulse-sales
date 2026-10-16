/*
 * HopeSMS's FloatingPaths background (36 curved strokes drifting along their length),
 * re-coloured to Pulse violet with sky accents. Pure SVG + CSS; no animation library.
 */
export function FloatingPaths({ position = 1 }: { position?: 1 | -1 }) {
  const paths = Array.from({ length: 36 }, (_, i) => {
    const p = position;
    const accent = i % 5 === 0;
    const opacity = Math.min(0.16 + i * 0.012, 0.5);
    return {
      id: i,
      d: `M-${380 - i * 5 * p} -${189 + i * 6}C-${380 - i * 5 * p} -${189 + i * 6} -${312 - i * 5 * p} ${216 - i * 6} ${152 - i * 5 * p} ${343 - i * 6}C${616 - i * 5 * p} ${470 - i * 6} ${684 - i * 5 * p} ${875 - i * 6} ${684 - i * 5 * p} ${875 - i * 6}`,
      width: 0.6 + i * 0.032,
      color: accent ? "var(--accent)" : "var(--primary)",
      opacity: accent ? opacity : opacity * 0.85,
      duration: 20 + (i % 10) * 2,
      delay: -((i % 12) * 0.9),
    };
  });

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg className="size-full" viewBox="0 0 696 316" fill="none" preserveAspectRatio="xMidYMid slice">
        {paths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            pathLength={1}
            stroke={path.color}
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
            strokeDasharray="0.35 0.65"
            className="floating-path"
            style={{ animationDuration: `${path.duration}s`, animationDelay: `${path.delay}s` }}
          />
        ))}
      </svg>
    </div>
  );
}
