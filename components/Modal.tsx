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
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: maxWidth ?? "min(820px, 100%)",
          background: "white",
          borderRadius: 18,
          border: "1px solid #eee",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 16, borderBottom: "1px solid #eee", display: "flex", alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
          <button onClick={onClose} style={{ marginLeft: "auto", border: 0, background: "transparent", cursor: "pointer", fontSize: 20 }}>
            ✕
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
