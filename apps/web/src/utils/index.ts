import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

const customLocale = {
  ...enUS,
  formatDistance: (token: string, count: number, options: any) => {
    // Cast token to FormatDistanceToken to satisfy the type checker
    let result = enUS.formatDistance(token as any, count, options);
    return result.replace(/^about /, "");
  },
};

export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

export const getSenderName = (from: string) => {
  const match = from.match(/^(.+?)\s*<.*>$/);
  return match ? match[1].trim() : from;
};

export const getSenderNameInitials = (from: string) => {
  const name = getSenderName(from);
  const initials = name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return initials.length > 2 ? initials.slice(0, 2) : initials;
};

export const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: customLocale });
  } catch {
    return "Unknown date";
  }
};
