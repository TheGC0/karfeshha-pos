import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="home-shell page-enter">
      <div className="home-center">
        <div className="home-logo">
          <Image src="/text_noBg.png" alt="Karfeshha" width={520} height={220} priority />
        </div>
        <div className="home-subtitle">اختار الواجهة</div>
        <div className="home-options">
          <Link className="home-card" href="/taker" aria-label="Order Taker">
            <span className="home-icon">
              <ReceiptIcon />
            </span>
            <span className="home-label">استقبال الطلبات</span>
            <span className="home-meta">Order Taker</span>
          </Link>

          <Link className="home-card" href="/kitchen" aria-label="Kitchen">
            <span className="home-icon">
              <KitchenIcon />
            </span>
            <span className="home-label">المطبخ</span>
            <span className="home-meta">Kitchen</span>
          </Link>

          <Link className="home-card" href="/stats" aria-label="Stats">
            <span className="home-icon">
              <StatsIcon />
            </span>
            <span className="home-label">الإحصائيات</span>
            <span className="home-meta">Stats</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ReceiptIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="18" y="10" width="28" height="44" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <path d="M24 22h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 30h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 38h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function KitchenIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M16 38c0-9 7.2-16 16-16s16 7 16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14 38h36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="20" y="40" width="24" height="10" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="32" cy="20" r="3" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M14 48V30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 48V20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M38 48V26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M50 48V16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 48h40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
