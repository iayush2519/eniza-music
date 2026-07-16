# State Management (Mobile)

State is deliberately layered by *kind*, not dumped into one global store.
Picking the wrong layer for a piece of state is the most common source of
bugs and re-render issues in RN apps, so this mapping is a hard rule, not a
suggestion.

| Kind of state | Tool | Examples |
|---|---|---|
| Server state (remote, cacheable, revalidatable) | TanStack Query | catalog search results, album/artist pages, user's playlists, library entries |
| Ephemeral UI state (in-memory, resets on app restart) | Zustand (no persistence) | now-playing sheet expanded/collapsed, active tab, modal visibility |
| Persistent client state (survives restart, not server-owned) | Zustand + MMKV persistence middleware | playback queue, last playback position, downloaded-track IDs, theme preference |
| Structured offline/relational data | SQLite via Drizzle | downloaded track metadata, offline playlist snapshots — anything needing relational queries |
| Secrets | expo-secure-store | access token, refresh token — never MMKV, never Zustand-persisted |
| Live playback state | `packages/audio-engine`'s own event stream, surfaced through a thin Zustand wrapper | current position, isPlaying, buffering state |

## Rules

1. **Never persist secrets outside SecureStore.** MMKV is fast but not
   encrypted at rest by default in a way we should trust for tokens.
2. **Server state never lives in Zustand.** If data comes from the API and
   can go stale, it's a TanStack Query concern — including cache
   invalidation on mutation (e.g. liking a track invalidates the library
   query).
3. **Zustand stores are small and domain-scoped** (`usePlaybackStore`,
   `useLibraryUiStore`, `useThemeStore`) rather than one monolithic store.
   Each store's persistence (or lack of it) is explicit at the store
   definition, not incidental.
4. **SQLite is reserved for data that needs relational queries offline.**
   Simple key-value persisted state belongs in MMKV via Zustand middleware;
   don't reach for SQLite unless there's an actual query need (e.g. "tracks
   in downloaded playlist X ordered by position").

## Why this split instead of "just use one library for everything"

TanStack Query and Zustand solve different problems: Query owns the
request/cache/revalidation lifecycle for data we don't own; Zustand owns
state we do own. Blurring that line (e.g. manually caching API responses in
Zustand) reintroduces the exact cache-invalidation bugs Query exists to
prevent.
