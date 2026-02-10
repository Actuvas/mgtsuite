# PR2: Grid Discipline + Responsive Breakpoints — Test Plan

## Pre-flight
- [x] `npm run build` passes with zero errors
- [x] `npx tsc --noEmit` — zero dashboard-specific errors
- [x] Security grep clean
- [x] No new dependencies added

## Grid Config Verification
- [ ] Size tiers defined: S (3x3), M (6x5), L (8x5), XL (12x3) at lg breakpoint
- [ ] Widget registry: 11 widgets with defaultTier + allowedTiers
- [ ] Per-breakpoint layouts auto-generated: lg, md, sm, xs
- [ ] No widget has w > cols at any breakpoint
- [ ] xs breakpoint uses cols=1 (single column)
- [ ] Widget constraints: minW=maxW, minH=maxH (locked sizes)

## Visual Checks — Desktop (1440px / lg)
- [ ] Widgets snap to grid — no whitespace gaps between adjacent widgets
- [ ] Row 1: Weather(S) + Quick Actions(XL wraps to next row) + Time(S)
- [ ] All widgets visible, no overflow
- [ ] Drag and drop works (widget-drag-handle)
- [ ] compactType="vertical" — no vertical gaps

## Visual Checks — Tablet (768px / md)
- [ ] 8-column layout
- [ ] S widgets = 4 cols (half width)
- [ ] M/L/XL widgets = 8 cols (full width)
- [ ] No horizontal scrolling
- [ ] All content readable

## Visual Checks — Mobile (480px / sm)
- [ ] 4-column layout
- [ ] All widgets full-width (w=4)
- [ ] Single-column stack
- [ ] No horizontal overflow

## Visual Checks — Narrow Mobile (320px / xs)
- [ ] 1-column layout
- [ ] All widgets w=1 (full width)
- [ ] No overflow, no broken cards

## Functional Checks
- [ ] Layout persists in localStorage (key: openclaw-dashboard-layouts-v2)
- [ ] Reset Layout clears saved layout AND legacy v1 key
- [ ] Widget data fetching unaffected (same queries, same results)
- [ ] isResizable=false confirmed

## Files Changed
- `src/screens/dashboard/constants/grid-config.ts` — NEW: breakpoints, cols, tiers, registry, layouts, persistence
- `src/screens/dashboard/dashboard-screen.tsx` — uses new grid config, multi-breakpoint layouts
- `docs/QA/dashboard_polish_PR2_TESTPLAN.md` — this file

## Regression Risk: LOW
- No widget rendering logic changed
- No API routes changed
- Only grid sizing and layout configuration affected
