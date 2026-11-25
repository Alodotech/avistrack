"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type ChartSize = { width: number; height: number };

export function ResponsiveChart({
  className = "",
  children,
}: {
  className?: string;
  children: (size: ChartSize) => ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartSize | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      const next = {
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      };
      setSize((current) =>
        current && current.width === next.width && current.height === next.height
          ? current
          : next,
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {size ? (
        children(size)
      ) : (
        <div className="h-full w-full bg-gray-100/60" aria-hidden />
      )}
    </div>
  );
}

export function ChartTooltip({
  x,
  width,
  lines,
}: {
  x: number;
  width: number;
  lines: { label: string; value: string; emphasis?: boolean }[];
}) {
  const tooltipWidth = 142;
  const left = Math.min(Math.max(x - tooltipWidth / 2, 0), Math.max(width - tooltipWidth, 0));
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 rounded border border-black/15 bg-white px-2.5 py-2 text-xs"
      style={{ transform: `translateX(${left}px)`, width: tooltipWidth }}
    >
      {lines.map((line) => (
        <p key={line.label} className="flex items-baseline justify-between gap-3">
          <span className="text-gray-600">{line.label}</span>
          <span className={line.emphasis ? "font-semibold tabular-nums" : "tabular-nums"}>
            {line.value}
          </span>
        </p>
      ))}
    </div>
  );
}
