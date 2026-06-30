# @openring/core

Cross-platform SDK surface for OpenRing. Defines the device, service, characteristic, and packet types every app and package depends on.

This package is intentionally tiny — it holds the contracts. Concrete BLE transport lives in `@openring/ble`; protocol decoding lives in `@openring/parser` and `@openring/protocol`.
