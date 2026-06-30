import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

// Platform marker on <html> so CSS can adapt to native chrome differences
// (macOS reserves space for the traffic-light buttons; Windows/Linux don't).
const ua = navigator.userAgent;
const platform = /Mac OS X/.test(ua)
  ? "macos"
  : /Windows/.test(ua)
    ? "windows"
    : /Linux/.test(ua)
      ? "linux"
      : "unknown";
document.documentElement.classList.add(`platform-${platform}`);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
