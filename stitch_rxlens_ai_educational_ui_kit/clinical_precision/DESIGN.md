---
name: Clinical Precision
colors:
  surface: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f7f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#45474a'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#75777b'
  outline-variant: '#c5c6ca'
  surface-tint: '#5c5e63'
  primary: '#010204'
  on-primary: '#ffffff'
  primary-container: '#1a1d21'
  on-primary-container: '#82858a'
  inverse-primary: '#c5c6cc'
  secondary: '#436086'
  on-secondary: '#ffffff'
  secondary-container: '#b3d1fd'
  on-secondary-container: '#3c597f'
  tertiary: '#000309'
  on-tertiary: '#ffffff'
  tertiary-container: '#151e27'
  on-tertiary-container: '#7d8692'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e2e8'
  primary-fixed-dim: '#c5c6cc'
  on-primary-fixed: '#191c20'
  on-primary-fixed-variant: '#44474b'
  secondary-fixed: '#d3e3ff'
  secondary-fixed-dim: '#abc8f4'
  on-secondary-fixed: '#001c39'
  on-secondary-fixed-variant: '#2a486d'
  tertiary-fixed: '#dae3f0'
  tertiary-fixed-dim: '#bec7d4'
  on-tertiary-fixed: '#141c26'
  on-tertiary-fixed-variant: '#3f4852'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
typography:
  display-lg:
    fontFamily: Epilogue
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 41px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Epilogue
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Epilogue
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  display-lg-mobile:
    fontFamily: Epilogue
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-main: 20px
  gutter: 12px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  safe-bottom: 34px
---

## Brand & Style
The design system for this educational prescription companion focuses on **Trustworthy Modernism**. It prioritizes clinical clarity and accessibility for the Bangladeshi market, bridging the gap between traditional paper prescriptions and AI-driven insights. 

The aesthetic is "medical-adjacent"—avoiding the sterile coldness of hospitals in favor of a sophisticated, editorial approach. It utilizes a **Tactile-Minimalist** style, drawing inspiration from high-quality paper stock, optical lenses, and subtle metallic foils. The UI should feel reliable and authoritative, utilizing generous whitespace and deliberate structural alignment to reduce cognitive load during medical reviews.

## Colors
The palette is rooted in **Graphite** and **Slate** to establish a professional, ink-on-paper foundation. 
- **Primary Graphite (#1A1D21):** Used for primary text and high-priority UI boundaries.
- **Accent Slate (#3D5A80):** Used for interactive elements and brand reinforcement.
- **Muted Slate (#5C6570):** Reserved for secondary information and iconography.
- **Surface Foil (#E8EBEE):** A subtle metallic neutral used for background layering to mimic the texture of medical packaging or high-grade paper.
- **Warm Caution (#A65B00):** A sophisticated amber used for AI confidence warnings and dosage alerts, ensuring visibility without inducing panic.

## Typography
The system employs a dual-type strategy. **Epilogue** serves as the expressive display face, providing a geometric, modern character that feels "designed" and authoritative for in-content titles. **Inter** is the functional workhorse, ensuring maximum legibility for medication names and instructions at various scales.

- **English/Bengali Parity:** When switching to Bengali, line-height should be increased by 15% to accommodate character ascenders/descenders.
- **Dynamic Type:** All body and label styles must scale according to iOS Dynamic Type settings to ensure accessibility for elderly users.
- **Alignment:** Titles are strictly left-aligned within the content flow; no top-bar navigation titles are used.

## Layout & Spacing
The layout follows a strict iOS-native 1-column flow for medical clarity. 
- **Margins:** A standard 20px horizontal margin is applied to all screens.
- **Vertical Rhythm:** A base-8 scale is used for spacing elements. 16px (stack-md) is the default separation between logical groups, while 32px (stack-lg) separates major content sections.
- **Safe Areas:** Adherence to iPhone 15 Pro hardware constraints is required. All interactive elements must sit above the Home Indicator and respect the Dynamic Island "dead zone" at the top of the viewport.

## Elevation & Depth
Depth is communicated through **Tonal Layering** and physical metaphors rather than drop shadows.
- **Level 0 (Background):** Pure White (#FFFFFF).
- **Level 1 (Base Layer):** Foil Silver (#F0F2F5) used for grouping secondary content.
- **Level 2 (Interactive Cards):** White surfaces with a 1px stroke of #E8EBEE.
- **Lens Effect:** For the scanning interface, a subtle 10% opacity black overlay with a backdrop-blur (20px) is used to simulate a camera lens focusing on the physical document.
- **Outline:** Low-contrast outlines (1px solid Graphite at 10% opacity) define interactive boundaries without creating visual noise.

## Shapes
The shape language is "Rounded-Medical"—approachable but disciplined.
- **Primary Cards:** 16px (rounded-lg) corner radius.
- **Primary Buttons:** Fully pill-shaped (capsule) to denote high interactivity.
- **Input Fields:** 12px corner radius for a softer, modern appearance.
- **Foil Accents:** Subtle chamfered edges or 2px radii for "tab" style elements that mimic paper clippings.

## Components
### Primary CTA
Large pill-shaped buttons using Primary Graphite (#1A1D21) for the background and White text. For "Secondary" actions, use an Accent Slate outline with transparent fill.

### Bottom Tab Bar
Standard iOS height with a frosted background blur.
- **Icons:** SF Symbols in "Medium" weight.
- **Active State:** Primary Graphite.
- **Inactive State:** Muted Slate.
- **Labels:** 10px Inter, centered.

### Dose Timing Icons
A custom tri-state iconography set:
1. **Morning Sun:** Active (Accent Slate fill), Inactive (Muted Slate outline).
2. **Noon Partly-Sunny:** Active (Accent Slate fill), Inactive (Muted Slate outline).
3. **Night Moon:** Active (Accent Slate fill), Inactive (Muted Slate outline).

### Confidence Badges
Used for AI uncertainty. Styled with a subtle #A65B00 background at 10% opacity, 1px #A65B00 border, and matching text. Always includes a small "Caution" icon (SF Symbol: exclamationmark.triangle.fill).

### Cards
Minimalist containers for grouping interactive data (e.g., a specific medicine's info). No shadows; instead, use a subtle Foil Silver (#F0F2F5) background or a very light 1px border.

### Input Fields
Clean fields with 12px rounded corners. The active state is indicated by a 2px Accent Slate border. Include a "Language Toggle" (EN/বাংলা) component in the top-right of content areas using a segmented control style.