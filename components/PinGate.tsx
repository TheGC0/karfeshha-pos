"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "karfeshha_pin_ok";
const PIN = "6969";

function normalizeDigits(value: string) {
  const arabicIndic = "٠١٢٣٤٥٦٧٨٩";
  const easternArabicIndic = "۰۱۲۳۴۵۶۷۸۹";
  return value
    .split("")
    .map((ch) => {
      const aIndex = arabicIndic.indexOf(ch);
      if (aIndex !== -1) return String(aIndex);
      const eIndex = easternArabicIndic.indexOf(ch);
      if (eIndex !== -1) return String(eIndex);
      return ch;
    })
    .join("");
}

export function PinGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ok = sessionStorage.getItem(STORAGE_KEY) === "1";
    setUnlocked(ok);
  }, []);

  useEffect(() => {
    if (!unlocked) inputRef.current?.focus();
  }, [unlocked]);

  function submit() {
    if (value === PIN) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
      setError("");
      return;
    }
    setError("الرقم غير صحيح");
  }

  function onChange(next: string) {
    const cleaned = normalizeDigits(next).replace(/\D/g, "").slice(0, PIN.length);
    setValue(cleaned);
    if (error) setError("");
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="pin-gate">
      <div className="pin-card" role="dialog" aria-modal="true">
        <div className="pin-title">الرقم السري</div>
        <div className="pin-subtitle">أدخل رقم الدخول للمتابعة</div>
        <input
          ref={inputRef}
          className="pin-input"
          type="password"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          aria-label="الرقم السري"
        />
        {error ? <div className="pin-error">{error}</div> : null}
        <button className="pin-btn" onClick={submit} disabled={value.length !== PIN.length}>
          دخول
        </button>
      </div>
    </div>
  );
}
