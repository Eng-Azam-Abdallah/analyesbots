import { Inbox } from "lucide-react";
import styles from "./EmptyState.module.css";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={`uiEmpty ${styles.wrap}`} role="status">
      <Inbox className={styles.icon} size={28} aria-hidden />
      <h2 className="uiEmptyTitle">{title}</h2>
      <p className="uiEmptyText">{description}</p>
      {action}
    </div>
  );
}
