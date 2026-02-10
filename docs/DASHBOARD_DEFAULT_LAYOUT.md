# Dashboard Default Layout Spec

Enterprise scan order: operational truth first, ambient context last.

## Non-Draggable (Always Visible)
| Element | Position |
|---------|----------|
| Header (title, subtitle, Reset/Add buttons, theme toggle) | Top |
| Quick Actions (New Chat, Terminal, Skills, Files) | Header row |
| Hero Metrics (Model, Sessions, Uptime, Period Spend) | Below header |

## Grid — lg (12-col, ≥1080px)

| Row | Left (cols 0-5) | Right (cols 6-11) | Priority |
|-----|----------------|-------------------|----------|
| **0** | 🟢 System Status (M/6) | 🤖 Active Agents (M/6) | **Above fold** |
| **1** | 💰 Cost Tracker (M/6) | 📊 Usage Meter (M/6) | **Above fold** |
| **2** | 💬 Recent Sessions (M/6) | 📋 Activity Log (M/6) | **Mid** |
| **3** | 🔔 Notifications (M/6) | ⏰ Time (S/3) + 🌤️ Weather (S/3) | Below fold |
| **4** | ✅ Tasks Demo (M/6) | — | Bottom |

## Design Rationale

### Above the Fold (Rows 0-1)
- **System Status**: Authoritative health panel — gateway connection, model, uptime, sessions
- **Active Agents**: What's actually running right now
- **Cost Tracker**: The number that matters most — how much you're spending
- **Usage Meter**: Token consumption context for cost

### Mid (Row 2)
- **Recent Sessions**: Navigate to active work
- **Activity Log**: Single primary event stream (Notifications demoted to avoid competing)

### Below Fold (Rows 3-4)
- **Notifications**: Secondary stream, doesn't fight Activity Log
- **Time & Weather**: Ambient context — nice to have, not operational
- **Tasks (Demo)**: Clearly non-core, labeled with Demo badge

## Responsive Fallbacks
- **md (8-col)**: Auto-flow, full-width widgets stacked by registry order
- **sm (4-col)**: Same as md
- **xs (1-col)**: Single column stack

## Layout Persistence
- Key: `openclaw-dashboard-layouts-v2`
- Reset clears both v2 and legacy v1 keys
- Fresh users always get this default spec
