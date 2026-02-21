import {
  Timestamp,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import {
  BALILA_EXTRA_ITEMS,
  DRINKS,
  EXTRA_ITEMS,
  MAIN_ITEMS,
  MenuItem,
} from "./menu";
import { firebaseEnabled, firestore } from "./firebase";

export type MenuPriceOverrides = Record<string, number>;

const STORAGE_KEY = "karfeshha_menu_price_overrides_v1";
const CHANNEL = "karfeshha_menu_price_overrides_channel";
const SETTINGS_COLLECTION = "settings";
const SETTINGS_DOC = "menu_prices";

const PRICEABLE_MENU_ITEMS = [
  ...MAIN_ITEMS,
  ...DRINKS,
  ...EXTRA_ITEMS,
  ...BALILA_EXTRA_ITEMS,
];

const PRICEABLE_MENU_MAP = new Map<string, MenuItem>(
  PRICEABLE_MENU_ITEMS.map((item) => [item.id, item])
);

export const PRICE_SECTIONS: { key: string; label: string; items: MenuItem[] }[] = [
  { key: "main", label: "الأصناف الرئيسية", items: MAIN_ITEMS },
  { key: "drinks", label: "المشروبات", items: DRINKS },
  { key: "extras", label: "الإضافات", items: EXTRA_ITEMS },
  { key: "balila", label: "إضافات البليلة", items: BALILA_EXTRA_ITEMS },
];

function canUseFirebase() {
  return Boolean(typeof window !== "undefined" && firebaseEnabled && firestore);
}

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeOverrides(value: unknown): MenuPriceOverrides {
  if (!value || typeof value !== "object") return {};

  const out: MenuPriceOverrides = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    const parsed = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) continue;
    out[id] = roundPrice(parsed);
  }

  return out;
}

function roundPrice(price: number) {
  return Math.round(price * 100) / 100;
}

function localLoadMenuPriceOverrides() {
  if (typeof window === "undefined") return {};
  const parsed = safeParse<Record<string, unknown>>(
    localStorage.getItem(STORAGE_KEY),
    {}
  );
  return normalizeOverrides(parsed);
}

function localSaveMenuPriceOverrides(overrides: MenuPriceOverrides) {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeOverrides(overrides)));

  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage({ type: "SYNC" });
    bc.close();
  } catch {
    // ignore
  }
}

function localSubscribeMenuPriceOverrides(onChange: () => void) {
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

type MenuPricesDoc = {
  values?: Record<string, number | string | null>;
};

export function getMenuPriceById(
  itemId: string,
  fallbackPrice: number,
  overrides: MenuPriceOverrides
) {
  const override = overrides[itemId];
  if (Number.isFinite(override) && override >= 0) return override;
  return fallbackPrice;
}

export function getMenuItemPrice(item: MenuItem, overrides: MenuPriceOverrides) {
  return getMenuPriceById(item.id, item.price, overrides);
}

export function applyMenuPriceOverrides(
  items: MenuItem[],
  overrides: MenuPriceOverrides
): MenuItem[] {
  return items.map((item) => ({
    ...item,
    price: getMenuItemPrice(item, overrides),
  }));
}

export function getAllPriceableItems() {
  return PRICEABLE_MENU_ITEMS;
}

export function getPriceableItemById(itemId: string) {
  return PRICEABLE_MENU_MAP.get(itemId) ?? null;
}

export async function loadMenuPriceOverrides(): Promise<MenuPriceOverrides> {
  if (canUseFirebase()) {
    try {
      const ref = doc(firestore!, SETTINGS_COLLECTION, SETTINGS_DOC);
      const snapshot = await getDoc(ref);
      const data = snapshot.data() as MenuPricesDoc | undefined;
      return normalizeOverrides(data?.values ?? {});
    } catch (error) {
      console.error("Failed to load menu price overrides", error);
      return localLoadMenuPriceOverrides();
    }
  }

  return localLoadMenuPriceOverrides();
}

export async function saveMenuPriceOverrides(overrides: MenuPriceOverrides) {
  const normalized = normalizeOverrides(overrides);

  if (canUseFirebase()) {
    const payload: MenuPricesDoc & { updated_at: Timestamp } = {
      values: normalized,
      updated_at: Timestamp.now(),
    };

    try {
      await setDoc(doc(firestore!, SETTINGS_COLLECTION, SETTINGS_DOC), payload);
      localSaveMenuPriceOverrides(normalized);
      return;
    } catch (error) {
      console.error("Failed to save menu price overrides", error);
    }
  }

  localSaveMenuPriceOverrides(normalized);
}

export function subscribeMenuPriceOverrides(onChange: () => void) {
  const unsubscribeLocal = localSubscribeMenuPriceOverrides(onChange);

  if (canUseFirebase()) {
    const unsubscribeRemote = onSnapshot(
      doc(firestore!, SETTINGS_COLLECTION, SETTINGS_DOC),
      () => onChange(),
      (error) => {
        console.error("Failed to subscribe to menu price overrides", error);
      }
    );

    return () => {
      unsubscribeLocal();
      unsubscribeRemote();
    };
  }

  return unsubscribeLocal;
}
