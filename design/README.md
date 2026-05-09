# Design references

Stitch-generated designs for Personal OS. These are the visual 
source of truth — implementation must match these.

## Files

- today-desktop-light.png — main landing page, desktop, light theme
- today-desktop-dark.png — main landing page, desktop, dark theme
- today-mobile-light.png — main landing page, mobile, light theme
- week-calendar-desktop-light.png — week view in calendar mode (time grid)
- week-calendar-desktop-dark.png — week view calendar mode, dark
- week-stack-desktop-light.png — week view in stack mode (no time grid)
- week-mobile-light.png — week view, mobile (snap-scroll between days)
- boards-desktop-light.png — kanban board, 4 columns
- boards-desktop-dark.png — kanban dark
- boards-mobile-light.png — kanban mobile (snap-scroll between columns)
- stats-desktop-light.png — analytics page
- settings-desktop-light.png — settings (day rules, habits, account)
- task-detail-panel-light.png — task detail slide-in, light
- task-detail-panel-dark.png — task detail slide-in, dark

## How to use these in prompts

When writing Claude Code prompts that touch UI, attach the relevant 
PNGs to the session and reference them by filename:

  "Match design/stitch/today-desktop-light.png exactly."

Do not describe designs in words when you have a screenshot. Words drift.