"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadOrders, subscribeOrders, Order } from "@/lib/store";

const currency = "ر.س";
const SHIFT_MS = 6 * 60 * 60 * 1000;
const DAY_COUNT = 30;

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function businessDate(ts: number) {
  return new Date(ts - SHIFT_MS);
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function inMonth(ts: number, key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = businessDate(ts);
  return d.getFullYear() === y && d.getMonth() + 1 === m;
}

export default function StatsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(monthKey(businessDate(Date.now())));
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [statsMode, setStatsMode] = useState<"month" | "last7" | "lastDay">("month");

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

  useEffect(() => {
    setSelectedDays([]);
    setShowDayPicker(false);
  }, [selectedMonth]);

  const monthOrders = useMemo(() => orders.filter((o) => inMonth(o.createdAt, selectedMonth)), [orders, selectedMonth]);
  const filteredOrders = useMemo(() => {
    if (selectedDays.length === 0) return monthOrders;
    const selected = new Set(selectedDays);
    return monthOrders.filter((o) => selected.has(businessDate(o.createdAt).getDate()));
  }, [monthOrders, selectedDays]);

  const last7DayKeys = useMemo(() => {
    const base = businessDate(Date.now());
    const keys: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      keys.push(dayKey(d));
    }
    return keys;
  }, []);

  const last7Days = useMemo(() => {
    const base = businessDate(Date.now());
    const list: Date[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      list.push(d);
    }
    return list;
  }, []);

  const last7Orders = useMemo(() => {
    return orders.filter((o) => last7DayKeys.includes(dayKey(businessDate(o.createdAt))));
  }, [orders, last7DayKeys]);

  const lastDayKey = useMemo(() => dayKey(businessDate(Date.now() - 24 * 60 * 60 * 1000)), []);
  const lastDayOrders = useMemo(() => orders.filter((o) => dayKey(businessDate(o.createdAt)) === lastDayKey), [orders, lastDayKey]);

  const mainOrders = statsMode === "last7" ? last7Orders : statsMode === "lastDay" ? lastDayOrders : filteredOrders;
  const stats = useMemo(() => calcStats(mainOrders), [mainOrders]);
  const statsTitle =
    statsMode === "last7"
      ? "إحصائيات آخر 7 أيام"
      : statsMode === "lastDay"
      ? "إحصائيات آخر يوم (آخر شفت)"
      : selectedDays.length
      ? "إحصائيات الأيام المختارة"
      : "إحصائيات الشهر";
  const dayOptions = useMemo(() => Array.from({ length: DAY_COUNT }, (_, i) => i + 1), []);

  return (
    <div className="page-enter" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>الإحصائيات</div>
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
        <div className="stats-mode">
          <button
            type="button"
            className="stats-mode-btn"
            data-active={statsMode === "lastDay"}
            onClick={() => setStatsMode("lastDay")}
          >
            آخر يوم
          </button>
          <button
            type="button"
            className="stats-mode-btn"
            data-active={statsMode === "last7"}
            onClick={() => setStatsMode("last7")}
          >
            آخر 7 أيام
          </button>
          <button
            type="button"
            className="stats-mode-btn"
            data-active={statsMode === "month"}
            onClick={() => setStatsMode("month")}
          >
            الشهر
          </button>
          <button
            type="button"
            className="stats-mode-btn"
            data-active={showDayPicker && statsMode === "month"}
            onClick={() => {
              setStatsMode("month");
              setShowDayPicker((prev) => !prev);
            }}
          >
            اختيار الأيام
          </button>
        </div>
      </div>

      {statsMode === "last7" ? (
        <div className="stats-range">
          <div className="stats-range-title">الأيام المشمولة</div>
          <div className="stats-range-chips">
            {last7Days.map((d) => (
              <span key={dayKey(d)} className="stats-range-chip">
                {d.getDate().toLocaleString("ar-SA")}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {statsMode === "month" && showDayPicker ? (
        <div className="panel day-picker-panel" style={{ border: "1px solid #eee", borderRadius: 16, padding: 16, display: "grid", gap: 12 }}>
          <div className="stats-section-title">الأيام</div>
          <div className="day-grid">
            {dayOptions.map((day) => {
              const active = selectedDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  className="day-pill"
                  data-active={active}
                  onClick={() => {
                    setSelectedDays((prev) => {
                      if (prev.includes(day)) return prev.filter((d) => d !== day);
                      return [...prev, day].sort((a, b) => a - b);
                    });
                  }}
                >
                  {day.toLocaleString("ar-SA")}
                </button>
              );
            })}
          </div>
          <div className="day-actions">
            <div className="day-note">
              الأيام المختارة: {selectedDays.length ? selectedDays.map((d) => d.toLocaleString("ar-SA")).join("، ") : "كل الشهر"}
            </div>
            <button
              type="button"
              className="day-clear"
              onClick={() => setSelectedDays([])}
              disabled={selectedDays.length === 0}
            >
              مسح التحديد
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        <div className="stats-section-title">{statsTitle}</div>
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
      </div>

      <div className="panel" style={{ border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 12 }}>الأصناف الأكثر طلباً</div>
        {stats.topItems.length === 0 ? (
          <div style={{ color: "#666" }}>لا توجد مبيعات مكتملة لهذه الفترة.</div>
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

function calcStats(orders: Order[]) {
  const done = orders.filter((o) => o.status === "DONE");
  const cancelled = orders.filter((o) => o.status === "CANCELLED");
  const preparing = orders.filter((o) => o.status === "PREPARING");
  const fresh = orders.filter((o) => o.status === "NEW");

  const revenueDone = done.reduce((s, o) => s + o.total, 0);
  const discounts = orders.reduce((s, o) => s + o.discountAmount, 0);
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
    totalOrders: orders.length,
    doneCount: done.length,
    cancelledCount: cancelled.length,
    preparingCount: preparing.length,
    newCount: fresh.length,
    revenueDone,
    discounts,
    avgTicket,
    topItems,
  };
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
