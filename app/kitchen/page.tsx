"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadOrders, subscribeOrders, updateOrderStatus, Order, OrderStatus } from "@/lib/store";

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let active = true;

    async function refresh() {
      const data = await loadOrders();
      if (!active) return;
      setOrders(data);
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

  const grouped = useMemo(() => {
    const by: Record<OrderStatus, Order[]> = { NEW: [], PREPARING: [], DONE: [], CANCELLED: [] };
    for (const o of orders) by[o.status].push(o);
    return by;
  }, [orders]);

  function setStatus(id: string, status: OrderStatus) {
    const next = orders.map((o) => (o.id === id ? { ...o, status } : o));
    setOrders(next);
    void updateOrderStatus(id, status);
  }

  const revenueDone = grouped.DONE.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;

  return (
    <div className="page-enter" style={{ display: "grid", gap: 14 }}>
      <div className="kitchen-header">
        <div className="kitchen-title">
          <h2 className="kitchen-heading">المطبخ</h2>
          <Link href="/" className="kitchen-home">الرئيسية</Link>
        </div>
        <div className="kitchen-summary">
          <div className="summary-chip">إجمالي الطلبات: {totalOrders}</div>
          <div className="summary-chip summary-chip--revenue">إيراد المنجز: {revenueDone.toFixed(2)} ر.س</div>
        </div>
      </div>

      <Columns>
        <Col title="جديد" status="NEW" count={grouped.NEW.length}>
          {grouped.NEW.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              actions={[
                { label: "بدء التحضير", kind: "start", onClick: () => setStatus(o.id, "PREPARING") },
                { label: "إلغاء", kind: "cancel", onClick: () => setStatus(o.id, "CANCELLED") },
              ]}
            />
          ))}
        </Col>

        <Col title="قيد التحضير" status="PREPARING" count={grouped.PREPARING.length}>
          {grouped.PREPARING.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              actions={[
                { label: "تم", kind: "done", onClick: () => setStatus(o.id, "DONE") },
                { label: "إرجاع للجديد", kind: "back", onClick: () => setStatus(o.id, "NEW") },
              ]}
            />
          ))}
        </Col>

        <Col title="منجز" status="DONE" count={grouped.DONE.length}>
          {grouped.DONE.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              actions={[{ label: "إعادة فتح", kind: "reopen", onClick: () => setStatus(o.id, "NEW") }]}
            />
          ))}
        </Col>
      </Columns>
    </div>
  );
}

function Columns({ children }: { children: React.ReactNode }) {
  return (
    <div className="kitchen-board kitchen-columns" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, alignItems: "start" }}>
      {children}
    </div>
  );
}

function Col({ title, status, count, children }: { title: string; status: OrderStatus; count: number; children: React.ReactNode }) {
  return (
    <section className="kitchen-column" data-status={status}>
      <div className="kitchen-column-head">
        <div className="kitchen-column-title">{title}</div>
        <div className="kitchen-count">{count}</div>
      </div>
      <div className="kitchen-column-body">{children}</div>
    </section>
  );
}

function OrderCard(props: {
  order: Order;
  actions: { label: string; kind: "start" | "cancel" | "done" | "back" | "reopen"; onClick: () => void }[];
}) {
  const o = props.order;
  const time = new Date(o.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  const itemsCount = o.items.reduce((sum, it) => sum + it.qty, 0);
  const singleAction = props.actions.length === 1;

  return (
    <div className="order-card" data-status={o.status}>
      <div className="order-top">
        <div className="order-code">رقم #{o.id.slice(0, 6)}</div>
        <div className="order-time">{time}</div>
        <div className="order-total">{o.total.toFixed(2)} ر.س</div>
      </div>

      <div className="order-meta">
        <div>{itemsCount} عنصر</div>
        {o.note ? <div>ملاحظة: {o.note}</div> : null}
      </div>

      <div className="order-items">
        {o.items.map((it, idx) => (
          <div key={idx} className="order-item">
            <div className="order-qty">{it.qty}×</div>
            <div>
              <div className="order-name">{it.name}</div>
              {it.sauces.length ? (
                <div className="order-sub">صوص: {it.sauces.join("، ")}</div>
              ) : null}
              {it.extras.length ? (
                <div className="order-sub">إضافات: {it.extras.map((e) => e.name).join("، ")}</div>
              ) : null}
              {it.note ? <div className="order-sub">ملاحظة: {it.note}</div> : null}
            </div>
          </div>
        ))}
      </div>

      <div className="order-actions">
        {props.actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={`order-btn ${actionClass(a.kind)}`}
            style={singleAction ? { gridColumn: "1 / -1" } : undefined}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function actionClass(kind: "start" | "cancel" | "done" | "back" | "reopen") {
  if (kind === "done") return "order-btn--done";
  if (kind === "start") return "order-btn--start";
  if (kind === "cancel") return "order-btn--cancel";
  return "order-btn--ghost";
}
