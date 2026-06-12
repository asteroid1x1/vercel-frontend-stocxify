import type { CSSProperties, HTMLAttributes } from "react";

export type IconName =
  | "arrowRight"
  | "arrowLeft"
  | "barChart"
  | "bell"
  | "badge"
  | "banknote"
  | "check"
  | "chevronRight"
  | "chevronDown"
  | "creditCard"
  | "fileBadge"
  | "fileText"
  | "folder"
  | "flame"
  | "link"
  | "lineChart"
  | "listChecks"
  | "lock"
  | "mail"
  | "phone"
  | "receipt"
  | "scale"
  | "search"
  | "send"
  | "shieldCheck"
  | "sparkle"
  | "star"
  | "store"
  | "target"
  | "timer"
  | "trendingDown"
  | "trendingUp"
  | "users"
  | "wallet"
  | "x"
  | "zap"
  | "eye"
  | "eyeOff"
  | "google"
  | "apple"
  | "helpCircle"
  | "headset"
  | "layoutDashboard"
  | "activity"
  | "gear"
  | "logout"
  | "circleCheck"
  | "plus"
  | "chevronDown"
  | "user"
  | "bank"
  | "download"
  | "rupee"
  | "edit"
  | "ban"
  | "power";

const icons: Record<IconName, string> = {
  layoutDashboard: "fa-solid fa-table-columns",
  activity: "fa-solid fa-bolt",
  gear: "fa-solid fa-gear",
  logout: "fa-solid fa-right-from-bracket",
  circleCheck: "fa-solid fa-circle-check",
  plus: "fa-solid fa-plus",
  chevronDown: "fa-solid fa-chevron-down",
  user: "fa-solid fa-user",
  bank: "fa-solid fa-building-columns",
  download: "fa-solid fa-download",
  rupee: "fa-solid fa-indian-rupee-sign",
  edit: "fa-solid fa-pen",
  ban: "fa-solid fa-ban",
  power: "fa-solid fa-power-off",
  arrowRight: "fa-solid fa-arrow-right",
  arrowLeft: "fa-solid fa-arrow-left",
  barChart: "fa-solid fa-chart-column",
  badge: "fa-solid fa-certificate",
  banknote: "fa-solid fa-money-bill-wave",
  bell: "fa-solid fa-bell",
  check: "fa-solid fa-check",
  chevronRight: "fa-solid fa-chevron-right",
  creditCard: "fa-solid fa-credit-card",
  eye: "fa-solid fa-eye",
  eyeOff: "fa-solid fa-eye-slash",
  fileBadge: "fa-solid fa-file-circle-check",
  fileText: "fa-solid fa-file-lines",
  flame: "fa-solid fa-fire",
  folder: "fa-solid fa-folder-open",
  google: "fa-brands fa-google",
  apple: "fa-brands fa-apple",
  link: "fa-solid fa-link",
  lineChart: "fa-solid fa-chart-line",
  listChecks: "fa-solid fa-list-check",
  lock: "fa-solid fa-lock",
  mail: "fa-solid fa-envelope",
  phone: "fa-solid fa-phone",
  receipt: "fa-solid fa-receipt",
  scale: "fa-solid fa-scale-balanced",
  search: "fa-solid fa-magnifying-glass",
  send: "fa-solid fa-paper-plane",
  shieldCheck: "fa-solid fa-shield-halved",
  sparkle: "fa-solid fa-wand-magic-sparkles",
  star: "fa-solid fa-star",
  store: "fa-solid fa-store",
  target: "fa-solid fa-bullseye",
  timer: "fa-solid fa-stopwatch",
  trendingDown: "fa-solid fa-arrow-trend-down",
  trendingUp: "fa-solid fa-arrow-trend-up",
  users: "fa-solid fa-users",
  wallet: "fa-solid fa-wallet",
  x: "fa-solid fa-xmark",
  zap: "fa-solid fa-bolt",
  helpCircle: "fa-solid fa-circle-question",
  headset: "fa-solid fa-headset",
};

function getFontSize(className?: string): CSSProperties["fontSize"] {
  if (!className) return undefined;

  const arbitraryHeight = className.match(/(?:^|\s)h-\[([^\]]+)\]/);
  if (arbitraryHeight) return arbitraryHeight[1];

  const spacingHeight = className.match(/(?:^|\s)h-(\d+(?:\.\d+)?)(?:\s|$)/);
  if (!spacingHeight) return undefined;

  return `${Number(spacingHeight[1]) * 0.25}rem`;
}

export function Icon({
  name,
  className,
  style,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { name: IconName }) {
  const fontSize = getFontSize(className);

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center leading-none ${className ?? ""}`}
      style={{ fontSize, ...style }}
      {...props}
    >
      <i className={`${icons[name]} fa-fw`} />
    </span>
  );
}
