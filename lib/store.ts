import { supabase, supabaseEnabled } from "./supabase";

export type OrderItem = {
  id: string;
  name: string;
  basePrice: number;
  qty: number;
  sauces: string[];
  extras: { id: string; name: string; price: number; qty: number }[];
  note?: string;
};

export type Discount =
  | { kind: "none" }
  | { kind: "amount"; value: number } // SAR
  | { kind: "percent"; value: number }; // 0-100

export type OrderStatus = "NEW" | "PREPARING" | "DONE" | "CANCELLED";

export type Order = {
  id: string;
  createdAt: number;
  status: OrderStatus;
  items: OrderItem[];
  discount: Discount;
  subtotal: number;
  discountAmount: number;
  total: number;
  note?: string;
};

const STORAGE_KEY = "karfeshha_orders_v1";
const CHANNEL = "karfeshha_orders_channel";

function safeParse<T>(v: string | null, fallback: T): T {
  try {
    if (!v) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

function localLoadOrders(): Order[] {
  if (typeof window === "undefined") return [];
  return safeParse<Order[]>(localStorage.getItem(STORAGE_KEY), []);
}

function localSaveOrders(orders: Order[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage({ type: "SYNC" });
    bc.close();
  } catch {
    // ignore
  }
}

function localSubscribeOrders(onChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handler = () => onChange();

  window.addEventListener("storage", handler);

  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = handler;
  } catch {
    // ignore
  }

  return () => {
    window.removeEventListener("storage", handler);
    if (bc) bc.close();
  };
}

function canUseSupabase() {
  return Boolean(typeof window !== "undefined" && supabaseEnabled && supabase);
}

type OrderRow = {
  id: string;
  created_at: string;
  status: OrderStatus;
  items: OrderItem[];
  discount: Discount;
  subtotal: number | string;
  discount_amount: number | string;
  total: number | string;
  note?: string | null;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    status: row.status,
    items: Array.isArray(row.items) ? row.items : [],
    discount: row.discount ?? { kind: "none" },
    subtotal: toNumber(row.subtotal),
    discountAmount: toNumber(row.discount_amount),
    total: toNumber(row.total),
    note: row.note ?? undefined,
  };
}

export function calcOrderTotals(items: OrderItem[], discount: Discount) {
  const subtotal = items.reduce((sum, it) => {
    const extrasSum = it.extras.reduce((eSum, e) => eSum + e.price * e.qty, 0);
    return sum + (it.basePrice + extrasSum) * it.qty;
  }, 0);

  let discountAmount = 0;
  if (discount.kind === "amount") {
    discountAmount = Math.max(0, Math.min(discount.value, subtotal));
  } else if (discount.kind === "percent") {
    const pct = Math.max(0, Math.min(discount.value, 100));
    discountAmount = (subtotal * pct) / 100;
  }

  const total = Math.max(0, subtotal - discountAmount);
  return { subtotal, discountAmount, total };
}

export async function loadOrders(): Promise<Order[]> {
  if (canUseSupabase()) {
    const { data, error } = await supabase!
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load orders", error);
      return [];
    }

    return (data ?? []).map((row) => toOrder(row as OrderRow));
  }

  return localLoadOrders();
}

export async function createOrder(input: {
  items: OrderItem[];
  discount: Discount;
  subtotal: number;
  discountAmount: number;
  total: number;
  note?: string;
}): Promise<Order | null> {
  if (canUseSupabase()) {
    const { data, error } = await supabase!
      .from("orders")
      .insert({
        status: "NEW",
        items: input.items,
        discount: input.discount,
        subtotal: input.subtotal,
        discount_amount: input.discountAmount,
        total: input.total,
        note: input.note ?? null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Failed to create order", error);
      return null;
    }

    return data ? toOrder(data as OrderRow) : null;
  }

  const order: Order = {
    id: createOrderId(),
    createdAt: Date.now(),
    status: "NEW",
    items: input.items,
    discount: input.discount,
    subtotal: input.subtotal,
    discountAmount: input.discountAmount,
    total: input.total,
    note: input.note ?? undefined,
  };

  const orders = localLoadOrders();
  localSaveOrders([order, ...orders]);
  return order;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  if (canUseSupabase()) {
    const { error } = await supabase!
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Failed to update order status", error);
    }

    return;
  }

  const orders = localLoadOrders();
  const next = orders.map((o) => (o.id === id ? { ...o, status } : o));
  localSaveOrders(next);
}

export function subscribeOrders(onChange: () => void) {
  if (canUseSupabase()) {
    const channel = supabase!
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => onChange()
      )
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }

  return localSubscribeOrders(onChange);
}

export function createOrderId() {
  // modern browsers
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `ord_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}
