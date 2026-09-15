"use client";

import React from "react";

export const ICON_SVG_PROPS = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  style: { flexShrink: 0, opacity: 0.85 },
};

export const CATEGORY_ICONS: Record<string, React.ReactElement> = {
  dress: (
    <svg {...ICON_SVG_PROPS}>
      <path d="M10 2a2 2 0 0 0 4 0" />
      <path d="M10 2 6 7l3 1.5-2 11.5h10l-2-11.5 3-1.5-4-5" />
      <path d="M7 8.5c3 1.2 7 1.2 10 0" />
    </svg>
  ),
  suit: (
    <svg {...ICON_SVG_PROPS}>
      <path d="M4 4l5-1 3 4 3-4 5 1v17H4V4z" />
      <path d="M9 3l3 8 3-8" />
      <path d="M12 11v10" />
      <path d="M7 16h3" />
      <path d="M14 16h3" />
    </svg>
  ),
  stroller: (
    <svg {...ICON_SVG_PROPS}>
      <circle cx="8" cy="20" r="2" />
      <circle cx="17" cy="20" r="2" />
      <path d="M18 16H6a2 2 0 0 1-2-2V9a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5v3" />
      <path d="M15 11l4-7h2" />
    </svg>
  ),
  shoe: (
    <svg {...ICON_SVG_PROPS}>
      <path d="M2 17h20v-2.5a2 2 0 0 0-1-1.73l-6.5-3.77H11L7 13H3a1 1 0 0 0-1 1v3z" />
      <path d="M2 17v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2" />
      <path d="M18 17v2a1 1 0 0 0 1 1h3v-3" />
    </svg>
  ),
  bag: (
    <svg {...ICON_SVG_PROPS}>
      <rect x="4" y="8" width="16" height="13" rx="2.5" />
      <path d="M8.5 8V5.5a3.5 3.5 0 0 1 7 0V8" />
      <circle cx="12" cy="12.5" r="0.75" fill="currentColor" />
    </svg>
  ),
};
