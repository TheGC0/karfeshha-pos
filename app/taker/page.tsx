"use client";

import { useEffect, useMemo, useState } from "react";
import { DRINKS, MAIN_ITEMS, MenuItem } from "@/lib/menu";
import Link from "next/link";
import { ItemCard } from "@/components/ItemCard";
import { OrderBuilder } from "@/components/OrderBuilder";
import { Modal } from "@/components/Modal";
import { calcOrderTotals, createOrder, loadOrders, subscribeOrders, Discount, OrderItem } from "@/lib/store";

export default function TakerPage() {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [cart, setCart] = useState<OrderItem[]>([]);
  const [discountKind, setDiscountKind] = useState<Discount["kind"]>("none");
  const [discountInput, setDiscountInput] = useState<string>("");
  const [note, setNote] = useState("");
  const [orderSource, setOrderSource] = useState<"car" | "walkup">("walkup");
  const [carDigits, setCarDigits] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);

  const [ordersCount, setOrdersCount] = useState(0);
  const [revenueDone, setRevenueDone] = useState(0);

  const discountValue = useMemo(() => parseNumericInput(discountInput), [discountInput]);

  const discount: Discount = useMemo(() => {
    if (discountKind === "none") return { kind: "none" };
    return { kind: discountKind, value: Number.isFinite(discountValue) ? discountValue : 0 } as Discount;
  }, [discountKind, discountValue]);

  const totals = useMemo(() => calcOrderTotals(cart, discount), [cart, discount]);
  const canSubmit = cart.length > 0 && (orderSource === "walkup" || carDigits.length > 0);
  const menuIndex = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (const item of [...MAIN_ITEMS, ...DRINKS]) map.set(item.id, item);
    return map;
  }, []);

  useEffect(() => {
    let active = true;

    async function refresh() {
      const orders = await loadOrders();
      if (!active) return;
      setOrdersCount(orders.length);
      const done = orders.filter((o) => o.status === "DONE");
      const rev = done.reduce((s, o) => s + o.total, 0);
      setRevenueDone(rev);
    }

    void refresh();
    const unsubscribe = subscribeOrders(() => {
      void refresh();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  function openBuilder(item: MenuItem) {
    setActiveItem(item);
    setEditingIndex(null);
    setBuilderOpen(true);
  }

  function addToCart(orderItem: OrderItem) {
    setCart((prev) => [...prev, orderItem]);
  }

  function updateCart(index: number, orderItem: OrderItem) {
    setCart((prev) => prev.map((it, idx) => (idx === index ? orderItem : it)));
  }

  function openEdit(index: number) {
    const item = cart[index];
    if (!item) return;
    const fallbackCategory = item.id.startsWith("drink-") ? "Drinks" : "Main";
    const menuItem =
      menuIndex.get(item.id) ??
      ({
        id: item.id,
        name: item.name,
        price: item.basePrice,
        category: fallbackCategory,
        img: "/items/placeholder.png",
      } as MenuItem);
    setActiveItem(menuItem);
    setEditingIndex(index);
    setBuilderOpen(true);
  }

  function adjustQty(index: number, delta: number) {
    setCart((prev) =>
      prev.map((it, idx) =>
        idx === index ? { ...it, qty: Math.max(1, it.qty + delta) } : it
      )
    );
  }

  function requestRemoveCartIndex(idx: number) {
    setPendingDeleteIndex(idx);
    setConfirmOpen(true);
  }

  function confirmRemoveCartIndex() {
    if (pendingDeleteIndex === null) return;
    setCart((prev) => prev.filter((_, i) => i !== pendingDeleteIndex));
    setPendingDeleteIndex(null);
    setConfirmOpen(false);
  }

  function cancelRemoveCartIndex() {
    setPendingDeleteIndex(null);
    setConfirmOpen(false);
  }

  async function submitOrder() {
    if (cart.length === 0) return;
    if (orderSource === "car" && carDigits.length === 0) return;

    const { subtotal, discountAmount, total } = calcOrderTotals(cart, discount);
    await createOrder({
      items: cart,
      discount,
      subtotal,
      discountAmount,
      total,
      note: note.trim() ? note.trim() : undefined,
      source: orderSource,
      carTag: orderSource === "car" ? carDigits : undefined,
    });

    // reset
    setCart([]);
    setEditingIndex(null);
    setDiscountKind("none");
    setDiscountInput("");
    setNote("");
    setOrderSource("walkup");
    setCarDigits("");
  }

  function setDiscount(kind: Discount["kind"]) {
    setDiscountKind(kind);
    if (kind === "none") setDiscountInput("");
  }

  return (
    <div className="taker-layout page-enter" style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 16, alignItems: "start" }}>
      {/* MENU */}
      <div style={{ display: "grid", gap: 16 }}>
        <Section>
          <Grid>
            {MAIN_ITEMS.map((it) => (
              <ItemCard key={it.id} title={it.name} price={it.price} img={it.img} onClick={() => openBuilder(it)} />
            ))}
          </Grid>
        </Section>

        <Section>
          <Grid>
            {DRINKS.map((it) => (
              <ItemCard key={it.id} title={it.name} price={it.price} img={it.img} onClick={() => openBuilder(it)} />
            ))}
          </Grid>
        </Section>
      </div>

      {/* CART */}
      <div className="panel" style={{ border: "1px solid #eee", borderRadius: 16, padding: 14, background: "white" }}>
        <div className="cart-header">
          <div className="cart-title">
            <div>الطلب</div>
            <Link href="/" className="cart-home">الرئيسية</Link>
          </div>
          <div className="cart-meta">
            <span>Orders: {ordersCount}</span>
            <span>Done: {revenueDone.toFixed(2)} SAR</span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {cart.length === 0 ? (
            <div style={{ color: "#777" }}>اضغط على أي صنف لإضافته</div>
          ) : (
            cart.map((it, idx) => (
              <div key={idx} style={{ border: "1px solid #eee", borderRadius: 14, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 800, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div>{it.name}</div>
                      <span style={qtyBadge}>{it.qty}×</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                      صوص: {it.sauces.length ? it.sauces.join("، ") : "—"}
                    </div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                      إضافات: {it.extras.length ? it.extras.map((e) => e.name).join("، ") : "—"}
                    </div>
                    {it.note ? <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>ملاحظة: {it.note}</div> : null}
                  </div>
                  <div style={{ display: "grid", gap: 6, minWidth: 96 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                      <button onClick={() => adjustQty(idx, -1)} style={btnTiny} aria-label="إنقاص">
                        <IconMinus />
                      </button>
                      <button onClick={() => adjustQty(idx, 1)} style={btnTiny} aria-label="زيادة">
                        <IconPlus />
                      </button>
                    </div>
                    <button onClick={() => openEdit(idx)} style={btnGhostSmall}>
                      <IconEdit />
                      تعديل
                    </button>
                    <button onClick={() => requestRemoveCartIndex(idx)} style={btnDangerSmall}>
                      <IconTrash />
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <hr style={{ border: 0, borderTop: "1px solid #eee", margin: "14px 0" }} />

        {/* Discount */}
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>خصم</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setDiscount("none")} style={chip(discountKind === "none")}>بدون</button>
            <button onClick={() => setDiscount("amount")} style={chip(discountKind === "amount")}>مبلغ</button>
            <button onClick={() => setDiscount("percent")} style={chip(discountKind === "percent")}>نسبة</button>
          </div>

          {discountKind !== "none" ? (
            <input
              type="text"
              inputMode="decimal"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder={discountKind === "amount" ? "SAR" : "%"}
              style={input}
            />
          ) : null}

          <div style={{ fontWeight: 800 }}>نوع الطلب</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setOrderSource("walkup")} style={chip(orderSource === "walkup")}>مشاة</button>
            <button onClick={() => setOrderSource("car")} style={chip(orderSource === "car")}>سيارة</button>
          </div>

          {orderSource === "car" ? (
            <input
              type="text"
              inputMode="numeric"
              value={carDigits}
              onChange={(e) => setCarDigits(normalizeDigitsOnly(e.target.value))}
              placeholder="آخر أرقام اللوحة"
              style={input}
            />
          ) : null}

          <div style={{ fontWeight: 800 }}>ملاحظة للطلب</div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري..." style={input} />

          <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
            <Row label="Subtotal" value={`${totals.subtotal.toFixed(2)} SAR`} />
            <Row label="Discount" value={`- ${totals.discountAmount.toFixed(2)} SAR`} />
            <Row label="Total" value={`${totals.total.toFixed(2)} SAR`} bold />
          </div>

          <button onClick={submitOrder} style={btnPrimary} disabled={!canSubmit}>
            إرسال للمطبخ
          </button>
        </div>
      </div>

      {builderOpen ? (
        <OrderBuilder
          open={builderOpen}
          item={activeItem}
          initial={editingIndex !== null ? cart[editingIndex] : null}
          onClose={() => {
            setBuilderOpen(false);
            setEditingIndex(null);
          }}
          onAdd={addToCart}
          onUpdate={(orderItem) => {
            if (editingIndex === null) return;
            updateCart(editingIndex, orderItem);
          }}
        />
      ) : null}

      {confirmOpen ? (
        <Modal open={confirmOpen} title="تأكيد الحذف" onClose={cancelRemoveCartIndex} maxWidth="min(420px, 100%)">
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ fontWeight: 800 }}>هل أنت متأكد من حذف هذا الصنف؟</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={cancelRemoveCartIndex} style={btnConfirmGhost}>إلغاء</button>
              <button onClick={confirmRemoveCartIndex} style={btnConfirmDanger}>حذف</button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="panel" style={{ border: "1px solid #eee", borderRadius: 16, padding: 14, background: "white" }}>
      {title ? <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>{title}</div> : null}
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="menu-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? 900 : 600 }}>
      <div>{label}</div>
      <div>{value}</div>
    </div>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e6e6e6",
  borderRadius: 12,
  padding: "10px 12px",
  outline: "none",
};

const btnPrimary: React.CSSProperties = {
  border: 0,
  borderRadius: 12,
  padding: "12px 14px",
  background: "var(--brand)",
  color: "white",
  cursor: "pointer",
  fontWeight: 900,
};

const btnDangerSmall: React.CSSProperties = {
  border: "1px solid #f1c0c0",
  borderRadius: 10,
  padding: "0 8px",
  height: 34,
  background: "#fff5f5",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 12,
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

const btnGhostSmall: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  borderRadius: 10,
  padding: "0 8px",
  height: 34,
  background: "white",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 12,
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

const btnTiny: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  borderRadius: 10,
  padding: 0,
  height: 34,
  background: "white",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 12,
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};

const qtyBadge: React.CSSProperties = {
  borderRadius: 999,
  background: "#f7efe9",
  color: "#5b4134",
  padding: "2px 8px",
  fontSize: 12,
  fontWeight: 800,
};

const btnConfirmGhost: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  borderRadius: 12,
  padding: "10px 14px",
  background: "white",
  cursor: "pointer",
  fontWeight: 800,
};

const btnConfirmDanger: React.CSSProperties = {
  border: "1px solid #f1c0c0",
  borderRadius: 12,
  padding: "10px 14px",
  background: "#fff1f1",
  color: "#9b3b3b",
  cursor: "pointer",
  fontWeight: 800,
};

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function IconMinus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 6l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 7v-2h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
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

function normalizeDigitsOnly(value: string, maxLen = 6) {
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
    .join("")
    .replace(/\D/g, "")
    .slice(0, maxLen);
}

function chip(active: boolean): React.CSSProperties {
  return {
    border: "1px solid " + (active ? "var(--brand)" : "#e6e6e6"),
    borderRadius: 999,
    padding: "8px 10px",
    background: active ? "var(--brand)" : "white",
    color: active ? "white" : "black",
    cursor: "pointer",
    fontWeight: 800,
  };
}
