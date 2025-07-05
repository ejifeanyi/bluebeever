import { formatDistanceToNow } from "date-fns";

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
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "Unknown date";
  }
};
