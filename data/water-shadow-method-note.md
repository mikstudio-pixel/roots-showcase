# Water Shadow Method Note

Experiment for later: a standalone fixed canvas layer over the project page, separate from the window-shadow projection. The layer renders a soft water-caustic field across the wall, with slow organic loops/strands and occasional expanding droplet rings.

Gallery-compatible control vocabulary to keep:
- Depth offset
- Softness
- Blur
- Contrast
- Saturation
- Light angle
- Pattern X
- Pattern Y
- Scale
- Motion
- Haze texture

Implementation note: prefer a lightweight canvas or shader layer that covers the full viewport, not the projected window-shadow composition. The visual target is a subtle wall wash of water caustics with rare ripple circles, not an oval vessel projection.
