/** Barre de lecture : play/pause, timeline, vitesse. */
import { useEffect, useState } from "react";
import { totalDuration } from "../engine/sampler";
import { rt, rtEmit, rtSubscribe, setPlaying } from "../runtime";
import { useStore } from "../store";

export default function Playbar() {
  const doc = useStore((s) => s.doc);
  const version = useStore((s) => s.version);
  const [, force] = useState(0);

  // re-render pendant la lecture (temps + curseur)
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (rt.playing) force((n) => n + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const unsub = rtSubscribe(() => force((n) => n + 1));
    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, []);

  void version;
  const total = totalDuration(doc);

  return (
    <div id="playbar">
      <button
        className="btn"
        title="Retour au début"
        onClick={() => {
          setPlaying(false, total);
          rt.playT = 0;
          rt.scrubbing = false;
          rtEmit();
        }}
      >
        ⏮
      </button>
      <button id="playBtn" className="btn primary" title="Lecture / pause" onClick={() => setPlaying(!rt.playing, total)}>
        {rt.playing ? "⏸" : "▶"}
      </button>
      <div id="scrubWrap">
        <input
          type="range"
          id="scrub"
          min={0}
          max={1000}
          value={Math.round((rt.playT / total) * 1000) || 0}
          onChange={(e) => {
            rt.playT = (parseInt(e.target.value) / 1000) * total;
            rt.scrubbing = true;
            rt.playing = false;
            rtEmit();
          }}
        />
      </div>
      <span id="timeLabel">
        {rt.playT.toFixed(1)} / {total.toFixed(1)} s
      </span>
      <select
        id="speedSel"
        title="Vitesse de lecture"
        defaultValue="1"
        onChange={(e) => {
          rt.speed = parseFloat(e.target.value);
        }}
      >
        <option value="0.5">×0.5</option>
        <option value="0.75">×0.75</option>
        <option value="1">×1</option>
        <option value="1.5">×1.5</option>
        <option value="2">×2</option>
      </select>
      {rt.recording && <span id="recBadge">● REC</span>}
    </div>
  );
}
