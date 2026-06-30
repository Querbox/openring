/**
 * Known 128-bit vendor UUIDs that don't follow the Bluetooth SIG Base
 * UUID pattern. Curated — only entries we've seen in practice on
 * smart rings, phones, or peripherals OpenRing might interact with.
 *
 * Keys are lowercase, dashed, full 36-char UUIDs.
 */

export type VendorEntry = {
  name: string;
  vendor: string;
  category: "service" | "characteristic" | "descriptor";
  notes?: string;
};

export const VENDOR_UUIDS: Record<string, VendorEntry> = {
  // ── Nordic UART ──────────────────────────────────────────────────
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e": {
    name: "Nordic UART Service",
    vendor: "Nordic Semiconductor",
    category: "service",
    notes:
      "Generic serial-over-BLE protocol; widely cloned by cheap whitelabel wearables.",
  },
  "6e400002-b5a3-f393-e0a9-e50e24dcca9e": {
    name: "Nordic UART TX (host → device)",
    vendor: "Nordic Semiconductor",
    category: "characteristic",
  },
  "6e400003-b5a3-f393-e0a9-e50e24dcca9e": {
    name: "Nordic UART RX (device → host)",
    vendor: "Nordic Semiconductor",
    category: "characteristic",
  },

  // ── Apple Continuity ────────────────────────────────────────────
  "d0611e78-bbb4-4591-a5f8-487910ae4366": {
    name: "Apple Continuity Service",
    vendor: "Apple",
    category: "service",
    notes: "Handoff, Universal Clipboard, AirDrop coordination.",
  },
  "8667556c-9a37-4c91-84ed-54ee27d90049": {
    name: "Apple Continuity Notify",
    vendor: "Apple",
    category: "characteristic",
  },
  "9fa480e0-4967-4542-9390-d343dc5d04ae": {
    name: "Apple Nearby Service",
    vendor: "Apple",
    category: "service",
  },
  "af0badb1-5b99-43cd-917a-a77bc549e3cc": {
    name: "Apple Nearby Action",
    vendor: "Apple",
    category: "characteristic",
  },

  // ── Apple Notification Center Service (ANCS) ────────────────────
  "7905f431-b5ce-4e99-a40f-4b1e122d00d0": {
    name: "Apple Notification Center Service (ANCS)",
    vendor: "Apple",
    category: "service",
    notes: "Lets a peripheral receive iOS notification metadata.",
  },
  "9fbf120d-6301-42d9-8c58-25e699a21dbd": {
    name: "ANCS Notification Source",
    vendor: "Apple",
    category: "characteristic",
  },
  "69d1d8f3-45e1-49a8-9821-9bbdfdaad9d9": {
    name: "ANCS Control Point",
    vendor: "Apple",
    category: "characteristic",
  },
  "22eac6e9-24d6-4bb5-be44-b36ace7c7bfb": {
    name: "ANCS Data Source",
    vendor: "Apple",
    category: "characteristic",
  },

  // ── Apple Media Service (AMS) ───────────────────────────────────
  "89d3502b-0f36-433a-8ef4-c502ad55f8dc": {
    name: "Apple Media Service (AMS)",
    vendor: "Apple",
    category: "service",
  },

  // ── Texas Instruments OAD (firmware update) ─────────────────────
  "f000ffc0-0451-4000-b000-000000000000": {
    name: "TI OAD (Over-the-Air Download) Service",
    vendor: "Texas Instruments",
    category: "service",
    notes:
      "Firmware update channel. Treat as read-only unless you have a tested rollback path.",
  },
  "f000ffc1-0451-4000-b000-000000000000": {
    name: "TI OAD Image Identify",
    vendor: "Texas Instruments",
    category: "characteristic",
  },
  "f000ffc2-0451-4000-b000-000000000000": {
    name: "TI OAD Image Block",
    vendor: "Texas Instruments",
    category: "characteristic",
  },
};
