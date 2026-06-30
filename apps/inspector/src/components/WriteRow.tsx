import { useMemo, useState } from "react";
import { byteSum } from "@openring/decoder";

/** Parse free-form hex input. Tolerates spaces, commas, colons, dashes. */
function parseHexInput(s: string): Uint8Array | null {
  const clean = s.replace(/[\s,:\-_]/g, "").toLowerCase();
  if (clean.length === 0) return null;
  if (clean.length % 2 !== 0) return null;
  if (!/^[0-9a-f]+$/.test(clean)) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToPreview(bytes: Uint8Array, max = 18): string {
  const slice = bytes.subarray(0, max);
  let out = "";
  for (let i = 0; i < slice.length; i++) {
    out += slice[i]!.toString(16).padStart(2, "0").toUpperCase();
    if (i < slice.length - 1) out += " ";
  }
  return bytes.length > max ? out + " …" : out;
}

export function WriteRow({
  deviceId,
  characteristicUuid,
  supportsWrite,
  supportsWriteWithoutResponse,
  onSend,
}: {
  deviceId: string;
  characteristicUuid: string;
  supportsWrite: boolean;
  supportsWriteWithoutResponse: boolean;
  onSend: (
    deviceId: string,
    characteristicUuid: string,
    bytes: Uint8Array,
    opts: { withResponse: boolean },
  ) => Promise<void>;
}) {
  const [hex, setHex] = useState("");
  const [appendChecksum, setAppendChecksum] = useState(false);
  const [withResponse, setWithResponse] = useState(supportsWrite);

  const parsedRaw = useMemo(() => parseHexInput(hex), [hex]);
  const final: Uint8Array | null = useMemo(() => {
    if (!parsedRaw) return null;
    if (!appendChecksum) return parsedRaw;
    const sum = byteSum(parsedRaw);
    const out = new Uint8Array(parsedRaw.length + 1);
    out.set(parsedRaw, 0);
    out[parsedRaw.length] = sum;
    return out;
  }, [parsedRaw, appendChecksum]);

  const status =
    hex.length === 0
      ? null
      : parsedRaw === null
        ? "Invalid hex"
        : final
          ? `${final.length} bytes · ${bytesToPreview(final)}`
          : null;

  return (
    <div className="write-row">
      <div className="write-row-line">
        <input
          className={`write-input ${parsedRaw === null && hex.length > 0 ? "is-invalid" : ""}`}
          type="text"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="Hex bytes, e.g. 73 0C 1E 00"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && final) {
              void onSend(deviceId, characteristicUuid, final, { withResponse });
            }
          }}
        />
        <button
          className="write-send"
          disabled={final === null}
          onClick={() => {
            if (final) {
              void onSend(deviceId, characteristicUuid, final, {
                withResponse,
              });
            }
          }}
          title="Send (Enter)"
        >
          Send
        </button>
      </div>
      <div className="write-row-opts">
        <label className="write-toggle">
          <input
            type="checkbox"
            checked={appendChecksum}
            onChange={(e) => setAppendChecksum(e.target.checked)}
          />
          <span>+ byte-sum checksum</span>
        </label>
        {supportsWrite && supportsWriteWithoutResponse && (
          <label className="write-toggle">
            <input
              type="checkbox"
              checked={withResponse}
              onChange={(e) => setWithResponse(e.target.checked)}
            />
            <span>With response</span>
          </label>
        )}
        {status && (
          <span
            className={`write-status ${parsedRaw === null ? "is-bad" : ""}`}
          >
            {status}
          </span>
        )}
      </div>
    </div>
  );
}
