import Image from "next/image";
import Link from "next/link";

export function LogoBar() {
  return (
    <div className="logo-bar" style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, borderBottom: "1px solid #eee" }}>
      <Image src="/karfeshha.svg" alt="Karfeshha" width={140} height={60} priority />
      <div className="logo-links" style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
        <Link href="/taker">Order Taker</Link>
        <Link href="/kitchen">Kitchen</Link>
      </div>
    </div>
  );
}
