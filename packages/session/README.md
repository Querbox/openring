# @openring/session

Append-only `.session.jsonl` capture format for OpenRing — one line per BLE event, diff-friendly on GitHub, `jq`-friendly, and replay-friendly.

```ts
import { SessionRecorder } from "@openring/session";

const rec = new SessionRecorder({
  appVersion: "0.0.1",
  platform: "macos",
  device: { id: "abc", name: "R09_7206", firmware: "RT09_3.10.21_251107" },
});

rec.appendConnect("abc");
rec.appendSubscribe("abc", "6e400003-…");
rec.appendNotify("abc", "6e400003-…", new Uint8Array([0x73, 0x0c, 0x1e]));
rec.appendDisconnect("abc");

const jsonl = rec.serialize();
// {"kind":"header","version":1,…}
// {"kind":"connect","ts":…,"id":"abc"}
// {"kind":"subscribe","ts":…,"id":"abc","characteristic":"6e400003-…"}
// {"kind":"notify","ts":…,"id":"abc","characteristic":"6e400003-…","bytes":"730c1e"}
// {"kind":"disconnect","ts":…,"id":"abc"}
```

## Reading sessions back

```ts
import { parse } from "@openring/session";

const { header, events, skipped } = parse(jsonl);
// `skipped` lists lines we couldn't parse — likely a truncated trailing
// line at the end of a session that was interrupted mid-write.
```

## Format guarantees

- **Line 0** is always the `SessionHeader` (`kind: "header"`).
- Every other line is a self-contained event JSON object.
- Bytes are stored as **lowercase hex without separators** so they round-trip cleanly through JSON.
- The format is **versioned** (`SESSION_FORMAT_VERSION`). The parser refuses unknown versions.
- Truncation is graceful: every full line parses, the last partial line is reported in `skipped`.

## Why JSON Lines?

- **GitHub-diffable** — paste a session into an issue and reviewers can review individual packets.
- **`jq`-friendly** — `jq 'select(.kind=="notify")' my.session.jsonl` works out of the box.
- **Append-only** — the recorder never has to rewrite the file.
- **Recoverable** — a truncated session still loads up to the last complete event.
