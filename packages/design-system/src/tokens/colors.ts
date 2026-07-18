/**
 * Color roles, not raw hex everywhere.
 *
 * Every component reads a *role* (`text`, `surface`, `accent`) rather than
 * a literal color. This is what makes theming (light/dark, and eventually
 * a dynamic accent derived from now-playing artwork in Phase 7 — see
 * docs/architecture/overview.md) a matter of swapping one object instead
 * of hunting for hardcoded hex values across the app.
 *
 * Visual identity (ENIZA Version 1.0 — frozen per
 * docs/design/design-system-specification.md §0 and
 * docs/ui/final-ui-board.jpg): clean white surfaces, charcoal text, and a
 * blush/rose accent pair. `light` below implements exactly the eight
 * tokens the spec freezes (background_primary, surface_primary,
 * accent_blush, accent_rose, text_primary, text_secondary, border_primary,
 * shadow_soft) plus the handful of supporting roles (pressed/selected/
 * tertiary/on-accent/danger/success/overlay) this architecture's `Theme`
 * type requires that the spec doesn't itself enumerate — each of those is
 * derived from an approved hex value (a tint/shade of it), never a new,
 * unrelated color. See inline comments below for exactly which is which.
 *
 * `dark` is intentionally left as the pre-V1 amber theme: Version 1.0 is
 * light-only (per the spec's developer handoff checklist: "No dark modes
 * or new accents"), so dark mode is not exposed anywhere in the app for
 * this phase — see `theme-provider.tsx`. The object is kept, not deleted,
 * so this remains a config change to re-enable later rather than a
 * from-scratch rebuild.
 */
export type ColorRoles = {
  /** App background, the base layer everything else sits on. */
  background: string;
  /** Slightly raised surface: cards, sheets, the mini-player. */
  backgroundElevated: string;
  /** Resting state of an interactive surface (list rows, chips). */
  surface: string;
  /** Selected/active state of an interactive surface. */
  surfaceSelected: string;
  /** Pressed state of an interactive surface. */
  surfacePressed: string;
  /** Hairline borders and dividers. */
  border: string;

  /** Primary text. */
  text: string;
  /** De-emphasized text (metadata, timestamps, captions). */
  textSecondary: string;
  /** Lowest-emphasis text (disabled, placeholder). */
  textTertiary: string;
  /** Text/icon color when placed directly on top of `accent`. */
  textOnAccent: string;

  /** Brand accent. Drives primary actions and the active-state indicator. */
  accent: string;
  /** Pressed state of an accent-colored surface. */
  accentPressed: string;
  /** Low-emphasis tint of the accent, for subtle highlights. */
  accentMuted: string;

  /** Destructive actions and error states. */
  danger: string;
  /** Positive confirmation states (e.g. upload complete). */
  success: string;

  /** Scrim behind modals/sheets. */
  overlay: string;
};

const lightColors: ColorRoles = {
  // background_primary / surface_primary (spec §0) — the spec uses one
  // white for both the base background and every card/surface fill,
  // relying on `shadow_soft` (see `elevation.ts`) rather than a fill-color
  // shift to separate a card from the page behind it.
  background: '#FFFFFF',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  // Not an explicit spec token. Selected/active row-and-chip fill; derived
  // from accent_rose, whose own spec definition ("secondary accent...
  // badges") is the closest documented match for a selected-state tint.
  surfaceSelected: '#F5BDBD',
  // Not an explicit spec token. Pressed-row tint; reuses border_primary —
  // the only neutral gray the spec defines — rather than introducing a
  // new gray.
  surfacePressed: '#E5E7EB',
  // border_primary (spec §0).
  border: '#E5E7EB',

  // text_primary (spec §0, "Charcoal").
  text: '#333333',
  // text_secondary (spec §0).
  textSecondary: '#828282',
  // Not an explicit spec token. Lowest-emphasis text (disabled/
  // placeholder); a lighter tint of text_secondary, not a new gray family.
  textTertiary: '#B3B3B3',
  // Not an explicit spec token. Text/icon color on top of an accent fill
  // (e.g. Button's primary-variant label). White reads reliably against
  // both accent_blush and accent_rose and matches the light-on-pill
  // buttons shown on the approved UI board.
  textOnAccent: '#FFFFFF',

  // accent_blush (spec §0) — primary interactive elements.
  accent: '#E6A8A8',
  // Not an explicit spec token. Pressed-state feedback for an
  // accent-filled control; a deeper shade of accent_blush, not a new hue.
  accentPressed: '#D68F8F',
  // accent_rose (spec §0) — "secondary accent, subtle gradients,
  // secondary CTA, badges", which is exactly this role's existing usage
  // (gradient glow fills in AuthBrandHeader/OnboardingSlide/Splash).
  accentMuted: '#F5BDBD',

  // Not specified by the frozen docs (no hex is given anywhere), but the
  // spec's own state-management table requires a "Red Border on inputs"
  // for the Error state — this is a standard, accessible error red used
  // to satisfy that requirement pending explicit sign-off on an exact hex.
  danger: '#E5484D',
  // Not specified by the frozen docs at all; retained from the prior
  // palette as a placeholder pending explicit sign-off — nothing in the
  // app currently renders this role.
  success: '#3C9D6B',

  // Not an explicit spec token. Modal/sheet scrim; derived from
  // text_primary, matching the existing pattern of deriving the overlay
  // tint from the theme's own primary text color rather than plain black.
  overlay: 'rgba(51, 51, 51, 0.5)',
};

const darkColors: ColorRoles = {
  background: '#121110',
  backgroundElevated: '#1B1A18',
  surface: '#242220',
  surfaceSelected: '#2E2B27',
  surfacePressed: '#38352F',
  border: '#333029',

  text: '#F5F3EF',
  textSecondary: '#B4AEA2',
  textTertiary: '#7C766A',
  textOnAccent: '#1C1A17',

  accent: '#FF8A3D',
  accentPressed: '#FFA05E',
  accentMuted: '#3D2E1E',

  danger: '#E37373',
  success: '#5CBE8C',

  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const colors = {
  light: lightColors,
  dark: darkColors,
} as const;

export type ColorScheme = keyof typeof colors;
export type ColorRole = keyof ColorRoles;
