import { useEffect, useState } from "react";
import type { UseBleResult } from "../ble";

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function RecorderControls({ ble }: { ble: UseBleResult }) {
  const { state, startRecording, stopRecording, openSession } = ble;
  const { active, eventCount, startedAt } = state.recording;

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active || !startedAt) {
      setElapsed(0);
      return;
    }
    setElapsed(Date.now() - startedAt);
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [active, startedAt]);

  if (active) {
    return (
      <div className="recorder is-recording">
        <span className="rec-dot" aria-hidden />
        <span className="rec-time">{formatDuration(elapsed)}</span>
        <span className="rec-sep">·</span>
        <span className="rec-count">
          {eventCount} {eventCount === 1 ? "event" : "events"}
        </span>
        <button
          className="rec-stop"
          onClick={() => void stopRecording()}
          title="Stop recording and save"
          data-tauri-drag-region="false"
        >
          <span className="rec-stop-square" aria-hidden />
          Stop
        </button>
      </div>
    );
  }

  return (
    <div className="recorder">
      <button
        className="rec-start"
        onClick={() => startRecording()}
        title="Start a new recording"
        data-tauri-drag-region="false"
      >
        <span className="rec-dot rec-dot-idle" aria-hidden />
        Record
      </button>
      <button
        className="rec-open"
        onClick={() => void openSession()}
        title="Open a saved .session.jsonl file"
        data-tauri-drag-region="false"
      >
        Open
      </button>
    </div>
  );
}
