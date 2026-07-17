/**
 * Color roles, not raw hex everywhere.
 *
 * Every component reads a *role* (`text`, `surface`, `accent`) rather than
 * a literal color. This is what makes theming (light/dark, and eventually
 * a dynamic accent derived from now-playing artwork in Phase 7 — see
 * docs/architecture/overview.md) a matter of swapping one object instead
 * of hunting for hardcoded hex values across the app.
 *
 * Visual identity: the neutrals are warm, near-black/near-white (not pure
 * #000/#FFF) for a softer, more premium feel than a stark OLED-black
 * competitor UI. The accent is a warm amber ("ember") rather than the
 * green/red/blue already associated with existing streaming products —
 * chosen deliberately to avoid reading as a clone. `accent` is a token,
 * not a constant baked into components, specifically so it can be
 * overridden per-session once dynamic artwork-derived theming exists.
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
  background: '#FAF9F7',
  backgroundElevated: '#FFFFFF',
  surface: '#F0EEEA',
  surfaceSelected: '#E7E3DC',
  surfacePressed: '#DEDAD1',
  border: '#E3E0D9',

  text: '#1C1A17',
  textSecondary: '#6B6559',
  textTertiary: '#9C9587',
  textOnAccent: '#1C1A17',

  accent: '#FF8A3D',
  accentPressed: '#E67527',
  accentMuted: '#FFE3CC',

  danger: '#D64545',
  success: '#3C9D6B',

  overlay: 'rgba(28, 26, 23, 0.5)',
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
