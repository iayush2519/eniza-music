package expo.modules.audioengine

import android.os.Handler
import android.os.Looper
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

private const val EVENT_STATE_CHANGED = "onPlaybackStateChanged"

/** How often to refresh `positionMs` while a track is actively playing. */
private const val POSITION_SYNC_INTERVAL_MS = 500L

/**
 * The wire shape accepted by `loadQueue`/`setQueue` — only what the native
 * player actually needs to build a `MediaItem`. Rich metadata
 * (title/artist/artwork) intentionally never crosses the JS↔native
 * boundary; per docs/architecture/audio-engine.md, the app's own state
 * (not the engine) owns "what track is this", the engine only owns
 * "what's currently loaded/playing" by id.
 */
class QueueItemInput : Record {
  @Field
  val trackId: String = ""

  @Field
  val streamUrl: String = ""
}

/**
 * Android implementation of the `PlaybackEngine` contract defined in
 * `packages/audio-engine/src/playback-engine.ts` — see
 * docs/architecture/audio-engine.md and ADR 0002. Wraps a single
 * Media3/ExoPlayer instance.
 *
 * State is never read back off the `ExoPlayer` instance from the calling
 * (JS) thread — `ExoPlayer` is only safe to interact with from the thread
 * that owns it (its application/main-looper thread; see AndroidX Media3's
 * threading model docs). Instead, every `Player.Listener` callback (which
 * fires on that same main thread, since the player is built there) updates
 * a `@Volatile` cached snapshot, and `getState()` — a synchronous
 * `Function`, called from the JS thread — only ever reads that snapshot.
 * All player mutation (`loadQueue`/`play`/`pause`/`stop`/etc.) is instead
 * dispatched onto the main queue via `.runOnQueue(Queues.MAIN)`.
 */
class AudioEngineModule : Module() {
  private var player: ExoPlayer? = null
  private val mainHandler = Handler(Looper.getMainLooper())
  private var positionSyncRunnable: Runnable? = null

  /** Whether `play()` has ever been called for the currently loaded queue —
   * distinguishes "loaded but never started" (`ready`) from "explicitly
   * paused after playing" (`paused`), since ExoPlayer's own state enum
   * doesn't draw that distinction (both are `STATE_READY` with
   * `isPlaying == false`). Reset on every `loadQueue`/`stop`. */
  private var hasStartedPlayback = false

  @Volatile
  private var currentState: Map<String, Any?> = idleState()

  private val playerListener = object : Player.Listener {
    override fun onPlaybackStateChanged(playbackState: Int) {
      refreshState()
    }

    override fun onIsPlayingChanged(isPlaying: Boolean) {
      refreshState()
      if (isPlaying) startPositionSync() else stopPositionSync()
    }

    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
      refreshState()
    }

    /**
     * Fires on `moveMediaItem` (queue reorder), `shuffleModeEnabled`
     * changes, and any other playlist-shape change — without this, a
     * reorder wouldn't emit a fresh `positionMs`/`currentIndex` if
     * either shifted as a result, since none of the other listener
     * callbacks above cover a same-item playlist-order change.
     */
    override fun onTimelineChanged(timeline: androidx.media3.common.Timeline, reason: Int) {
      refreshState()
    }

    override fun onPlayerError(error: PlaybackException) {
      stopPositionSync()
      currentState = buildState(status = "error", error = error.message)
      emitState()
    }
  }

  override fun definition() = ModuleDefinition {
    Name("AudioEngine")

    Events(EVENT_STATE_CHANGED)

    OnCreate {
      mainHandler.post { ensurePlayer() }
    }

    OnDestroy {
      mainHandler.post {
        stopPositionSync()
        player?.removeListener(playerListener)
        player?.release()
        player = null
      }
    }

    AsyncFunction("loadQueue") { items: List<QueueItemInput>, startIndex: Int ->
      hasStartedPlayback = false
      currentState = buildState(status = "loading")
      emitState()

      val exoPlayer = ensurePlayer()
      val mediaItems = items.map { item ->
        MediaItem.Builder().setUri(item.streamUrl).setMediaId(item.trackId).build()
      }
      val clampedStartIndex = if (mediaItems.isEmpty()) 0 else startIndex.coerceIn(0, mediaItems.size - 1)
      exoPlayer.setMediaItems(mediaItems, clampedStartIndex, 0L)
      exoPlayer.prepare()
    }.runOnQueue(Queues.MAIN)

    /**
     * Replaces the queue's contents without resetting playback position —
     * per `PlaybackEngine.setQueue`'s contract (distinct from `load`,
     * which always starts fresh at a given index). `resetPosition = false`
     * is `ExoPlayer.setMediaItems`' own documented mechanism for exactly
     * this: keep the current window index/position, clamped to the new
     * list's bounds, rather than restarting the current item.
     */
    AsyncFunction("setQueue") { items: List<QueueItemInput> ->
      val exoPlayer = ensurePlayer()
      val mediaItems = items.map { item ->
        MediaItem.Builder().setUri(item.streamUrl).setMediaId(item.trackId).build()
      }
      exoPlayer.setMediaItems(mediaItems, /* resetPosition = */ false)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("play") {
      hasStartedPlayback = true
      player?.play()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("pause") {
      player?.pause()
    }.runOnQueue(Queues.MAIN)

    /**
     * Stops playback and releases the loaded queue — distinct from
     * `pause()` (which keeps the queue loaded, ready to resume). Matches
     * `ExoPlayer.stop()`'s own documented semantics: transitions to
     * `STATE_IDLE` and keeps the current media items unless explicitly
     * cleared, so `clearMediaItems()` is called too to fully release the
     * queue, matching this milestone's "Stop" requirement.
     */
    AsyncFunction("stop") {
      hasStartedPlayback = false
      stopPositionSync()
      player?.stop()
      player?.clearMediaItems()
      currentState = idleState()
      emitState()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("seekTo") { positionMs: Double ->
      player?.seekTo(positionMs.toLong())
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("skipToNext") {
      player?.seekToNextMediaItem()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("skipToPrevious") {
      player?.seekToPreviousMediaItem()
    }.runOnQueue(Queues.MAIN)

    /**
     * `mode` is one of the JS-side `RepeatMode` union's string values
     * ('off'/'one'/'all') — translated to ExoPlayer's own
     * `Player.REPEAT_MODE_*` int constants here, at the one boundary
     * that needs to know both representations, rather than exposing
     * ExoPlayer's raw ints to JS.
     */
    AsyncFunction("setRepeatMode") { mode: String ->
      player?.repeatMode = when (mode) {
        "one" -> Player.REPEAT_MODE_ONE
        "all" -> Player.REPEAT_MODE_ALL
        else -> Player.REPEAT_MODE_OFF
      }
      refreshState()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("setShuffleEnabled") { enabled: Boolean ->
      player?.shuffleModeEnabled = enabled
      refreshState()
    }.runOnQueue(Queues.MAIN)

    /**
     * ExoPlayer's `setPlaybackSpeed` also affects pitch by default
     * (`PlaybackParameters(speed)` ties speed and pitch together) —
     * acceptable here since this module has no separate pitch-correction
     * requirement; a "speed without pitch shift" mode would need
     * `PlaybackParameters(speed, pitch = 1f)` plus a specific audio
     * processor, which is out of scope unless a future milestone calls
     * for it specifically.
     */
    AsyncFunction("setPlaybackRate") { rate: Double ->
      player?.setPlaybackSpeed(rate.toFloat())
      refreshState()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("reorderQueue") { fromIndex: Int, toIndex: Int ->
      player?.moveMediaItem(fromIndex, toIndex)
    }.runOnQueue(Queues.MAIN)

    Function("getState") {
      currentState
    }
  }

  private fun ensurePlayer(): ExoPlayer {
    val context = appContext.reactContext
      ?: throw IllegalStateException("AudioEngineModule: no React context available yet")

    return player ?: ExoPlayer.Builder(context).build().also {
      it.addListener(playerListener)
      player = it
    }
  }

  private fun refreshState() {
    currentState = buildState()
    emitState()
  }

  private fun emitState() {
    sendEvent(EVENT_STATE_CHANGED, currentState)
  }

  private fun buildState(status: String? = null, error: String? = null): Map<String, Any?> {
    val exoPlayer = player
    val resolvedStatus = status ?: computeStatus(exoPlayer)
    return mapOf(
      "currentIndex" to (exoPlayer?.currentMediaItemIndex ?: -1),
      "positionMs" to (exoPlayer?.currentPosition?.toDouble() ?: 0.0),
      "durationMs" to (exoPlayer?.duration?.takeIf { it >= 0 }?.toDouble() ?: 0.0),
      "status" to resolvedStatus,
      "error" to error,
      "repeatMode" to repeatModeToString(exoPlayer?.repeatMode ?: Player.REPEAT_MODE_OFF),
      "shuffleEnabled" to (exoPlayer?.shuffleModeEnabled ?: false),
      "playbackRate" to (exoPlayer?.playbackParameters?.speed?.toDouble() ?: 1.0),
    )
  }

  private fun repeatModeToString(mode: Int): String = when (mode) {
    Player.REPEAT_MODE_ONE -> "one"
    Player.REPEAT_MODE_ALL -> "all"
    else -> "off"
  }

  private fun computeStatus(exoPlayer: ExoPlayer?): String {
    if (exoPlayer == null) return "idle"
    return when (exoPlayer.playbackState) {
      Player.STATE_IDLE -> "idle"
      Player.STATE_BUFFERING -> "buffering"
      Player.STATE_ENDED -> "ended"
      Player.STATE_READY -> when {
        exoPlayer.isPlaying -> "playing"
        hasStartedPlayback -> "paused"
        else -> "ready"
      }
      else -> "idle"
    }
  }

  private fun idleState(): Map<String, Any?> = mapOf(
    "currentIndex" to -1,
    "positionMs" to 0.0,
    "durationMs" to 0.0,
    "status" to "idle",
    "error" to null,
    "repeatMode" to "off",
    "shuffleEnabled" to false,
    "playbackRate" to 1.0,
  )

  private fun startPositionSync() {
    stopPositionSync()
    val runnable = object : Runnable {
      override fun run() {
        refreshState()
        mainHandler.postDelayed(this, POSITION_SYNC_INTERVAL_MS)
      }
    }
    positionSyncRunnable = runnable
    mainHandler.post(runnable)
  }

  private fun stopPositionSync() {
    positionSyncRunnable?.let { mainHandler.removeCallbacks(it) }
    positionSyncRunnable = null
  }
}
