import { Platform } from 'react-native';

/**
 * Font families.
 *
 * docs/design/design-system-specification.md §0 specifies two custom
 * typefaces — "Editorial New" for `h1_display` and "SF Pro" for every
 * other style token. Neither font file exists anywhere in this repo (no
 * `.ttf`/`.otf` assets, no `expo-font` `useFonts` call), and no font file
 * was supplied alongside the approved documents — see the Phase 1 report
 * this change ships with, "Known Issues". Per this project's standing
 * "do not generate/invent assets" rule, this cannot be fabricated: the
 * app continues to render with each platform's native system font
 * (unchanged from before this pass) until the actual font files are
 * provided and loaded via `expo-font`, at which point only this file
 * needs to change.
 */
export const fontFamily = Platform.select({
  ios: {
    sans: 'system-ui',
    mono: 'ui-monospace',
  },
  android: {
    sans: 'sans-serif',
    mono: 'monospace',
  },
  default: {
    sans: 'system-ui',
    mono: 'monospace',
  },
});

/**
 * Type scale. Each entry is a complete, ready-to-spread style object
 * (fontSize + lineHeight + fontWeight) rather than independent scales for
 * each property — this guarantees every "title" in the app has the exact
 * same vertical rhythm, rather than screens mixing a title's fontSize with
 * an inconsistent lineHeight.
 *
 * Sizes/weights below are remapped to
 * docs/design/design-system-specification.md §0's frozen typography
 * table. Existing token *names* are kept as-is (renaming them would only
 * touch call sites cosmetically, with no visual effect, and the spec
 * dictates sizes/weights/usage, not variable names) — see the inline
 * mapping on each line. Weight words in the spec ("Medium"/"Semibold"/
 * "Regular") aren't given numeric values there; this maps them using the
 * standard convention already partially in use in this file (400/500/600)
 * rather than introducing a fourth, undocumented weight.
 *
 * `label_all_caps` (spec: 12px Medium, uppercase genre/category tags) is
 * intentionally not added here yet — nothing in the app renders a genre
 * tag or badge today (that's Phase 2's Chip/Badge components), so there
 * is no real usage to derive an `includeFontPadding`/`textTransform`
 * convention against. Adding an unconsumed token now would be guessing at
 * a shape ahead of its first real caller; it will be added alongside the
 * component that actually needs it.
 */
export const typeScale = {
  // Not an explicit spec token; no screen in this phase renders anything
  // this large. Left unchanged (reserved for a future oversized display
  // use, e.g. a hero number on Stats) rather than remapped without a
  // documented target.
  displayLarge: { fontSize: 40, lineHeight: 46, fontWeight: '700' as const },
  // h1_display (spec §0): 32px, Medium. Size already matched the prior
  // value; weight changes 700 (Bold) -> 500 (Medium) to match the spec
  // exactly. Used for the Eniza wordmark (AuthBrandHeader, Splash) and
  // onboarding slide titles.
  displayMedium: { fontSize: 32, lineHeight: 38, fontWeight: '500' as const },
  // h2_section (spec §0): 22px, Semibold, "Section titles". Used for
  // screen-level titles (Library, Register headings).
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
  // h3_sub (spec §0): 18px, Medium, "Minor headers, stats labels". Not
  // yet rendered anywhere in the app (no consumer found) — value updated
  // for when it is.
  subtitle: { fontSize: 18, lineHeight: 24, fontWeight: '500' as const },
  // body_primary (spec §0): 16px, Regular. Already matched exactly;
  // unchanged.
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  // Not an explicit spec token. A bold variant of body_primary for
  // list-item titles (track/playlist titles in TrackRow/PlaylistRow) —
  // the approved UI board consistently bolds these against a Regular
  // subtitle line beneath them, which body_primary alone can't express.
  // Kept as a supporting variant of body_primary rather than a new size.
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  // body_secondary (spec §0): 14px, Regular, "Subtitles, artist names,
  // descriptions" — exactly this token's existing usage. Weight changes
  // 500 -> 400 to match.
  label: { fontSize: 14, lineHeight: 18, fontWeight: '400' as const },
  // caption (spec §0): 12px, Medium, "Tab labels, small tags". Weight
  // changes 400 -> 500 to match.
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
} as const;

export type TypeScaleToken = keyof typeof typeScale;
