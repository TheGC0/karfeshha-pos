export type Category = "Main" | "Extra" | "Sauces" | "Drinks";

export type MenuItem = {
  id: string;
  name: string;
  price: number; // SAR
  category: Category;
  img?: string; // path in /public e.g. "/items/original.png"
};

export const MAIN_ITEMS: MenuItem[] = [
  { id: "main-parm-truffle", name: "سقنتشر بارميزان ترفل كرفشه", price: 25, category: "Main", img: "/items/سقنتشر بارميزان ترفل كرفشه.png" },
  { id: "main-jalapeno-cheddar", name: "سقنتشر جالبينو تشيدر كرفشه", price: 25, category: "Main", img: "/items/سقنتشر جالبينو تشيدر كرفشه.png" },
  { id: "main-original", name: "اورجينال كرفشه", price: 22, category: "Main", img: "/items/اورجينال كرفشه.png" },
  { id: "main-mix-signature", name: "مكس سقنتشر كرفشه", price: 28, category: "Main", img: "/items/مكس سقنتشر كرفشه.png" },
  { id: "main-balila", name: "بليلة", price: 10, category: "Main", img: "/items/بليلة.png" },
];

export const EXTRA_ITEMS: MenuItem[] = [
  { id: "extra-cheddar-sauce", name: "اضافة صوص جبنة تشيدر", price: 5, category: "Extra" },
  { id: "extra-truffle-sauce", name: "اضافة صوص ترفل", price: 5, category: "Extra" },
  { id: "extra-jalapeno-pieces", name: "اضافة قطع هالبينو", price: 5, category: "Extra" },
  { id: "extra-parmesan", name: "اضافة جبنة بارميزان", price: 5, category: "Extra" },
];

export const BALILA_EXTRA_ITEMS: MenuItem[] = [
  { id: "balila-pickles", name: "مخلل", price: 0, category: "Extra" },
  { id: "balila-chili", name: "شطة", price: 0, category: "Extra" },
  { id: "balila-cumin", name: "كمون", price: 0, category: "Extra" },
  { id: "balila-vinegar", name: "خل", price: 0, category: "Extra" },
];

export const SAUCES: string[] = [
  "كتشب",
  "حمر",
  "ثوم",
  "شطة خضرا",
  "شطة سبيشال",
  "شطة قوارير",
  "كيجن",
  "فلفل اسود",
  "كمون",
];

export const DRINKS: MenuItem[] = [
  { id: "drink-berry-juice", name: "عصير توت", price: 8, category: "Drinks", img: "/items/عصير توت.png" },
  { id: "drink-water", name: "مويا", price: 2, category: "Drinks", img: "/items/مويا.png" },
  { id: "drink-subya-white", name: "سوبية بيضاء", price: 6, category: "Drinks", img: "/items/سوبيا ابيض.png" },
  { id: "drink-subya-red", name: "سوبية حمراء", price: 6, category: "Drinks", img: "/items/سوبيا احمر.png" },
  { id: "drink-pepsi", name: "بيبسي", price: 5, category: "Drinks", img: "/items/ببسي.png" },
];
