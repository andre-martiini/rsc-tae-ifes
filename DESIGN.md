# Design System Documentation: The Institutional Authority

## 1. Overview & Creative North Star: "The Digital Monolith"

This design system is built to transform the perception of institutional software. Moving away from the cluttered, "form-first" legacy of government portals, our North Star is **The Digital Monolith**. 

The Monolith represents stability, unyielding security, and absolute clarity. We achieve this not through heavy lines or shadows, but through **Architectural Sophistication**. The layout relies on intentional asymmetry, expansive white space, and a high-contrast editorial typography scale. We treat data not as something to be hidden in grids, but as the hero of the experience—displayed with the precision of a high-end financial report.

### Editorial Logic
*   **Asymmetry:** Use staggered column widths (e.g., a narrow sidebar against a wide data-canvas) to break the "bootstrap" feel.
*   **Layering:** Elements should feel like they are "milled" from a single block of material, using depth and tonal shifts rather than borders.
*   **Intentionality:** Every pixel must serve a purpose of compliance or efficiency.

---

## 2. Colors: Tonal Integrity

The color palette is anchored in the official IFES heritage, but modernized through Material Design 3 logic. We prioritize a "Clean White" ecosystem where color is a surgical tool for status and action.

### The "No-Line" Rule
**Prohibit 1px solid borders for sectioning.** To define boundaries, use background color shifts. For example, a `surface-container-low` section sitting on a `surface` background provides a sophisticated, professional transition that feels integrated, not "boxed in."

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of premium paper:
*   **Base Layer:** `surface` (#f8f9fa) – The canvas.
*   **Content Areas:** `surface-container-low` (#f3f4f5) – Secondary information.
*   **Primary Cards:** `surface-container-lowest` (#ffffff) – High-priority data.
*   **Hover/Active States:** `surface-container-high` (#e7e8e9).

### Signature Accents
*   **Primary (IFES Green):** `#006b1f`. Use primarily for "Go" actions, progress completion, and successful compliance markers.
*   **Secondary (IFES Red):** `#ba0816`. Reserved strictly for critical alerts, high-risk scoring, and "Stop" actions.
*   **The "Glass" Rule:** Use `surface-container-lowest` with an 80% opacity and a `20px` backdrop-blur for floating navigation or modal overlays to maintain a sense of environmental depth.

---

## 3. Typography: The Voice of Authority

We use a dual-font strategy to balance institutional weight with modern legibility.

*   **Display & Headlines (Public Sans):** A neutral, geometric sans-serif that conveys government stability. Use `headline-lg` (2rem) for page titles to establish a clear hierarchy.
*   **Body & Labels (Inter):** Chosen for its exceptional readability in data-heavy layouts. The high x-height of Inter ensures that complex forms remain legible even at `body-sm` (0.75rem).

**Editorial Tip:** Use `label-md` in all-caps with `0.05rem` letter spacing for section headers to create an "Official Document" aesthetic.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows are too "soft" for a government institution. We define depth through **Tonal Stacking**.

*   **The Layering Principle:** Place a `surface-container-lowest` card (Pure White) atop a `surface-container-low` background. The subtle 2% contrast difference creates a "Ghost Lift" that is cleaner than any shadow.
*   **Ambient Shadows:** If a floating element (like a Date Picker) is required, use a high-dispersion shadow: `box-shadow: 0 10px 40px rgba(25, 28, 29, 0.04)`.
*   **The Ghost Border:** If accessibility requires a stroke, use `outline-variant` (#becab9) at 20% opacity. Never use 100% opaque borders.

---

## 5. Components: Precision Engineering

### Cards & Data Containers
*   **Rule:** Forbid divider lines. Use `spacing-8` (1.75rem) to separate content blocks.
*   **Styling:** Use `rounded-lg` (0.5rem) for a modern yet professional feel.
*   **Data Viz:** Progress bars should use `primary` (#006b1f) for the fill and `primary-fixed` (#8dfa8f) for the track to create a subtle, monochromatic glow.

### Specialized Form Fields
*   **Date Pickers:** Should use a "Calendar Sheet" layout—a `surface-container-lowest` popover with a `glassmorphism` blur. Dates are selected with a `primary` circular background.
*   **File Uploads:** A "Drop Zone" defined by a dashed `outline` (#6f7a6b) at 40% opacity. Upon file drag, the background shifts to `primary-container` to signal readiness.

### Accordions & Sidebars
*   **Sidebar:** Use `surface-container-lowest`. Active states should be indicated by a vertical 4px bar of `primary` on the left edge, rather than a full-width background color change.
*   **Accordions:** Avoid boxes. Use a simple `title-sm` header. When expanded, the background of the content area shifts to `surface-container-low` to "trap" the eye.

### Interactive Elements
*   **Buttons:**
    *   *Primary:* Solid `primary` (#006b1f) with `on-primary` (#ffffff) text.
    *   *Secondary:* `outline` variant with a `0.5px` stroke at 50% opacity.
*   **Scoring Indicators:** Use a 5-step tonal scale from `secondary-container` (Red) to `primary-container` (Green) to visualize risk and performance.

---

## 6. Do’s and Don'ts

### Do:
*   **Use White Space as a Border:** Allow content to breathe. Use `spacing-12` (2.75rem) between major sections.
*   **Align to the Grid:** Institutional design requires mathematical precision. All elements must snap to the spacing scale.
*   **Layer Surfaces:** Always put the most important information on the "highest" (lightest) surface.

### Don’t:
*   **Don't use 1px black borders:** It creates visual noise and feels "cheap."
*   **Don't use generic shadows:** Avoid the `0 2px 4px` default. It looks like a template.
*   **Don't mix accent colors:** Never use Green and Red in the same component unless it is a comparison chart. Red is for "Danger/Error," Green is for "Success/Progress."