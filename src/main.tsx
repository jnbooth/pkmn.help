import * as React from "react";
import * as ReactDOM from "react-dom";
import * as OfflinePluginRuntime from "offline-plugin/runtime";
import SmoothScroll from "smoothscroll-polyfill";

import "tachyons/css/tachyons.css";
import "./style.css";
import { App } from "./App";

OfflinePluginRuntime.install({
  onInstalled: () => {
    alert("App was installed!");
  },
});
SmoothScroll.polyfill();
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.querySelector("#app")
);
