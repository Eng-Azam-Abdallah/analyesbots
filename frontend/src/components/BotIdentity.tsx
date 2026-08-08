import Link from "next/link";
import { botDisplayName, telegramBotUrl } from "@/lib/format";
import styles from "./BotIdentity.module.css";

type BotIdentityProps = {
  bot: {
    displayName?: string | null;
    name?: string;
    username: string;
  };
  /** stacked (default) أو بجانب بعض */
  layout?: "stack" | "inline";
  /** اسم أصغر — للقوائم الضيقة */
  compact?: boolean;
  /** اسم أوضح في بطاقة المصدر */
  prominent?: boolean;
  /** ربط الاسم بصفحة متجر التاجر */
  linkToStore?: boolean;
  className?: string;
};

export function BotIdentity({
  bot,
  layout = "stack",
  compact = false,
  prominent = false,
  linkToStore = false,
  className,
}: BotIdentityProps) {
  const name = botDisplayName(bot);
  const handle = bot.username.replace(/^@/, "").trim();
  const href = telegramBotUrl(handle);
  const storeHref = `/bots/${encodeURIComponent(handle)}`;
  const rootClass = [
    styles.root,
    layout === "inline" ? styles.inline : "",
    compact ? styles.compact : "",
    prominent ? styles.prominent : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={rootClass}>
      {linkToStore ? (
        <Link href={storeHref} className={styles.nameLink} title="عرض متجر التاجر">
          {name}
        </Link>
      ) : (
        <span className={styles.name}>{name}</span>
      )}
      {href ? (
        <a
          className={`${styles.username} ltr`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={`فتح @${handle} في تليجرام`}
        >
          @{handle}
        </a>
      ) : (
        <span className={`${styles.usernamePlain} ltr`}>@{handle}</span>
      )}
    </span>
  );
}
