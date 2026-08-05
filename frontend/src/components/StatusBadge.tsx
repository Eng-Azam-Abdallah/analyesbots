import {
  ArrowDownRight,
  ArrowUpRight,
  CircleOff,
  Minus,
  PackagePlus,
  PackageX,
} from "lucide-react";
import type { MarketChangeKind } from "@/lib/types";
import { CHANGE_LABELS } from "@/lib/labels";
import styles from "./StatusBadge.module.css";

type Kind =
  | MarketChangeKind
  | "active"
  | "paused"
  | "inactive"
  | "stale"
  | "error";

const statusLabels: Record<Kind, string> = {
  ...CHANGE_LABELS,
  active: "نشط",
  paused: "متأخر",
  inactive: "موقوف",
  stale: "بيانات قديمة",
  error: "فشل",
};

function KindIcon({ kind }: { kind: Kind }) {
  const props = { size: 12, "aria-hidden": true as const };
  switch (kind) {
    case "up":
    case "stock_up":
      return <ArrowUpRight {...props} />;
    case "down":
    case "stock_down":
      return <ArrowDownRight {...props} />;
    case "new":
      return <PackagePlus {...props} />;
    case "gone":
      return <PackageX {...props} />;
    case "inactive":
    case "error":
      return <CircleOff {...props} />;
    default:
      return <Minus {...props} />;
  }
}

export function StatusBadge({ kind }: { kind: Kind }) {
  return (
    <span className={`${styles.badge} ${styles[kind]}`}>
      <KindIcon kind={kind} />
      {statusLabels[kind]}
    </span>
  );
}

export function ChangeBadge({ kind }: { kind: MarketChangeKind }) {
  return <StatusBadge kind={kind} />;
}
