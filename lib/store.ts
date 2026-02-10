import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { firebaseEnabled, firestore } from "./firebase";

export type OrderItem = {
  id: string;
  name: string;
  basePrice: number;
  qty: number;
  sauces: string[];
  extras: { id: string; name: string; price: number; qty: number }[];
  note?: string | null;
};

export type Discount =
  | { kind: "none" }
  | { kind: "amount"; value: number } // SAR
  | { kind: "percent"; value: number }; // 0-100

export type OrderStatus = "NEW" | "PREPARING" | "DONE" | "CANCELLED";

export type OrderSource = "car" | "walkup";

export type Order = {
  id: string;
  createdAt: number;
  status: OrderStatus;
  source: OrderSource;
  carTag?: string;
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

function canUseFirebase() {
  return Boolean(typeof window !== "undefined" && firebaseEnabled && firestore);
}

type OrderRow = {
  created_at?: Timestamp | Date | number | string | null;
  status: OrderStatus;
  source?: OrderSource;
  car_tag?: string | null;
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

function toMillis(value: unknown) {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }
  return Date.now();
}

function normalizeItems(items: OrderItem[]) {
  return items.map((it) => ({
    id: it.id,
    name: it.name,
    basePrice: it.basePrice,
    qty: it.qty,
    sauces: Array.isArray(it.sauces) ? it.sauces : [],
    extras: Array.isArray(it.extras)
      ? it.extras.map((e) => ({
          id: e.id,
          name: e.name,
          price: e.price,
          qty: e.qty,
        }))
      : [],
    note: it.note ? it.note : null,
  }));
}

function toOrder(id: string, row: OrderRow): Order {
  const source: OrderSource = row.source ?? "walkup";
  return {
    id,
    createdAt: toMillis(row.created_at),
    status: row.status,
    source,
    carTag: source === "car" ? row.car_tag ?? undefined : undefined,
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
  if (canUseFirebase()) {
    try {
      const ordersRef = collection(firestore!, "orders");
      const q = query(ordersRef, orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) =>
        toOrder(docSnap.id, docSnap.data() as OrderRow)
      );
    } catch (error) {
      console.error("Failed to load orders", error);
      return [];
    }
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
  source?: OrderSource;
  carTag?: string;
}): Promise<Order | null> {
  if (canUseFirebase()) {
    const id = createOrderId();
    const createdAt = Timestamp.now();
    const normalizedItems = normalizeItems(input.items);
    const source: OrderSource = input.source ?? "walkup";
    const carTag = source === "car" ? (input.carTag ? input.carTag : null) : null;
    const payload: OrderRow = {
      created_at: createdAt,
      status: "NEW",
      source,
      car_tag: carTag,
      items: normalizedItems,
      discount: input.discount,
      subtotal: input.subtotal,
      discount_amount: input.discountAmount,
      total: input.total,
      note: input.note ? input.note : null,
    };

    try {
      await setDoc(doc(firestore!, "orders", id), payload);
      return toOrder(id, payload);
    } catch (error) {
      console.error("Failed to create order", error);
      return null;
    }
  }

  const order: Order = {
    id: createOrderId(),
    createdAt: Date.now(),
    status: "NEW",
    source: input.source ?? "walkup",
    carTag: input.source === "car" ? input.carTag ?? undefined : undefined,
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
  if (canUseFirebase()) {
    try {
      await updateDoc(doc(firestore!, "orders", id), { status });
    } catch (error) {
      console.error("Failed to update order status", error);
    }

    return;
  }

  const orders = localLoadOrders();
  const next = orders.map((o) => (o.id === id ? { ...o, status } : o));
  localSaveOrders(next);
}

export function subscribeOrders(onChange: () => void) {
  if (canUseFirebase()) {
    const ordersRef = collection(firestore!, "orders");
    const q = query(ordersRef, orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(
      q,
      () => onChange(),
      (error) => {
        console.error("Failed to subscribe to orders", error);
      }
    );

    return unsubscribe;
  }

  return localSubscribeOrders(onChange);
}

export function createOrderId() {
  // modern browsers
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `ord_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}
