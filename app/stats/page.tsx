"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadOrders, subscribeOrders, Order } from "@/lib/store";

const currency = "SAR";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function inMonth(ts: number, key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(ts);
  return d.getFullYear() === y && d.getMonth() + 1 === m;
}

export default function StatsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));

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

  const monthOrders = useMemo(() => orders.filter((o) => inMonth(o.createdAt, selectedMonth)), [orders, selectedMonth]);

  const stats = useMemo(() => {
    const done = monthOrders.filter((o) => o.status === "DONE");
    const cancelled = monthOrders.filter((o) => o.status === "CANCELLED");
    const preparing = monthOrders.filter((o) => o.status === "PREPARING");
    const fresh = monthOrders.filter((o) => o.status === "NEW");

    const revenueDone = done.reduce((s, o) => s + o.total, 0);
    const discounts = monthOrders.reduce((s, o) => s + o.discountAmount, 0);
    const avgTicket = done.length ? revenueDone / done.length : 0;

    const items: Record<string, { name: string; qty: number }> = {};
    for (const o of done) {
      for (const it of o.items) {
        if (!items[it.id]) items[it.id] = { name: it.name, qty: 0 };
        items[it.id].qty += it.qty;
      }
    }

    const topItems = Object.values(items)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);

    return {
      totalOrders: monthOrders.length,
      doneCount: done.length,
      cancelledCount: cancelled.length,
      preparingCount: preparing.length,
      newCount: fresh.length,
      revenueDone,
      discounts,
      avgTicket,
      topItems,
    };
  }, [monthOrders]);

  return (
    <div className="page-enter" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>الإحصائيات الشهرية</div>
          <Link
            href="/"
            style={{
              border: "1px solid #e6e6e6",
              borderRadius: 10,
              padding: "6px 10px",
              background: "white",
              fontWeight: 800,
              color: "var(--brand)",
            }}
          >
            الرئيسية
          </Link>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
          الشهر
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              border: "1px solid #e6e6e6",
              borderRadius: 10,
              padding: "6px 10px",
              background: "white",
              fontWeight: 700,
            }}
          />
        </label>
      </div>

      <div className="stats-grid">
        <StatCard label="إجمالي الطلبات" value={stats.totalOrders} />
        <StatCard label="طلبات جديدة" value={stats.newCount} />
        <StatCard label="قيد التحضير" value={stats.preparingCount} />
        <StatCard label="طلبات مكتملة" value={stats.doneCount} />
        <StatCard label="طلبات ملغاة" value={stats.cancelledCount} />
        <StatCard label="إجمالي المبيعات" value={`${stats.revenueDone.toFixed(2)} ${currency}`} highlight />
        <StatCard label="الخصومات" value={`${stats.discounts.toFixed(2)} ${currency}`} />
        <StatCard label="متوسط الفاتورة" value={`${stats.avgTicket.toFixed(2)} ${currency}`} />
        <StatCard label="الربح (حالياً)" value={`${stats.revenueDone.toFixed(2)} ${currency}`} accent />
      </div>

      <div className="panel" style={{ border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 12 }}>الأصناف الأكثر طلباً</div>
        {stats.topItems.length === 0 ? (
          <div style={{ color: "#666" }}>لا توجد مبيعات مكتملة لهذا الشهر.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {stats.topItems.map((item) => (
              <div key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700 }}>{item.name}</div>
                <div style={{ fontWeight: 800 }}>{item.qty} ×</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard(props: { label: string; value: string | number; highlight?: boolean; accent?: boolean }) {
  const { label, value, highlight, accent } = props;

  return (
    <div
      className="panel"
      style={{
        border: "1px solid #eee",
        borderRadius: 16,
        padding: 14,
        background: highlight
          ? "linear-gradient(135deg, rgba(133, 21, 17, 0.15), rgba(255, 255, 255, 0.9))"
          : accent
          ? "linear-gradient(135deg, rgba(225, 179, 111, 0.35), rgba(255, 255, 255, 0.9))"
          : "white",
      }}
    >
      <div style={{ color: "#6f6257", fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900 }}>{value}</div>
    </div>
  );
}
