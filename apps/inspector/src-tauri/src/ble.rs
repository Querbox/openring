//! BLE backend for the OpenRing Inspector.
//!
//! Exposes a small surface of Tauri commands:
//!  - `ble_start_scan` / `ble_stop_scan`
//!  - `ble_connect`   / `ble_disconnect`
//!  - `ble_discover_services`
//!  - `ble_subscribe` / `ble_unsubscribe`
//!  - `ble_write`
//!
//! And emits Tauri events:
//!  - `ble://device-discovered`  — `BleDevice`
//!  - `ble://connection-changed` — `{ id, state }`
//!  - `ble://packet`             — `BlePacket`
//!
//! The frontend's `TauriBleAdapter` (in `apps/inspector/src/ble/`) is the
//! mirror of this module: every event here has a matching handler there.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use btleplug::api::{
    Central, CentralEvent, Manager as _, Peripheral as _, ScanFilter, WriteType,
};
use btleplug::platform::{Adapter, Manager, Peripheral, PeripheralId};
use futures::stream::StreamExt;
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum BleError {
    #[error("no BLE adapter found on this host")]
    NoAdapter,
    #[error("device {0} not connected")]
    NotConnected(String),
    #[error("characteristic {0} not found on connected device")]
    CharacteristicNotFound(String),
    #[error("invalid uuid: {0}")]
    InvalidUuid(String),
    #[error(transparent)]
    Btle(#[from] btleplug::Error),
}

impl serde::Serialize for BleError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type BleResult<T> = Result<T, BleError>;

#[derive(Serialize, Clone, Debug)]
pub struct BleDevice {
    pub id: String,
    pub name: Option<String>,
    pub rssi: Option<i16>,
    pub manufacturer_data: HashMap<u16, Vec<u8>>,
    pub services: Vec<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct BleCharacteristic {
    pub uuid: String,
    pub properties: Vec<&'static str>,
}

#[derive(Serialize, Clone, Debug)]
pub struct BleService {
    pub uuid: String,
    pub primary: bool,
    pub characteristics: Vec<BleCharacteristic>,
}

#[derive(Serialize, Clone, Debug)]
pub struct BlePacket {
    pub device_id: String,
    pub characteristic_uuid: String,
    pub direction: &'static str,
    pub bytes: Vec<u8>,
    pub timestamp_ms: u128,
}

#[derive(Serialize, Clone, Debug)]
pub struct ConnectionChanged {
    pub id: String,
    pub state: &'static str,
}

/// Shared state held in Tauri's State manager.
pub struct BleState {
    inner: Arc<Mutex<BleInner>>,
}

struct BleInner {
    adapter: Option<Adapter>,
    peripherals: HashMap<String, Peripheral>,
    scan_handle: Option<tokio::task::JoinHandle<()>>,
}

impl BleState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(BleInner {
                adapter: None,
                peripherals: HashMap::new(),
                scan_handle: None,
            })),
        }
    }
}

impl Default for BleState {
    fn default() -> Self {
        Self::new()
    }
}

async fn ensure_adapter(inner: &mut BleInner) -> BleResult<Adapter> {
    if let Some(a) = &inner.adapter {
        return Ok(a.clone());
    }
    let manager = Manager::new().await?;
    let adapters = manager.adapters().await?;
    let adapter = adapters.into_iter().next().ok_or(BleError::NoAdapter)?;
    inner.adapter = Some(adapter.clone());
    Ok(adapter)
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn peripheral_id_string(id: &PeripheralId) -> String {
    format!("{}", id)
}

async fn snapshot_device(p: &Peripheral) -> BleDevice {
    let id = peripheral_id_string(&p.id());
    let props = p.properties().await.ok().flatten();
    let (name, rssi, manufacturer_data, services) = match props {
        Some(props) => (
            props.local_name,
            props.rssi,
            props.manufacturer_data,
            props.services.into_iter().map(|u| u.to_string()).collect(),
        ),
        None => (None, None, HashMap::new(), Vec::new()),
    };
    BleDevice {
        id,
        name,
        rssi,
        manufacturer_data,
        services,
    }
}

#[tauri::command]
pub async fn ble_start_scan(
    app: AppHandle,
    state: State<'_, BleState>,
) -> BleResult<()> {
    let inner_arc = state.inner.clone();
    let mut inner = inner_arc.lock().await;

    if inner.scan_handle.is_some() {
        return Ok(());
    }

    let adapter = ensure_adapter(&mut inner).await?;
    adapter.start_scan(ScanFilter::default()).await?;

    let inner_for_task = inner_arc.clone();
    let app_for_task = app.clone();
    let adapter_for_task = adapter.clone();

    let handle = tokio::spawn(async move {
        let mut events = match adapter_for_task.events().await {
            Ok(e) => e,
            Err(err) => {
                let _ = app_for_task.emit(
                    "ble://error",
                    format!("failed to open central event stream: {err}"),
                );
                return;
            }
        };

        while let Some(event) = events.next().await {
            match event {
                CentralEvent::DeviceDiscovered(id)
                | CentralEvent::DeviceUpdated(id) => {
                    let id_str = peripheral_id_string(&id);
                    let peripheral_opt = adapter_for_task.peripheral(&id).await.ok();
                    if let Some(p) = peripheral_opt {
                        {
                            let mut g = inner_for_task.lock().await;
                            g.peripherals.insert(id_str.clone(), p.clone());
                        }
                        let snapshot = snapshot_device(&p).await;
                        let _ = app_for_task.emit("ble://device-discovered", snapshot);
                    }
                }
                CentralEvent::DeviceConnected(id) => {
                    let _ = app_for_task.emit(
                        "ble://connection-changed",
                        ConnectionChanged {
                            id: peripheral_id_string(&id),
                            state: "connected",
                        },
                    );
                }
                CentralEvent::DeviceDisconnected(id) => {
                    let _ = app_for_task.emit(
                        "ble://connection-changed",
                        ConnectionChanged {
                            id: peripheral_id_string(&id),
                            state: "disconnected",
                        },
                    );
                }
                _ => {}
            }
        }
    });

    inner.scan_handle = Some(handle);
    Ok(())
}

#[tauri::command]
pub async fn ble_stop_scan(state: State<'_, BleState>) -> BleResult<()> {
    let inner_arc = state.inner.clone();
    let mut inner = inner_arc.lock().await;

    if let Some(adapter) = &inner.adapter {
        let _ = adapter.stop_scan().await;
    }
    if let Some(handle) = inner.scan_handle.take() {
        handle.abort();
    }
    Ok(())
}

async fn peripheral_for(inner_arc: &Arc<Mutex<BleInner>>, id: &str) -> BleResult<Peripheral> {
    let inner = inner_arc.lock().await;
    inner
        .peripherals
        .get(id)
        .cloned()
        .ok_or_else(|| BleError::NotConnected(id.to_string()))
}

#[tauri::command]
pub async fn ble_connect(
    app: AppHandle,
    state: State<'_, BleState>,
    device_id: String,
) -> BleResult<()> {
    let p = peripheral_for(&state.inner, &device_id).await?;
    let _ = app.emit(
        "ble://connection-changed",
        ConnectionChanged {
            id: device_id.clone(),
            state: "connecting",
        },
    );
    p.connect().await?;
    p.discover_services().await?;
    Ok(())
}

#[tauri::command]
pub async fn ble_disconnect(
    state: State<'_, BleState>,
    device_id: String,
) -> BleResult<()> {
    let p = peripheral_for(&state.inner, &device_id).await?;
    p.disconnect().await?;
    Ok(())
}

#[tauri::command]
pub async fn ble_discover_services(
    state: State<'_, BleState>,
    device_id: String,
) -> BleResult<Vec<BleService>> {
    let p = peripheral_for(&state.inner, &device_id).await?;
    p.discover_services().await?;
    let services = p
        .services()
        .into_iter()
        .map(|s| BleService {
            uuid: s.uuid.to_string(),
            primary: s.primary,
            characteristics: s
                .characteristics
                .into_iter()
                .map(|c| BleCharacteristic {
                    uuid: c.uuid.to_string(),
                    properties: format_properties(c.properties),
                })
                .collect(),
        })
        .collect();
    Ok(services)
}

fn format_properties(p: btleplug::api::CharPropFlags) -> Vec<&'static str> {
    let mut out = Vec::new();
    use btleplug::api::CharPropFlags as F;
    if p.contains(F::READ) {
        out.push("read");
    }
    if p.contains(F::WRITE) {
        out.push("write");
    }
    if p.contains(F::WRITE_WITHOUT_RESPONSE) {
        out.push("writeWithoutResponse");
    }
    if p.contains(F::NOTIFY) {
        out.push("notify");
    }
    if p.contains(F::INDICATE) {
        out.push("indicate");
    }
    out
}

fn parse_uuid(s: &str) -> BleResult<Uuid> {
    Uuid::parse_str(s).map_err(|_| BleError::InvalidUuid(s.to_string()))
}

async fn find_characteristic(
    p: &Peripheral,
    uuid: Uuid,
) -> BleResult<btleplug::api::Characteristic> {
    p.characteristics()
        .into_iter()
        .find(|c| c.uuid == uuid)
        .ok_or_else(|| BleError::CharacteristicNotFound(uuid.to_string()))
}

#[tauri::command]
pub async fn ble_subscribe(
    app: AppHandle,
    state: State<'_, BleState>,
    device_id: String,
    characteristic_uuid: String,
) -> BleResult<()> {
    let p = peripheral_for(&state.inner, &device_id).await?;
    let uuid = parse_uuid(&characteristic_uuid)?;
    let ch = find_characteristic(&p, uuid).await?;
    p.subscribe(&ch).await?;

    let app_for_task = app.clone();
    let p_for_task = p.clone();
    let device_id_for_task = device_id.clone();
    tokio::spawn(async move {
        let mut stream = match p_for_task.notifications().await {
            Ok(s) => s,
            Err(err) => {
                let _ = app_for_task.emit(
                    "ble://error",
                    format!("notification stream error: {err}"),
                );
                return;
            }
        };
        while let Some(n) = stream.next().await {
            let packet = BlePacket {
                device_id: device_id_for_task.clone(),
                characteristic_uuid: n.uuid.to_string(),
                direction: "in",
                bytes: n.value,
                timestamp_ms: now_ms(),
            };
            let _ = app_for_task.emit("ble://packet", packet);
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn ble_unsubscribe(
    state: State<'_, BleState>,
    device_id: String,
    characteristic_uuid: String,
) -> BleResult<()> {
    let p = peripheral_for(&state.inner, &device_id).await?;
    let uuid = parse_uuid(&characteristic_uuid)?;
    let ch = find_characteristic(&p, uuid).await?;
    p.unsubscribe(&ch).await?;
    Ok(())
}

#[tauri::command]
pub async fn ble_write(
    app: AppHandle,
    state: State<'_, BleState>,
    device_id: String,
    characteristic_uuid: String,
    bytes: Vec<u8>,
    with_response: bool,
) -> BleResult<()> {
    let p = peripheral_for(&state.inner, &device_id).await?;
    let uuid = parse_uuid(&characteristic_uuid)?;
    let ch = find_characteristic(&p, uuid).await?;
    let kind = if with_response {
        WriteType::WithResponse
    } else {
        WriteType::WithoutResponse
    };
    p.write(&ch, &bytes, kind).await?;
    let _ = app.emit(
        "ble://packet",
        BlePacket {
            device_id,
            characteristic_uuid: uuid.to_string(),
            direction: "out",
            bytes,
            timestamp_ms: now_ms(),
        },
    );
    Ok(())
}
