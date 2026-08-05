import { getBots } from "@/lib/api";
import { formatRelativeTime, minutesSince } from "@/lib/format";
import { AppShell, type ShellHealth } from "@/components/AppShell";

async function loadHealth(): Promise<ShellHealth | undefined> {
  try {
    const bots = await getBots();
    const connected = bots.filter((bot) => {
      const mins = minutesSince(bot.lastSyncedAt);
      return mins !== null && mins <= 10;
    }).length;

    const latest = bots
      .map((bot) => bot.lastSyncedAt)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    const mins = minutesSince(latest);
    let tone: ShellHealth["tone"] = "warn";
    if (mins !== null && mins <= 5 && connected > 0) tone = "ok";
    if (connected === 0) tone = "bad";

    return {
      connected,
      total: bots.length,
      lastSyncLabel: formatRelativeTime(latest),
      tone,
    };
  } catch {
    return {
      connected: 0,
      total: 0,
      lastSyncLabel: "تعذّر التحقق",
      tone: "bad",
    };
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const health = await loadHealth();
  return <AppShell health={health}>{children}</AppShell>;
}
