import React from "react";
import { createRoot } from "react-dom/client";
import Overlay from "./Overlay.jsx";
import Dashboard from "./Dashboard.jsx";
import "./styles.css";

const isOverlay = location.pathname.startsWith("/overlay");
document.body.className = isOverlay ? "ov" : "dash";
createRoot(document.getElementById("root")).render(isOverlay ? <Overlay /> : <Dashboard />);
