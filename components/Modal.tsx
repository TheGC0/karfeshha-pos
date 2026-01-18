"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

export function Modal(props: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  maxWidth?: string;
  children: ReactNode;
}) {
  const { open, title, onClose, maxWidth, children } = props;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50,
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: maxWidth ?? "min(820px, 100%)",
          maxHeight: "calc(100vh - 32px)",
          background: "white",
          borderRadius: 18,
          border: "1px solid #eee",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: 16, borderBottom: "1px solid #eee", display: "flex", alignItems: "center", flex: "0 0 auto" }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
          <button onClick={onClose} style={{ marginLeft: "auto", border: 0, background: "transparent", cursor: "pointer", fontSize: 20 }}>
            ✕
          </button>
        </div>
        <div style={{ padding: 16, overflowY: "auto", WebkitOverflowScrolling: "touch", flex: "1 1 auto" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
