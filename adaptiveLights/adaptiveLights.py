import asyncio
import time
from pywizlight import wizlight, PilotBuilder

# ---- CONFIG ----
BULB_IP = "192.168.12.123"   # Replace with your bulb’s IP
UPDATE_INTERVAL = 2           # seconds between focus updates
FADE_STEPS = 100              # finer fade for smooth color blending
FADE_DELAY = 0.1              # slower per-step delay = smoother transitions

# ---- SCIENTIFICALLY-BACKED LIGHTING STATES ----
# Based on: Aston-Jones & Cohen (2005), Cajochen et al. (2005),
# Münch et al. (2006), Figueiro et al. (2013), Miranda et al. (2021), Boubekri et al. (2014)
FOCUS_STATES = [
    (0.0, (255, 80, 80),   40),   # Fatigued / Cool-down (red-amber)
    (0.2, (255, 160, 80),  70),   # Calibration / Warm-up (amber)
    (0.5, (220, 220, 255), 85),   # Engagement / Neutral white
    (0.8, (80, 140, 255),  60),   # Deep Flow / Cool blue
]

# ---- HELPERS ----
def interpolate_color(c1, c2, t):
    """Linear interpolation between two RGB colors."""
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def interpolate_value(v1, v2, t):
    return int(v1 + (v2 - v1) * t)

def get_target_from_focus(focus):
    """Interpolate target RGB + brightness for a given focus score."""
    for i in range(len(FOCUS_STATES) - 1):
        f1, c1, b1 = FOCUS_STATES[i]
        f2, c2, b2 = FOCUS_STATES[i + 1]
        if f1 <= focus <= f2:
            t = (focus - f1) / (f2 - f1)
            color = interpolate_color(c1, c2, t)
            brightness = interpolate_value(b1, b2, t)
            return color, brightness
    return FOCUS_STATES[-1][1], FOCUS_STATES[-1][2]

async def smooth_fade(bulb, start_color, target_color, start_brightness, target_brightness,
                      steps=FADE_STEPS, delay=FADE_DELAY):
    """Smoothly transition bulb from start to target color/brightness."""
    for i in range(steps + 1):
        t = i / steps
        rgb = interpolate_color(start_color, target_color, t)
        bright = interpolate_value(start_brightness, target_brightness, t)
        
        # Update only every few steps to avoid UDP flooding
        if i % 3 == 0 or i == steps:
            await bulb.turn_on(PilotBuilder(rgb=rgb, brightness=bright))
        
        await asyncio.sleep(delay)

async def adaptive_light_loop():
    bulb = wizlight(BULB_IP)
    current_color = (255, 160, 80)
    current_brightness = 70
    print("💡 Adaptive lighting (research-based) active. Press Ctrl+C to stop.")

    while True:
        try:
            focus = float(input("\nEnter current focus score (0–1): "))
            target_color, target_brightness = get_target_from_focus(focus)
            print(f"🎨 Target color: {target_color}, Brightness: {target_brightness}")
            await smooth_fade(bulb, current_color, target_color, current_brightness, target_brightness)
            current_color, current_brightness = target_color, target_brightness
            await asyncio.sleep(UPDATE_INTERVAL)
        except KeyboardInterrupt:
            print("\n🛑 Stopped by user.")
            break
        except Exception as e:
            print(f"⚠️ Error: {e}")
            await asyncio.sleep(2)

if __name__ == "__main__":
    asyncio.run(adaptive_light_loop())
