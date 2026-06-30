import { SIG_SERVICES } from "./sig-services.ts";
import { SIG_CHARACTERISTICS } from "./sig-characteristics.ts";
import { VENDOR_UUIDS, type VendorEntry } from "./vendor.ts";

export { SIG_SERVICES } from "./sig-services.ts";
export { SIG_CHARACTERISTICS } from "./sig-characteristics.ts";
export { VENDOR_UUIDS, type VendorEntry } from "./vendor.ts";

export type UuidCategory =
  | "sig-service"
  | "sig-characteristic"
  | "vendor-service"
  | "vendor-characteristic"
  | "vendor-descriptor"
  | "unknown";

export interface UuidInfo {
  /** Full lowercase 36-char UUID as supplied. */
  uuid: string;
  /** Friendly name, e.g. "Battery Service", or null if unknown. */
  name: string | null;
  /** Where the name came from. */
  category: UuidCategory;
  /** Short SIG identifier (e.g. "0x180F") when the UUID is a 16-bit SIG type. */
  shortId?: string;
  /** Vendor name for known 128-bit UUIDs. */
  vendor?: string;
  /** Free-form notes from the registry. */
  notes?: string;
}

const BLUETOOTH_BASE_UUID_SUFFIX = "-0000-1000-8000-00805f9b34fb";

/**
 * Look up the friendly name for a BLE UUID.
 *
 * Recognises:
 *  - 16-bit short UUIDs ("180f")
 *  - 32-bit short UUIDs ("0000180f")
 *  - Full 128-bit UUIDs that embed a 16-bit SIG number in the
 *    Bluetooth Base UUID pattern (`0000XXXX-0000-1000-8000-00805f9b34fb`)
 *  - Known 128-bit vendor UUIDs from the curated `VENDOR_UUIDS` table
 *
 * Always returns a `UuidInfo` — `name === null` and `category === "unknown"`
 * when nothing matches, so callers don't need to special-case.
 */
export function lookup(uuid: string): UuidInfo {
  const normalized = normalize(uuid);

  const shortId = extractShortId(normalized);
  if (shortId !== null) {
    const serviceName = SIG_SERVICES[shortId];
    if (serviceName) {
      return {
        uuid: normalized,
        name: serviceName,
        category: "sig-service",
        shortId: formatShortId(shortId),
      };
    }
    const charName = SIG_CHARACTERISTICS[shortId];
    if (charName) {
      return {
        uuid: normalized,
        name: charName,
        category: "sig-characteristic",
        shortId: formatShortId(shortId),
      };
    }
    return {
      uuid: normalized,
      name: null,
      category: "unknown",
      shortId: formatShortId(shortId),
    };
  }

  const vendor: VendorEntry | undefined = VENDOR_UUIDS[normalized];
  if (vendor) {
    return {
      uuid: normalized,
      name: vendor.name,
      category:
        vendor.category === "service"
          ? "vendor-service"
          : vendor.category === "characteristic"
            ? "vendor-characteristic"
            : "vendor-descriptor",
      vendor: vendor.vendor,
      ...(vendor.notes !== undefined ? { notes: vendor.notes } : {}),
    };
  }

  return { uuid: normalized, name: null, category: "unknown" };
}

/**
 * Strip braces, lowercase, optionally expand short forms to full 128-bit.
 */
export function normalize(uuid: string): string {
  let u = uuid.trim().replace(/[{}]/g, "").toLowerCase();
  if (u.length === 4) u = `0000${u}`;
  if (u.length === 8) u = `${u}${BLUETOOTH_BASE_UUID_SUFFIX}`;
  return u;
}

/**
 * If the UUID is a Bluetooth Base UUID with a 16-bit prefix, return the
 * prefix as a number; otherwise null.
 */
function extractShortId(normalized: string): number | null {
  if (!normalized.endsWith(BLUETOOTH_BASE_UUID_SUFFIX)) return null;
  const prefix = normalized.slice(0, 8);
  if (!/^[0-9a-f]{8}$/.test(prefix)) return null;
  const upper = parseInt(prefix.slice(0, 4), 16);
  if (upper !== 0) return null;
  return parseInt(prefix.slice(4), 16);
}

function formatShortId(n: number): string {
  return `0x${n.toString(16).toUpperCase().padStart(4, "0")}`;
}
