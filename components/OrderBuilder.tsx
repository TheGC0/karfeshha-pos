"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { BALILA_EXTRA_ITEMS, EXTRA_ITEMS, SAUCES, MenuItem } from "@/lib/menu";
import { getMenuItemPrice, MenuPriceOverrides } from "@/lib/menu-prices";
import { Modal } from "./Modal";
import { OrderItem } from "@/lib/store";

export function OrderBuilder(props: {
  open: boolean;
  item: MenuItem | null;
  initial?: OrderItem | null;
  priceOverrides?: MenuPriceOverrides;
  onClose: () => void;
  onAdd: (orderItem: OrderItem) => void;
  onUpdate?: (orderItem: OrderItem) => void;
}) {
  const active = props.item;
  const hasExtras = active?.category !== "Drinks";
  const hasSauces = hasExtras && active?.id !== "main-balila";
  const isEditing = Boolean(props.initial);
  const extrasList = useMemo(() => {
    if (!hasExtras) return [];
    const source = active?.id === "main-balila" ? BALILA_EXTRA_ITEMS : EXTRA_ITEMS;
    return source.map((extra) => ({
      ...extra,
      price: getMenuItemPrice(extra, props.priceOverrides ?? {}),
    }));
  }, [active?.id, hasExtras, props.priceOverrides]);

  const [qty, setQty] = useState(() => props.initial?.qty ?? 1);
  const [sauceLevels, setSauceLevels] = useState<Record<string, number>>(() => {
    if (!hasSauces || !props.initial) return {};
    return parseSauceLevels(props.initial.sauces);
  });
  const [extraLevels, setExtraLevels] = useState<Record<string, number>>(() => {
    if (!hasExtras || !props.initial) return {};
    return parseExtraLevels(props.initial.extras);
  });
  const [note, setNote] = useState(() => props.initial?.note ?? "");
  const [unitPriceInput, setUnitPriceInput] = useState(() =>
    formatPriceInput(props.initial?.basePrice ?? active?.price ?? 0)
  );

  const unitPrice = useMemo(
    () => parsePriceInput(unitPriceInput, props.initial?.basePrice ?? active?.price ?? 0),
    [unitPriceInput, props.initial?.basePrice, active?.price]
  );

  function reset() {
    setQty(1);
    setSauceLevels({});
    setExtraLevels({});
    setNote("");
    setUnitPriceInput(formatPriceInput(active?.price ?? props.initial?.basePrice ?? 0));
  }

  function toggleSauce(s: string) {
    setSauceLevels((prev) => {
      const next = { ...prev };
      if (s in next) delete next[s];
      else next[s] = 0;
      return next;
    });
  }

  function toggleExtra(id: string) {
    setExtraLevels((prev) => {
      const next = { ...prev };
      if (id in next) delete next[id];
      else next[id] = 0;
      return next;
    });
  }

  function incSauce(s: string) {
    setSauceLevels((prev) => {
      const next = { ...prev };
      const current = next[s];
      if (current === undefined) next[s] = 0;
      else if (current < 1) next[s] = current + 1;
      return next;
    });
  }

  function decSauce(s: string) {
    setSauceLevels((prev) => {
      const next = { ...prev };
      const current = next[s];
      if (current === undefined) next[s] = -1;
      else if (current > -1) next[s] = current - 1;
      return next;
    });
  }

  function incExtra(id: string) {
    setExtraLevels((prev) => {
      const next = { ...prev };
      const current = next[id];
      if (current === undefined) next[id] = 0;
      else if (current < 1) next[id] = current + 1;
      return next;
    });
  }

  function decExtra(id: string) {
    setExtraLevels((prev) => {
      const next = { ...prev };
      const current = next[id];
      if (current === undefined) next[id] = -1;
      else if (current > -1) next[id] = current - 1;
      return next;
    });
  }

  const title = active ? (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          overflow: "hidden",
          background: "#f6f6f6",
          border: "1px solid #eee",
          flex: "0 0 auto",
        }}
      >
        <Image
          src={active.img ?? "/items/placeholder.png"}
          alt={active.name}
          width={88}
          height={88}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
      <div>إضافة: {active.name}</div>
    </div>
  ) : (
    "إضافة"
  );

  const modalWidth = hasSauces ? undefined : "min(620px, 100%)";

  return (
    <Modal
      open={props.open}
      title={title}
      maxWidth={modalWidth}
      onClose={() => {
        props.onClose();
        reset();
      }}
    >
      {!active ? null : (
        <div className={`builder-grid ${hasSauces ? "builder-grid--addons" : "builder-grid--compact"}`}>
          {hasSauces ? (
            <div className="builder-panel builder-panel--addons">
              <div className="builder-section">
                <div className="builder-label">الصوصات (مجاني)</div>
                <div className="sauce-grid">
                  {SAUCES.map((s) => {
                    const level = sauceLevels[s];
                    const selected = level !== undefined;
                    const badgeLevel = sauceBadgeLevel(level);
                    return (
                      <div key={s} className="sauce-row" data-active={selected}>
                        <button type="button" className="sauce-toggle" onClick={() => toggleSauce(s)}>
                          {s}
                        </button>
                        <div className="sauce-level">
                          <button type="button" className="sauce-btn" onClick={() => decSauce(s)} aria-label="قليل">
                            <IconMinus />
                          </button>
                          <span className="sauce-badge" data-level={badgeLevel}>
                            {sauceLabel(level)}
                          </span>
                          <button type="button" className="sauce-btn" onClick={() => incSauce(s)} aria-label="زيادة">
                            <IconPlus />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {hasExtras ? (
            <div className="builder-panel builder-panel--extras">
              <div className="builder-section">
                <div className="builder-label">إضافات</div>
                <div className="extras-grid">
                  {extrasList.map((ex) => {
                    const level = extraLevels[ex.id];
                    const selected = level !== undefined;
                    return (
                      <div key={ex.id} className="sauce-row" data-active={selected}>
                        <button type="button" className="sauce-toggle" onClick={() => toggleExtra(ex.id)}>
                          <span>{ex.name}</span>
                          <span className="extra-price">{ex.price > 0 ? `${ex.price} ر.س` : "مجاني"}</span>
                        </button>
                        <div className="sauce-level">
                          <button type="button" className="sauce-btn" onClick={() => decExtra(ex.id)} aria-label="قليل">
                            <IconMinus />
                          </button>
                          <span className="sauce-badge" data-level={extraBadgeLevel(level)}>
                            {extraText(level)}
                          </span>
                          <button type="button" className="sauce-btn" onClick={() => incExtra(ex.id)} aria-label="زيادة">
                            <IconPlus />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="builder-section">
                <div className="builder-label">سعر الوحدة (ر.س)</div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={unitPriceInput}
                  onChange={(e) => setUnitPriceInput(e.target.value)}
                  placeholder="السعر"
                  style={input}
                />
              </div>

              <div className="builder-section">
                <div className="builder-label">الكمية</div>
                <div className="builder-stepper">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={btnSmall} aria-label="إنقاص">
                    <IconMinus />
                  </button>
                  <div className="builder-stepper-value">{qty}</div>
                  <button onClick={() => setQty((q) => q + 1)} style={btnSmall} aria-label="زيادة">
                    <IconPlus />
                  </button>
                </div>
              </div>

              <div className="builder-section">
                <div className="builder-label">ملاحظات</div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="اختياري..."
                  style={input}
                />
              </div>
            </div>
          ) : (
            <div className="builder-panel builder-panel--compact">
              <div className="builder-section">
                <div className="builder-label">سعر الوحدة (ر.س)</div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={unitPriceInput}
                  onChange={(e) => setUnitPriceInput(e.target.value)}
                  placeholder="السعر"
                  style={input}
                />
              </div>

              <div className="builder-section">
                <div className="builder-label">الكمية</div>
                <div className="builder-stepper">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={btnSmall} aria-label="إنقاص">
                    <IconMinus />
                  </button>
                  <div className="builder-stepper-value">{qty}</div>
                  <button onClick={() => setQty((q) => q + 1)} style={btnSmall} aria-label="زيادة">
                    <IconPlus />
                  </button>
                </div>
              </div>

              <div className="builder-section">
                <div className="builder-label">ملاحظات</div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="اختياري..."
                  style={input}
                />
              </div>
            </div>
          )}

          <div className="builder-footer">
            <div className="builder-footer-actions">
              <button
                onClick={() => {
                  props.onClose();
                  reset();
                }}
                style={btnGhost}
              >
                إلغاء
              </button>

              <button
                onClick={() => {
                  const orderItem: OrderItem = {
                    id: active.id,
                    name: active.name,
                    basePrice: unitPrice,
                    qty,
                    sauces: hasSauces ? serializeSauces(sauceLevels) : [],
                    extras: hasExtras
                      ? serializeExtras(extraLevels, extrasList)
                      : [],
                    note: note.trim() ? note.trim() : undefined,
                  };
                  if (isEditing && props.onUpdate) props.onUpdate(orderItem);
                  else props.onAdd(orderItem);
                  props.onClose();
                  reset();
                }}
                style={btnPrimary}
              >
                {isEditing ? "تحديث الطلب" : "إضافة للطلب"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--stroke)",
  borderRadius: 12,
  padding: "0 12px",
  height: 44,
  background: "white",
  outline: "none",
};

const btnSmall: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  borderRadius: 12,
  width: 40,
  height: 40,
  padding: 0,
  background: "white",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 18,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--brand)",
};

const btnPrimary: React.CSSProperties = {
  border: 0,
  borderRadius: 12,
  padding: "10px 14px",
  background: "var(--brand)",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
};

const btnGhost: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  borderRadius: 12,
  padding: "10px 14px",
  background: "white",
  cursor: "pointer",
  fontWeight: 800,
};

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function IconMinus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function sauceLabel(level: number | undefined) {
  if (level === 1) return "زيادة";
  if (level === -1) return "قليل";
  if (level === 0) return "عادي";
  return "—";
}

function sauceBadgeLevel(level: number | undefined) {
  if (level === 1) return "extra";
  if (level === -1) return "light";
  if (level === 0) return "normal";
  return "none";
}

function serializeSauces(levels: Record<string, number>) {
  return Object.entries(levels).map(([name, level]) => {
    if (level === 1) return `${name} (زيادة)`;
    if (level === -1) return `${name} (قليل)`;
    return name;
  });
}

function parseSauceLevels(sauces: string[]) {
  const levels: Record<string, number> = {};
  for (const entry of sauces) {
    const match = entry.match(/^(.*?)\s*\((.+)\)$/);
    if (match) {
      const name = match[1].trim();
      const tag = match[2].trim();
      if (tag === "زيادة") levels[name] = 1;
      else if (tag === "قليل") levels[name] = -1;
      else levels[name] = 0;
    } else {
      levels[entry] = 0;
    }
  }
  return levels;
}

function extraBadgeLevel(level: number | undefined) {
  if (level === 1) return "extra";
  if (level === -1) return "light";
  if (level === 0) return "normal";
  return "none";
}

function extraText(level: number | undefined) {
  if (level === 1) return "زيادة";
  if (level === -1) return "قليل";
  if (level === 0) return "إضافة";
  return "—";
}

function serializeExtras(
  levels: Record<string, number>,
  list: { id: string; name: string; price: number }[]
) {
  return list
    .filter((ex) => ex.id in levels)
    .map((ex) => {
      const level = levels[ex.id];
      let name = ex.name;
      if (level === 1) name = `${ex.name} (زيادة)`;
      else if (level === -1) name = `${ex.name} (قليل)`;
      const qty = level === 1 ? 2 : 1;
      return { id: ex.id, name, price: ex.price, qty };
    });
}

function parseExtraLevels(extras: { id: string; name: string; qty: number }[]) {
  const levels: Record<string, number> = {};
  for (const entry of extras) {
    let level = entry.qty > 1 ? 1 : 0;
    const match = entry.name.match(/^(.*?)\s*\((.+)\)$/);
    if (match) {
      const tag = match[2].trim();
      if (tag === "زيادة") level = 1;
      else if (tag === "قليل") level = -1;
    }
    levels[entry.id] = level;
  }
  return levels;
}

function formatPriceInput(value: number) {
  return String(Math.max(0, Math.round(value * 100) / 100));
}

function parsePriceInput(value: string, fallback: number) {
  if (!value.trim()) return Math.max(0, fallback);
  const parsed = parseNumericInput(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return Math.max(0, fallback);
  }
  return Math.round(parsed * 100) / 100;
}

function parseNumericInput(value: string) {
  const arabicIndic = "٠١٢٣٤٥٦٧٨٩";
  const easternArabicIndic = "۰۱۲۳۴۵۶۷۸۹";
  const normalized = value
    .replace(/[٠-٩]/g, (d) => String(arabicIndic.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(easternArabicIndic.indexOf(d)))
    .replace(/[٫٬,]/g, ".");
  const cleaned = normalized.replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}
