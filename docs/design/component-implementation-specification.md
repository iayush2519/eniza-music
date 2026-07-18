**ENIZA - Design System Specification**

**Reverse-Engineered from Attached UI**

This document details the extracted design system derived strictly from the attached UI board for ENIZA.

### 1. General Assessment {#general-assessment}

- **Design Language:** Clean, minimal, modern, and structured. It primarily uses dark text on light backgrounds with soft accent lighting.

- **Grid System:** Appears to be based on an 8px grid system for layout and spacing.

- **Spacing System:** Consistent use of spacing multiples of 4px and 8px (e.g., 4px, 8px, 16px, 24px).

- **Icon Library:** Clean, line-art (outline) style icons. Similar styles found in libraries like SF Symbols or custom line icons.

- **Shadow System:** Used for components like cards and navigation bars; characterized by soft, diffuse shadows.

### 2. Color Palette {#color-palette}

*Values are estimated from visual analysis.*

#### Brand Colors

| **Use**                 | **HEX**  | **RGB**       | **RGBA**         |
|-------------------------|----------|---------------|------------------|
| **Accent (Red)**        | \#E63946 | 230, 57, 70   | 230, 57, 70, 1   |
| **Light Red (Variant)** | \#FF8A8A | 255, 138, 138 | 255, 138, 138, 1 |

#### Neutral Colors

| **Use**                            | **HEX**  | **RGB**       | **RGBA**          |
|------------------------------------|----------|---------------|-------------------|
| **Primary Text (Black/Dark Gray)** | \#1F2937 | 31, 41, 55    | 31, 41, 55, 1     |
| **Secondary Text (Gray)**          | \#6B7280 | 107, 114, 128 | 107, 114, 128, 1) |
| **Disabled/Borders (Light Gray)**  | \#E5E7EB | 229, 231, 235 | 229, 231, 235, 1  |
| **Background (Faint Gray)**        | \#F9FAFB | 249, 250, 251 | 249, 250, 251, 1  |
| **Surface (White)**                | \#FFFFFF | 255, 255, 255 | 255, 255, 255, 1  |

#### Semantic Colors

| **Use** | **HEX** | **Usage** |
|----|----|----|
| **Success (Green)** | \#10B981 | (Inferred from standard green in verified icon) |
| **Warning/Error (Red)** | \#EF4444 | (Used for the error notification variant) |

### 3. Typography {#typography}

*Values are estimated from visual analysis.*

- **Closest Font Match:** **Inter** (appears very close to a neutral geometric sans-serif typeface).

#### Typographic Scale

| **Type Style** | **Size** | **Weight** | **Line Height** | **Usage** |
|----|----|----|----|----|
| **Heading 1** | \~34px | Medium | \~40px | Primary screen headers |
| **Heading 2** | \~24px | Medium | \~32px | Section titles |
| **Body (Regular)** | \~17px | Regular | \~24px | Standard text, input labels |
| **Body (Small)** | \~15px | Regular | \~20px | Subtitles, captions |
| **Navigation Label** | \~13px | Medium | \~18px | Bottom navigation labels |

### 4. Spacing System {#spacing-system}

Derived from the visible spacing intervals.

- spacing.4 = 4px

- spacing.8 = 8px

- spacing.12 = 12px

- spacing.16 = 16px (common card padding)

- spacing.20 = 20px

- spacing.24 = 24px (common screen margins)

- spacing.32 = 32px

### 5. Layout & Visual Style {#layout-visual-style}

- **Border Radius:**

  - Cards (all types): 24px

  - Primary Buttons (Pill): 999px (full rounding)

  - Inputs: 16px

  - Profile Avatars (Circular): 999px (50% rounding)

- **Shadows:**

  - Used on cards, the Mini Player, and the bottom navigation bar. Soft, diffused, with a high blur radius.

- **Blur Effects:**

  - Used for background overlays (behind context menus/dialogs). Appear as a standard \"backdrop-filter\" style blur (e.g., \~10px blur).

- **Accent Glow:** Subtle glowing red effect behind primary buttons and selected items.

### 6. Component Library {#component-library}

*Measurements are derived directly from the attached UI image.*

#### Buttons (Pill Shape)

| **Property**               | **Value**                                      |
|----------------------------|------------------------------------------------|
| **Height**                 | 48px                                           |
| **Border Radius**          | Pill (999px)                                   |
| **Default Color (Active)** | Red (#E63946), White text                      |
| **Disabled Color**         | Faded Red (rgba(230, 57, 70, 0.4)), White text |

#### Input Fields

| **Property**             | **Value**              |
|--------------------------|------------------------|
| **Height**               | 48px                   |
| **Border Radius**        | 16px                   |
| **Default Border Color** | Light Gray (#E5E7EB)   |
| **Focused Border Color** | Red (#E63946)          |
| **Text Color**           | Primary Text (#1F2937) |

#### Cards (Various Styles)

All cards feature a 24px border radius.

- **Recommendation Card (Vertical):** High-aspect ratio (\~2:3 width/height), square image top, text below.

- **Playlist Card (Horizontal):** Square image left, text right, full width.

- **Stats Bar Chart Card:** Features vertical bars (radius: 8px) in a rosy gradient.

#### Navigation

| **Property**                 | **Value**                            |
|------------------------------|--------------------------------------|
| **Bottom Navigation Height** | 49px (Estimated, + safe area margin) |
| **Navigation Icons**         | 24x24px (standard icon container)    |
| **Label Text**               | \~13px Medium                        |

#### Music Controls

- **Mini Player:** 64px height, soft shadow, full width minus 16px margins.

- **Progress Bars:** Slim horizontal track (gray) with red fill and knob indicator.

### 7. Design Tokens {#design-tokens}

Derived properties formalized into tokens.

> JavaScript
>
> // ENIZA Design Tokens\
> \
> module.exports = {\
> colors: {\
> accent: \'#E63946\',\
> textPrimary: \'#1F2937\',\
> textSecondary: \'#6B7280\',\
> border: \'#E5E7EB\',\
> background: \'#F9FAFB\',\
> surface: \'#FFFFFF\',\
> error: \'#EF4444\',\
> },\
> typography: {\
> fontFamily: \'Inter, sans-serif\',\
> sizes: {\
> h1: 34,\
> h2: 24,\
> body: 17,\
> small: 15,\
> nav: 13,\
> },\
> weights: {\
> regular: \'400\',\
> medium: \'500\',\
> },\
> },\
> spacing: {\
> xs: 4,\
> sm: 8,\
> md: 16,\
> lg: 24,\
> },\
> radius: {\
> sm: 12,\
> md: 16, // Inputs\
> lg: 24, // Cards\
> pill: 999, // Buttons\
> },\
> shadows: {\
> default: \'0px 4px 20px rgba(0, 0, 0, 0.05)\', // Common card shadow\
> },\
> };

### 8. JSON Theme {#json-theme}

A standard JSON theme representation.

> JSON
>
> {\
> \"themeName\": \"ENIZA Light Theme\",\
> \"palette\": {\
> \"primaryAccent\": \"#E63946\",\
> \"text\": {\
> \"primary\": \"#1F2937\",\
> \"secondary\": \"#6B7280\"\
> },\
> \"border\": \"#E5E7EB\",\
> \"background\": \"#F9FAFB\",\
> \"surface\": \"#FFFFFF\"\
> },\
> \"visual\": {\
> \"defaultBorderRadius\": 16,\
> \"cardBorderRadius\": 24,\
> \"primaryButtonHeight\": 48\
> }\
> }

### 9. React Native Theme {#react-native-theme}

An implementation example using typical styled-components syntax.

> JavaScript
>
> // ENIZA React Native Theme Implementation\
> \
> import { DefaultTheme } from \'styled-components/native\';\
> \
> export const enizaTheme: DefaultTheme = {\
> colors: {\
> primary: \'#E63946\',\
> background: \'#F9FAFB\',\
> surface: \'#FFFFFF\',\
> textPrimary: \'#1F2937\',\
> textSecondary: \'#6B7280\',\
> border: \'#E5E7EB\',\
> },\
> spacing: {\
> small: 8,\
> medium: 16,\
> large: 24,\
> },\
> radii: {\
> input: 16,\
> card: 24,\
> button: 999,\
> },\
> typography: {\
> fontFamily: \'Inter-Regular\', // Font variants must be loaded\
> fontFamilyMedium: \'Inter-Medium\',\
> sizes: {\
> h1: 34,\
> body: 17,\
> navLabel: 13,\
> },\
> },\
> };

### 10. Motion Specifications {#motion-specifications}

Derived from standard mobile UI conventions, implicit in the design layout. (All motion values are estimated).

- **Overall Motion Philosophy:** Calm, fluid, soft ease-in/ease-out.

- **Duration (State Changes):** \~150ms (e.g., button press feedback).

- **Duration (Screen Transitions):** \~250-300ms (standard fade/slide transitions).

- **Curve:** Standard Ease-Out or Bezier for natural motion.

### 11. Accessibility Rules {#accessibility-rules}

Derived from best practices applied to the visual system. (Estimated/Inferred).

- **Color Contrast:** All text (Primary and Secondary) against backgrounds appears to meet minimum WCAG standard contrast ratios. Accent Red against backgrounds also meets standard ratios.

- **Disabled States:** Clearly indicated by reduced color opacity.

- **Touch Targets:** All buttons (Primary and in lists) maintain a minimum 44px vertical dimension to meet standard accessibility guidelines (Primary button is 48px).
