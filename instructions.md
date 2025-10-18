# 🧠 FlowSync — Build Specification

> A glassmorphic Electron app that detects gaze and orchestrates environment states for gradual entry into flow.

---

## 🧩 0. Overview

We are building **FlowSync**, a next-generation attention-aware desktop app.

**Goal:**  
Detect a user’s gaze, engagement, and fatigue in real time — then adapt lighting, audio, and device context across phases:
1. Calibration / Warm-up  
2. Engagement (Ramp-up)  
3. Sustained Flow  
4. Exit / Cooldown  

FlowSync should combine:
- Apple’s *glassmorphic calm aesthetic*  
- Notion’s *intentional minimalism*  
- Canva’s *interactive clarity*  

---

## ⚙️ 1. Stack to Use

**Primary technologies:**
- **Electron 32** for cross-platform desktop shell  
- **React + Vite** for frontend  
- **TailwindCSS 3.4** for design  
- **Framer Motion** for transitions  
- **Lucide Icons** for outline iconography  
- **MediaPipe Tasks Vision (Iris + FaceMesh)** for gaze tracking  
- **Node.js (IPC)** for backend orchestration  

**Optional integrations:**
- **Spotify Web API** – adaptive music  
- **Philips Hue / LIFX API** – lighting  
- **Slack / Discord APIs** – status control  
- **Raspberry Pi endpoint** – phone internet cut-off  

---

---

## 🎨 3. Design Language — “Calm Intelligence”

Cursor should apply **consistent visual rules** to all UI elements.

### Color Palette
- Background: `#0D0D0D`
- Glass panels: `rgba(255,255,255,0.08–0.15)`
- Accent: `#A7C7E7` (arctic blue) or soft lavender  
- Text: `rgba(255,255,255,0.9)` primary, `0.6` secondary  

### Typography
- Font: `SF Pro Display` (fallback: `Inter`)
- Weight: `300–500`, no heavy fonts  
- Large heading spacing; low-contrast subtext  

### UI Principles
- Use **glassmorphism** with backdrop blur (`blur(20px)`)  
- Rounded corners: `16px` standard, `24px` for modals  
- Subtle drop shadows, soft light reflections  
- Fade transitions only — no pops or bounces  
- Large white space, 8pt grid rhythm  
- Single-column layout with center alignment  

### Animation
- Use **Framer Motion** for all fades/slides  
- Duration: `0.8s–1.2s` ease-out  
- State transitions reflect flow phases visually:  
  - Warm-up → fade-in clarity  
  - Flow → high-transparency, stable UI  
  - Cooldown → dim and desaturate  

---

## 👁️ 4. Gaze Tracking Setup

Cursor should configure **MediaPipe Iris** (preferred) with fallback to **WebGazer.js**.

### MediaPipe Configuration
- Load the **Tasks Vision** package locally.  
- Capture webcam input via `@mediapipe/camera_utils`.  
- Compute:
  - **Fixation stability** (variance of gaze direction)
  - **Saccade rate** (sudden gaze jumps)
  - **Blink detection** (eyelid landmark distance)
  - **Pupil dilation change** (proxy for LC-NE arousal)

### Metrics to Expose
| Metric | Description | Usage |
|---------|-------------|-------|
| fixation_stability | variance of gaze vector | detect focus consistency |
| blink_rate | blinks per minute | detect fatigue |
| saccade_rate | rapid gaze changes | detect distraction |
| pupil_variance | dilation fluctuation | infer engagement/arousal |

---

## 🔄 5. Phase Logic (4-Stage Flow Model)

Cursor should implement a **state machine** for attention:

| Phase | Trigger | Action |
|-------|----------|--------|
| **Calibration / Warm-up** | High saccade rate + dispersed gaze | Reduce visual clutter, dim lights, fade UI |
| **Engagement (Ramp-Up)** | Gaze clusters form, dispersion ↓ | Play ambient tone, adaptive music, increase clarity |
| **Sustained Flow** | Fixation stability > threshold, blink ↓ | Lock distractions, adjust lighting to neutral tone |
| **Exit / Cooldown** | Blink rate ↑, saccade ↑ | Fade out music, brighten lights, prompt microbreak |

### Transition Rules
- Use **rolling 5-second windows** for metrics.  
- Phase shifts require stability > threshold for ≥ 3 seconds.  
- Environment actions handled via IPC (Node side).

---

## 🌐 6. Environment Integrations

Cursor should prepare Node-side service files for optional control endpoints.

| Integration | Trigger | Method |
|--------------|----------|--------|
| **Spotify API** | Engagement / Flow | Switch playlist, set volume |
| **Hue / LIFX API** | All phases | Adjust color temperature / brightness |
| **Slack / Discord API** | Flow phase | Set “In Flow” status |
| **Raspberry Pi** | Flow phase | Send `POST /block_phone` |
| **Chrome Extension Bridge** | Flow phase | Hide non-work tabs |

Each file in `/integrations` exports an async function (e.g. `setHueState(phase)`, `updateSpotifyPhase(phase)`).

---

## 🪞 7. UI Components to Include

| Component | Purpose |
|------------|----------|
| `GlassCard` | Base translucent container |
| `PhaseIndicator` | Displays current phase + color glow |
| `ControlPanel` | Buttons to toggle gaze tracking / integrations |
| `MetricOverlay` (optional) | Small floating widget with live gaze metrics |

---

## 🔊 8. Audio & Feedback

- Background sound control via Spotify API.  
- Add gentle “transition tones” between phases (one-tone synth or soft chime).  
- Audio volume dynamically scales with engagement level.  

---

## 🧰 9. Logging & Analytics

Cursor should log session data locally (`~/Library/FlowSync/sessions.json` or `AppData/FlowSync/`):
- `timestamp_start`
- `phase_transitions`
- `fixation_stability_avg`
- `blink_rate_trend`
- `flow_duration`

Future-ready for integration with Supabase or a local SQLite DB.

---

## 🧠 10. Aesthetic Behavior per Phase

| Phase | Visual Treatment | Motion / Lighting |
|--------|------------------|------------------|
| **Warm-up** | Blurred panels, pastel tint | Slow fade-in, opacity ~0.7 |
| **Engagement** | Clarity increase, accent glow | Slight zoom-in, hue shift |
| **Flow** | High transparency, crisp text | Still state, no motion |
| **Cooldown** | Reintroduce blur, low saturation | Soft pulse, ambient desaturation |

---

## 🧩 11. Implementation Order

Cursor should follow this build order:

1. Scaffold Electron + React + Tailwind base  
2. Add MediaPipe gaze tracker (phase metrics only)  
3. Implement 4-phase state machine  
4. Design glassmorphic UI + Framer transitions  
5. Add integrations (Spotify, Hue, Pi)  
6. Add local session logging  
7. Final polish (blur effects, shadows, icons)

---

## 🔗 12. Optional Enhancements

- **Focus Score Dashboard:** display flow endurance over sessions  
- **AI Mode:** GPT or local model explains focus data trends  
- **Tray Icon Control:** quick toggle for FlowSync on/off  
- **Auto-calibration:** run 5-sec gaze calibration when user returns  

---

## ✅ 13. Deliverables

- Running Electron app (`npm run start`)  
- Minimal, glassmorphic UI consistent across macOS and Windows  
- Gaze metrics dashboard with smooth transitions  
- 4-phase flow orchestration pipeline functional  
- Optional API integrations working with `.env`  

---

> **Design Philosophy:**  
> The system should feel *invisible* — calm, ambient, and responsive.  
> Every interaction should lower cognitive friction and reward focus.