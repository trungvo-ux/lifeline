"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { lyricCues } from "./soundboard-cues"
import "./soundboard.css"

const keys = ["1234", "qwer", "asdf", "zxcv", " "].join("")
// Normal samples and instrumental from https://jkdos.com/daftpunkonsole/.
const pads = [
  { label: "WORK IT", sample: "WorkIt1" },
  { label: "MAKE IT", sample: "MakeIt1" },
  { label: "DO IT", sample: "DoIt1" },
  { label: "MAKES US", sample: "MakesUs1" },
  { label: "HARDER", sample: "Harder1" },
  { label: "BETTER", sample: "Better1" },
  { label: "FASTER", sample: "Faster1" },
  { label: "STRONGER", sample: "Stronger1" },
  { label: "MORE THAN", sample: "MoreThan1" },
  { label: "HOUR", sample: "Hour1" },
  { label: "OUR", sample: "Our1" },
  { label: "NEVER", sample: "Never1" },
  { label: "EVER", sample: "Ever1" },
  { label: "AFTER", sample: "After1" },
  { label: "WORK IS", sample: "WorkIs1" },
  { label: "OVER", sample: "Over1" },
]

export function Soundboard({ enabled = true }: { enabled?: boolean }) {
  const audio = useRef<AudioContext | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const samples = useRef<AudioBuffer[]>([])
  const beat = useRef<HTMLAudioElement | null>(null)
  const guideDismissed = useRef(false)
  const timers = useRef(new Map<number, number>())
  const [lit, setLit] = useState<number[]>([])
  const [showKeyboardTip, setShowKeyboardTip] = useState(false)
  const [lastSound, setLastSound] = useState("LOADING AUDIO")
  const [ready, setReady] = useState(false)
  const [looping, setLooping] = useState(false)
  const [tapeTime, setTapeTime] = useState(0)

  useEffect(() => {
    const context = new AudioContext()
    audio.current = context
    const instrumental = new Audio("/audio/daftpunkonsole/beat.mp3")
    instrumental.loop = true
    instrumental.volume = 0
    instrumental.preload = "auto"
    beat.current = instrumental
    const meter = context.createAnalyser()
    meter.fftSize = 512
    context.createMediaElementSource(instrumental).connect(meter)
    meter.connect(context.destination)
    analyser.current = meter
    const clock = window.setInterval(() => {
      if (!instrumental.paused) setTapeTime(instrumental.currentTime)
    }, 50)
    let mounted = true
    Promise.all(pads.map(async (pad) => {
      const response = await fetch(`/audio/daftpunkonsole/${pad.sample}.mp3`)
      if (!response.ok) throw new Error("Audio unavailable")
      return context.decodeAudioData(await response.arrayBuffer())
    }))
      .then((buffers) => { if (mounted) { samples.current = buffers; setReady(true); setLastSound("READY TO PLAY") } })
      .catch(() => { if (mounted) setLastSound("AUDIO UNAVAILABLE") })
    const activeTimers = timers.current
    return () => {
      mounted = false
      instrumental.pause()
      window.clearInterval(clock)
      for (const timer of activeTimers.values()) window.clearTimeout(timer)
      activeTimers.clear()
      void context.close()
      audio.current = null
      analyser.current = null
    }
  }, [])

  const play = useCallback((index: number) => {
    if (!enabled) return
    if (index === 16) {
      const instrumental = beat.current
      if (!instrumental) return
      if (!guideDismissed.current && window.matchMedia("(min-width: 1200px)").matches) setShowKeyboardTip(true)
      if (instrumental.paused) {
        if (audio.current?.state === "suspended") void audio.current.resume()
        instrumental.volume = 0.48
        void instrumental.play().then(() => { setLooping(true); setLastSound("INSTRUMENTAL") }).catch(() => setLastSound("AUDIO UNAVAILABLE"))
      } else {
        instrumental.pause()
        setTapeTime(instrumental.currentTime)
        setLooping(false)
        setLastSound("INSTRUMENTAL OFF")
      }
      return
    }
    const context = audio.current
    const meter = analyser.current
    const pad = pads[index]
    const buffer = samples.current[index]
    if (!context || !meter || !buffer) return
    if (context.state === "suspended") void context.resume()
    const now = context.currentTime
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    source.connect(gain).connect(meter)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.85, now + 0.006)
    gain.gain.setValueAtTime(0.85, now + Math.max(0.006, buffer.duration - 0.025))
    gain.gain.linearRampToValueAtTime(0, now + buffer.duration)
    source.start(now)
    setLit((current) => [...new Set([...current, index])])
    const previous = timers.current.get(index)
    if (previous) window.clearTimeout(previous)
    timers.current.set(index, window.setTimeout(() => {
      setLit((current) => current.filter((item) => item !== index))
      timers.current.delete(index)
    }, 280))
    setLastSound(pad.label)
  }, [enabled])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      // Shortcuts belong to the page, not to a focused control. In particular,
      // Space must keep its native behavior on buttons and switches.
      if (event.target instanceof HTMLElement && event.target.closest("a, button, input, textarea, select, [contenteditable], [role='button'], [role='link'], [role='switch']")) return
      const index = keys.indexOf(event.key.toLowerCase())
      if (index < 0) return
      event.preventDefault()
      guideDismissed.current = true
      setShowKeyboardTip(false)
      play(index)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [play])

  const minutes = Math.floor(tapeTime / 60)
  const seconds = Math.floor(tapeTime % 60)
  const centiseconds = Math.floor((tapeTime % 1) * 100)
  const timecode = `${minutes}:${String(seconds).padStart(2, "0")}:${String(centiseconds).padStart(2, "0")}`
  // This instrumental edit reaches each matching song section about 5.5s earlier
  // than the vocal recording used for the timestamped lyric source.
  const lyricTime = tapeTime + 5.5
  const lyricCue = lyricCues.find(([start, end]) => lyricTime >= start && lyricTime < end)
  const lyric = lyricCue ? pads[lyricCue[2]].label : ""
  const secondsToFirstLyric = lyricCues[0][0] - lyricTime
  const introCountdown = secondsToFirstLyric > 0 && secondsToFirstLyric <= 3 ? Math.ceil(secondsToFirstLyric) : null
  const upcomingCue = lyricCues.find(([start]) => start > (lyricCue ? lyricCue[0] : lyricTime))
  const upcomingLyric = upcomingCue ? pads[upcomingCue[2]].label : ""
  const lyricProgress = lyricCue ? Math.floor(((lyricTime - lyricCue[0]) / (lyricCue[1] - lyricCue[0])) * 100) : 0

  return (
    <section data-soundboard className="soundboard-wrap" aria-label="Harder Better Faster Stronger soundboard">
      <aside className="soundboard-keyboard-guide t-panel-slide" data-open={showKeyboardTip} aria-hidden={!showKeyboardTip} aria-label="Keyboard controls">
        <p className="soundboard-keyboard-guide-title">Use your keyboard as the soundboard</p>
        <div className="soundboard-keyboard-rows" aria-hidden="true">
          {[0, 1, 2, 3].map((row) => <div className="soundboard-keyboard-row" key={row}>
            {pads.slice(row * 4, row * 4 + 4).map((pad, column) => {
              const index = row * 4 + column
              return <span className={`soundboard-keyboard-key ${lit.includes(index) ? "is-lit" : ""}`} key={pad.sample}>{keys[index].toUpperCase()}</span>
            })}
            <span className="soundboard-keyboard-key soundboard-keyboard-key-muted">{["5", "T", "G", "B"][row]}</span>
          </div>)}
        </div>
      </aside>
      <div className="soundboard">
        <div className="soundboard-grid" role="group" aria-label="Vocal pads">
          <div className="soundboard-speaker" aria-hidden="true">
            <span className="soundboard-grille" />
          </div>
          <div className={`soundboard-display ${looping ? "is-playing" : ""}`} aria-label={`Tape ${timecode}. ${introCountdown !== null ? `Vocals in ${introCountdown}` : lyric ? `Now: ${lyric}` : "Instrumental"}. ${upcomingLyric ? `Up next: ${upcomingLyric}` : ""}`}>
            <div className="soundboard-tape-window" aria-hidden="true">
              <span className="soundboard-tape-time">{timecode}</span>
              <span className="soundboard-tape-reel soundboard-tape-reel-left"><i /></span>
              <span className="soundboard-tape-reel soundboard-tape-reel-right"><i /></span>
              <span className="soundboard-tape-level" />
            </div>
            <div className="soundboard-tape-lyrics">
              <span key={(introCountdown ?? lyric) || "idle"} className={`soundboard-tape-lyric ${introCountdown !== null ? "is-countdown" : ""}`} style={{ backgroundImage: `linear-gradient(90deg, #83cf8a ${introCountdown !== null ? 100 : lyricProgress}%, #f0f0f0 ${introCountdown !== null ? 100 : lyricProgress}%)` }}>{lyric || (introCountdown !== null ? introCountdown : "♪")}</span>
              <span className="soundboard-tape-upcoming">{upcomingLyric}</span>
            </div>
          </div>
          <button type="button" role="switch" className="soundboard-loop" disabled={!ready || !enabled} aria-label="Music, keyboard Space" aria-checked={looping} onPointerDown={() => play(16)} onClick={(event) => { if (event.detail === 0) play(16) }}>
            <span className="soundboard-loop-cap" aria-hidden="true"><span className="soundboard-loop-led" /></span>
          </button>
          {pads.map((pad, index) => (
            <button
              key={index}
              type="button"
              disabled={!ready || !enabled}
              className={`soundboard-pad soundboard-pad-${["green", "blue", "orange", "gray"][Math.floor(index / 4)]} ${lit.includes(index) ? "is-lit" : ""}`}
              aria-label={`${pad.label}, keyboard ${keys[index].toUpperCase()}`}
              onPointerDown={(event) => { if (event.pointerType === "mouse" && !guideDismissed.current && window.matchMedia("(min-width: 1200px)").matches) setShowKeyboardTip(true); play(index) }}
              onClick={(event) => { if (event.detail === 0) play(index) }}
            >
              <span className="soundboard-key-halo"><span className="soundboard-key"><span className="soundboard-key-number">{keys[index].toUpperCase()}</span><span className="soundboard-key-name">{pad.label}</span></span></span>
            </button>
          ))}
        </div>
      </div>
      <span className="sr-only" role="status">{lastSound}</span>
    </section>
  )
}
