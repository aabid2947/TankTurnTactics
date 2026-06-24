# Human Sign-off — the false-green guard

> The automated gates certify the **instrumented floor only**. This checklist covers what no audit can: taste,
> real assistive-tech behavior, true-device fidelity, and the entire WebGL scene. **A human completes this.
> Claude may not check these boxes or declare "production-grade" on its own.**

## Visual — vs. `REFERENCE.md`, on real devices/browsers
- [ ] Side-by-side with the exemplar — reads as the **same tier**, not "templated competent"
- [ ] Typography, spacing scale, and color match the reference *intent* (not just "passes contrast")
- [ ] Looks right on a **real phone**, not a resized desktop window
- [ ] Dark mode (if in scope) is deliberate; motion feels intentional; **reduced-motion** path is sane

## Accessibility — real assistive tech (axe passing is NOT this)
- [ ] **Keyboard only:** everything reachable, visible focus ring, logical tab order
- [ ] **Screen reader** (VoiceOver / NVDA): labels *meaningful*, state changes announced
- [ ] Focus trapped/returned in modals; forms: errors associated, announced, recoverable
- [ ] Hit targets ≥ 44px; nothing relies on color alone

## Performance — beyond the lab number
- [ ] Tested on a **mid-tier device / throttled network**, not the dev machine
- [ ] No layout shift on real content load; interactions feel responsive (field **INP**, not lab TBT)

## 3D / WebGL — ONLY if the page has a `<canvas>` (NOT covered by ANY automated gate)
> The DOM audits are blind to the canvas; the A-3D gate checks *asset budgets* only. Everything here is human.
- [ ] **Real mid-tier mobile FPS:** the scene holds its target frame rate on an actual mid-range Android — not
      the dev machine, not headless. (`audit:3d:fps` is a local floor smoke-test, **not** this.)
- [ ] **Battery / thermal:** the device doesn't overheat or drain abnormally over a few minutes of use
- [ ] **Canvas a11y fallback:** keyboard-reachable controls for any 3D interaction, and a meaningful
      **non-WebGL DOM alternative** or description (a `<canvas>` is invisible to screen readers)
- [ ] **`prefers-reduced-motion`:** auto-rotation / parallax / heavy motion is reduced or stopped
- [ ] **Low-end / no-WebGL degradation:** graceful fallback when WebGL is unavailable or the GPU is weak

---
**Sign-off:** `name / date` · Loop A: `PASS` · A-3D assets: `PASS` · Reference matched: `yes` · Real-device 3D: `verified`

Only when **every applicable** box is checked is the work **production-grade**. Until then, the honest status
is *"floor green; polish + real-device 3D + a11y reality pending."*
