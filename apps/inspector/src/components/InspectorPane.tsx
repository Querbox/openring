export function InspectorPane() {
  return (
    <section className="inspector-pane">
      <header className="panel-header">
        <div>
          <h2>Inspector</h2>
          <p className="muted">Services, characteristics, and live notifications.</p>
        </div>
      </header>

      <div className="empty-state">
        <p className="empty-title">Select a device to inspect</p>
        <p className="empty-hint">
          Once connected, GATT services and characteristics will appear here.
        </p>
      </div>
    </section>
  );
}
