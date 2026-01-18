import Image from "next/image";

export function ItemCard(props: {
  title: string;
  price: number;
  img?: string;
  onClick: () => void;
}) {
  return (
    <button
      className="menu-card"
      onClick={props.onClick}
      style={{
        border: "1px solid #e6e6e6",
        borderRadius: 16,
        padding: 12,
        textAlign: "left",
        background: "white",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ borderRadius: 12, overflow: "hidden", background: "transparent" }}>
        <Image
          src={props.img ?? "/items/placeholder.png"}
          alt={props.title}
          width={600}
          height={400}
          style={{ width: "100%", height: "auto", objectFit: "contain", display: "block" }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>{props.title}</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{props.price} SAR</div>
      </div>
    </button>
  );
}
