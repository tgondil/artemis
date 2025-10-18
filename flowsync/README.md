# 🧠 FlowSync

> Attention-aware environment orchestration for deep focus

A glassmorphic Electron desktop application that uses gaze tracking to detect attention states and orchestrate your environment for optimal flow state.

## ✨ Current Status

The base landing page is now set up with:

- **Electron 38** - Desktop application framework
- **React 18** - UI framework with TypeScript
- **Vite** - Fast build tooling
- **TailwindCSS 3.4** - Utility-first CSS with custom glassmorphic theme
- **Framer Motion** - Smooth animations and transitions
- **Lucide Icons** - Beautiful outline icons

## 🎨 Design Features

The landing page implements the "Calm Intelligence" design language:

- **Glassmorphic UI** - Translucent panels with backdrop blur
- **Dark theme** - Background: `#0D0D0D`
- **Accent colors** - Arctic blue (`#A7C7E7`) and soft lavender
- **Smooth animations** - 0.8s-1.2s fade transitions using Framer Motion
- **SF Pro Display font** - With Inter fallback
- **Minimal, centered layout** - Single-column with generous white space

## 🚀 Getting Started

### Development

```bash
npm start
```

This will launch the Electron app in development mode with hot reload. The app window should open automatically (check if it's behind other windows or on another desktop/space on macOS).

**Note:** The first build takes 15-20 seconds. Subsequent starts are faster with hot reload enabled.

### Build

```bash
# Package the app
npm run package

# Create distributables
npm run make
```

## 📁 Project Structure

```
flowsync/
├── src/
│   ├── main.ts          # Electron main process
│   ├── preload.ts       # Preload script for IPC
│   ├── main.tsx         # React entry point
│   ├── App.tsx          # Main React component (landing page)
│   └── index.css        # Global styles with Tailwind
├── index.html           # HTML template
├── tailwind.config.js   # Tailwind configuration with custom theme
└── vite.*.config.ts     # Vite configurations
```

## 🛣️ Next Steps

According to the build specification, the following features need to be implemented:

1. **MediaPipe Gaze Tracking** - Implement iris tracking and attention metrics
2. **4-Phase State Machine** - Calibration → Engagement → Flow → Cooldown
3. **Environment Integrations** - Spotify, Philips Hue, Slack/Discord, etc.
4. **Session Logging** - Track focus sessions and metrics
5. **UI Components** - Phase indicator, control panel, metrics overlay

## 🎯 Design Specifications

All UI follows these principles:

- Glass panels: `rgba(255,255,255,0.08–0.15)`
- Border radius: `16px` standard, `24px` for modals
- Backdrop blur: `20px`
- Font weight: `300–500` (light to medium)
- Transitions: Fade only, no pops or bounces
- 8pt grid rhythm for spacing

## 📝 Notes

- The app currently shows a beautiful landing page with the core design system
- All animations use Framer Motion for smooth, professional transitions
- TailwindCSS is configured with custom colors and utilities for glassmorphism
- The design is fully responsive and ready for additional components

---

**Design Philosophy:** The system should feel *invisible* — calm, ambient, and responsive. Every interaction should lower cognitive friction and reward focus.

