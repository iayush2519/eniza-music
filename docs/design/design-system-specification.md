This document serves as the final, official Component Inventory and Implementation Specification handoff to the engineering team for ENIZA Version 1.0.

All specifications are strictly derived from the approved, frozen UI designs. No modifications or feature additions are permitted beyond what is documented here.

# ENIZA Version 1.0: Component Inventory & Implementation Specification {#eniza-version-1.0-component-inventory-implementation-specification}

## Document Overview

This document contains the complete technical specification for implementing the ENIZA music streaming application based on the finalized Version 1.0 UI designs. It covers all visual tokens, reusable components, screen hierarchies, navigation flows, and deployment strategies.

## 0. Design System Tokens (Global) {#design-system-tokens-global}

*Version 1.0 Frozen Constants*

### Color Palette

| **Token Name** | **HEX** | **Usage** |
|----|----|----|
| background_primary | \#FFFFFF | Main screen background. |
| surface_primary | \#FFFFFF | Card backgrounds, containers. |
| accent_blush | \#E6A8A8 | Primary interactive elements, focused states, select icons. |
| accent_rose | \#F5BDBD | Secondary accent, subtle gradients, secondary CTA, badges. |
| text_primary | \#333333 | Headings, primary body text (Charcoal). |
| text_secondary | \#828282 | Subtitles, labels, placeholders, inactive states (Gray). |
| border_primary | \#E5E7EB | Input borders, separators. |
| shadow_soft | rgba(0,0,0,0.05) | Card shadows (diffused). |

### Typography

| **Style Token** | **Font Family** | **Size** | **Weight** | **Usage** |
|----|----|----|----|----|
| h1_display | Editorial New | 32px | Medium | Welcome headers, major titles. |
| h2_section | SF Pro | 22px | Semibold | Section titles (e.g., \"Continue Listening\"). |
| h3_sub | SF Pro | 18px | Medium | Minor headers, stats labels. |
| body_primary | SF Pro | 16px | Regular | Standard reading, input fields. |
| body_secondary | SF Pro | 14px | Regular | Subtitles, artist names, descriptions. |
| caption | SF Pro | 12px | Medium | Tab labels, small tags. |
| label_all_caps | SF Pro | 12px | Medium | Uppercase tags (e.g., genre tags). |

### Spacing System (8px Grid)

| **Token Name** | **Value** | **Usage**                                         |
|----------------|-----------|---------------------------------------------------|
| spacing_tight  | 4px       | Internal component padding (tightest).            |
| spacing_base   | 8px       | Separating very related components (label/input). |
| spacing_md     | 16px      | Internal card padding, horizontal screen margins. |
| spacing_lg     | 24px      | Vertical margin between grouped elements.         |
| spacing_xl     | 32px      | Major section margins, safe area padding.         |

### Border Radius Constants

| **Token Name** | **Value**   | **Usage**                                   |
|----------------|-------------|---------------------------------------------|
| radius_md      | 12px        | Small inputs, toggles.                      |
| radius_lg      | 16px        | Default components (input, text inputs).    |
| radius_xl      | 20px        | Standard cards (album, artist), list items. |
| radius_xxl     | 28px-32px   | Primary feature cards, bottom sheets.       |
| radius_pill    | 999px (50%) | CTA buttons, profile avatars.               |

# 1. Component Inventory {#component-inventory}

The following reusable components have been identified in the approved design system.

### Global Components (Common)

| **Component Name** | **Purpose** | **Variants** | **States** | **Reusable** |
|----|----|----|----|----|
| PrimaryButton | Major screen CTA. Full-width or centered pill. | Blush Fill, Rose Fill | Default, Pressed, Disabled | Yes |
| TextButton | Secondary action or link. Accent text, no border. | Accent Text | Default, Pressed, Disabled | Yes |
| IconButton | Compact icon-only action. Standard sizing. | Light/Dark Icon | Default, Pressed | Yes |
| Avatar | Round profile photo placeholder with optional badge. | Standard, With Badge | \- | Yes |
| TextInput | Basic single-line form field with optional label/icon. | Bordered, Minimal | Focused, Inactive, Error | Yes |
| Header | Main application top navigation with branding/icons. | Home, Detail View | \- | Yes |
| TabNavigator | Sticky bottom navigation bar with icons and labels. | 5-Tab Layout | Active (Accent), Inactive | Yes |
| AlbumCard | Standard grid card for album artwork and info. | Horizontal, Vertical | \- | Yes |
| ArtistCard | Rounded card for artist profile and info. | Full Round | \- | Yes |
| PlaylistCard | Standard list item for playlists. | Standard | \- | Yes |
| RecommendationCard | Feature card with adaptable gradient and artwork. | Standard | \- | Yes |
| ProgressSeekBar | Music track duration slider and progress visualization. | Thin, Standard | Seekable | Yes |
| VolumeSlider | Compact volume control slider. | Standard | Adjustable | Yes |
| SegmentedControl | Multi-select view (e.g., Playlists/Albums/Artists). | Primary | Active Segment | Yes |
| MiniPlayer | Sticky playback control overlay above Tab Bar. | Compact | Playing, Paused | Yes |
| EqualizerGrid | Frequency adjustment sliders with glowing elements. | Standard | Adjustable | No (Player Spec) |
| SleepTimerDial | Circular dial interface for timer setting. | Standard | Adjustable | No (Player Spec) |

### Functional & State Components {#functional-state-components}

| **Component Name** | **Purpose** | **Variants** | **Used In** | **Reusable** |
|----|----|----|----|----|
| SkeletonLoader | Visual placeholder while content loads. | Header, List, Card, Detail | All major lists | Yes |
| EmptyState | Full screen or widget placeholder for missing content. | Library, Home, Download | Library, Home | Yes |
| OfflineBanner | Global banner informing user of disconnected status. | Top Banner, Toast | System | Yes |
| ErrorToast | Brief success/error message notification. | Red Text, Success Text | Actions | Yes |
| ContextContextMenu | Dropdown menu for additional actions (songs, albums). | Bottom Sheet, Dialog | Full Player, Song Lists | Yes |
| ConfirmDialog | Confirmation modal for critical actions (Delete). | Dialog | Settings, Delete | Yes |

# 2. Screen Architecture {#screen-architecture}

The component hierarchy for every screen is detailed below.

### AUTHENTICATION Flow

- **Splash**

  - Container -\> Background(White) -\> BrandWordmark(ENIZA)

- **Onboarding (1-3)**

  - Container -\> OnboardingIllustration -\> PaginationDots -\> CTA_Button -\> TextButton

- **Login**

  - H1_Welcome -\> Subheader -\> TextInput(Email) -\> TextInput(Password) -\> PrimaryButton(Sign In) -\> TextButton(Forgot?)

- **Verification (OTP/Email)**

  - Header -\> InstructionText -\> VerificationInputFields -\> CountdownTimer -\> TextButton(Resend) -\> PrimaryButton(Verify)

- **Success Confirmation**

  - Container -\> SuccessIllustration -\> SuccessTitle -\> InstructionText -\> PrimaryButton(Start)

### HOME Screen (Tab 1)

- Header (ENIZA Wordmark, SearchIcon, ProfileAvatar)

- ScrollView -\> MainStack

  - RecommendationCard (ENIZA Daily Soundscape)

  - H2_Header(Curated For You) -\> AlbumCardList(Horizontal)

  - H2_Header(New Wave) -\> AlbumCardList(Vertical Grid)

- MiniPlayer(Sticky Overlay)

- TabNavigator

### MUSIC Views

- **Album Details**

  - Header(BackArrow, MoreIcon) -\> ParallaxCoverArt

  - H2_Title -\> SubTitle(Liner Notes)

  - PlaybackButtons -\> ContextActions

  - SongListView(Rounded Cell Items, ContextMenu)

- **Full Player**

  - Header(BackArrow, MoreIcon, CastIcon) -\> PlayerArt(Standard Card)

  - PlayerControls_ProgressBar

  - SongInfo(H3_Title, Body2_Subtitle)

  - VolumeControl_ContextMenuActions

- **Lyrics View**

  - Header(BackArrow) -\> LargeArtwork(Blurred Background)

  - CenteredLyricText

- **Equalizer Spec**

  - Header(BackArrow) -\> H2_EqualizerTitle -\> PresetsGrid

  - CustomEqualizerSliders -\> PrimaryButton(Save)

- **Sleep Timer Spec**

  - Header(BackArrow) -\> CircularTimerDial -\> ActionButtons(Set, Cancel)

### LIBRARY Screen (Tab 3)

- Header (H2_LibraryTitle, ProfileAvatar)

- SegmentedControl(Playlists/Albums/Artists)

- ContentArea

  - **IF EMPTY:** EmptyState(Illustration, Text, PrimaryButton_Add)

  - **IF CONTENT:** RoundedList_PlaylistCards, RoundedList_AlbumCards, RoundedList_ArtistCards

- TabNavigator

### PROFILE Screen

- Header(BackArrow, SettingsIcon) -\> LargeAvatar -\> EditProfileButton

- StatsSection(H3_Title, BarChart)

- RoundedList_ActivityFeed_SubscriptionCell

### SETTINGS Screen Flow

- Header(BackArrow) -\> H2_SettingsTitle

- **Appearance / Audio / Storage / Notifications Panels**

  - RoundedCells_SwitchToggles

  - SegmentedControl(Data Usage)

  - SecondaryButton(Clear Data, Reset)

# 3. Navigation Flow {#navigation-flow}

This describes primary navigation paths and transitions.

## Authentication Path

- **Splash** -\> *(Fade transition, 300ms)* -\> **Onboarding (1-3)** -\> *(Push transition)* -\> **Login** -\> *(Modal push)* -\> **Start Verification Flow** -\> *(Modal push)* -\> **Success Confirmation** -\> *(Fade/Scale transition)* -\> **Home**

## Main Application Tabs

- Primary navigation within the Tab Bar is instantaneous and consistent.

- **Home (Tab 1)** \<-\> **Search (Tab 2)** \<-\> **Library (Tab 3)** \<-\> **AI (Tab 4)** \<-\> **Notifications (Tab 5)**

## Music Playback Flow

- Drill-down navigation is generally a Push transition.

- **Home** -\> **Album Detail** -\> Full Player (Pushes over detail, and mini-player expands)

- **Mini Player** -\> *(Expand animation)* -\> **Full Player**

# 4. State Management Mapping {#state-management-mapping}

States apply globally across screens for consistency.

| **Global State** | **Visual Representation** | **Requirements** |
|----|----|----|
| **Loading** | SkeletonLoader for all lists/cards. | Renders automatically until data fetch success. |
| **Empty** | EmptyState component with illustration. | Used when content list is null or 0 length (Library, Home, AI Recommendations). |
| **Error** | Red Border on inputs, ErrorToast, Error illustration in state containers. | Triggered on form validation failure or server errors. |
| **Offline** | OfflineBanner at top of Home, disabled non-cached states. | System-level state triggered when network connectivity is lost. |
| **Disabled** | Faded component style, non-interactive. | Applied when actions are unavailable (unfilled form fields). |

# 5. Asset Inventory {#asset-inventory}

All assets must be integrated as specified.

### Icons (Line Art Style, Standardized)

- Standard line icon set required (consistent with Lucide or custom to match style).

- **Essential List:** Play, Pause, Next, Previous, Shuffle, Repeat, Heart, HeartFill, Download, Share, Search, Settings, ArrowLeft, MoreVertical, MoreHorizontal, Microphone, Waveform, Calendar, Folder, List, Grid, VerifiedSuccessCheck.

### Illustrations (Abstract Rosy/Glow)

- Onboarding 1, 2, 3 illustrations.

- Empty State illustrations (Library, Home).

- Verification Flow abstract graphics.

- AI Visualization (Glowing Abstract Soundwave).

### Artwork Placeholders

- Square placeholder format with abstract, adapted gradients as seen in UI mockups.

# 6. Implementation Priority {#implementation-priority}

Development is organized into logical phases for efficiency.

## Phase 1: Theme & Assets {#phase-1-theme-assets}

- Setup theme provider (colors, spacing, typography).

- Integrate and standardize line-art icon pack.

- Import all abstract illustrations.

## Phase 2: Reusable Components

- Implement all global components (Buttons, Inputs, Cards, App Bars, Bottom Sheets).

- Validate all states for global components.

## Phase 3: Authentication Flow

- Build out Splash, Onboarding 1-3, Login, Register, Forgot Password, Verification flow screens and linking.

## Phase 4: Home (Curated Feed)

- Implement Home screen with horizontal Curated List, continue listening, new releases, and data mapping.

## Phase 5: Music views

- Implement Album Detail screen, Playlist details, Artist details, Full Player (Lyrics/Queue), Equalizer, Sleep Timer.

## Phase 6: AI Features

- Implement AI Assistant Chat and AI Playlist Builder interfaces.

## Phase 7: Profile & Library {#phase-7-profile-library}

- Implement User Profile, Statistics, Library view, Downloads view, Favorites view, and manage playlists.

## Phase 8: Settings

- Implement all settings sub-panels (Appearance, Audio, Storage, Notifications).

# 7. Developer Handoff Checklist {#developer-handoff-checklist}

Please verify the following points before beginning implementation.

1.  **Strict Enforcement:** Confirmed no new components are allowed. Only integrate specified Version 1.0 elements.

2.  **Typography Consistency:** Verified SF Pro and Editorial New are used as defined in tokens, with no custom font substitutions.

3.  **Color Fidelity:** Checked that only approved accent colors \#E6A8A8 and \#F5BDBD and Charcoal \#333333 text are used. No dark modes or new accents.

4.  **Radius & Spacing Standards:** All screens must strictly adhere to the 8px grid and defined radius tokens. No custom spacing.

5.  **Offline State spec:** Clear strategy for showing the Offline State on home and disabling non-cached features.

6.  **Skeleton spec:** Standard loading visualization required for all dynamic lists/grids.

7.  **Final Review:** Read entire document and confirm understanding of every section.
