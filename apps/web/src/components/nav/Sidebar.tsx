"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import SidebarItem from "./SidebarItem";
import SidebarSection from "./SidebarSection";
import {
  AlertTriangle,
  Archive,
  FileText,
  Inbox,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import LabelItem from "./LabelItem";
import { EmailFolder } from "@/types/email";
import { useEmailStore } from "@/store/useEmailStore";

interface Label {
  id: string;
  name: string;
  color: string;
  count?: number;
}

const Sidebar: React.FC = () => {
  const { activeFolder, stats, categories, loadStats, loadCategories } =
    useEmailStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    loadStats();
    loadCategories();
  }, [loadStats, loadCategories]);

  const labels: Label[] = [
    { id: "1", name: "Work", color: "#3b82f6", count: 12 },
    { id: "2", name: "Personal", color: "#10b981", count: 8 },
    { id: "3", name: "Important", color: "#f59e0b", count: 3 },
    { id: "4", name: "Travel", color: "#8b5cf6", count: 5 },
    { id: "5", name: "Finance", color: "#ef4444", count: 2 },
    { id: "6", name: "Health", color: "#06b6d4" },
  ];

  const mainItems = [
    {
      id: "inbox" as EmailFolder,
      icon: Inbox,
      name: "Inbox",
      count: stats?.inboxCount || 0,
      path: "/inbox",
    },
    {
      id: "favorites" as EmailFolder,
      icon: Star,
      name: "Favorites",
      count: stats?.favoritesCount || 0,
      path: "/favorites",
    },
    {
      id: "sent" as EmailFolder,
      icon: Send,
      name: "Sent",
      count: stats?.sentCount || 0,
      path: "/sent",
    },
    {
      id: "drafts" as EmailFolder,
      icon: FileText,
      name: "Drafts",
      count: stats?.draftsCount || 0,
      path: "/drafts",
    },
    {
      id: "spam" as EmailFolder,
      icon: AlertTriangle,
      name: "Spam",
      count: stats?.spamCount || 0,
      path: "/spam",
    },
    {
      id: "archive" as EmailFolder,
      icon: Archive,
      name: "Archive",
      count: stats?.archiveCount || 0,
      path: "/archive",
    },
    {
      id: "trash" as EmailFolder,
      icon: Trash2,
      name: "Trash",
      count: stats?.trashCount || 0,
      path: "/trash",
    },
  ];

  const handleFolderClick = (path: string) => {
    router.push(path);
  };

  const handleLabelClick = (labelId: string) => {
    console.log("Label clicked:", labelId);
  };

  const handleCategoryClick = (categoryName: string) => {
    console.log("Category clicked:", categoryName);
  };

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="w-50 h-screen flex flex-col">
      <div className="flex-1 px-3 pb-6 space-y-6 overflow-y-auto">
        <SidebarSection>
          {mainItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              name={item.name}
              count={item.count}
              active={isActive(item.path)}
              onClick={() => handleFolderClick(item.path)}
            />
          ))}
        </SidebarSection>

        <SidebarSection title="Categories" collapsible defaultCollapsed={false}>
          {categories.map((category, index) => (
            <SidebarItem
              key={category.name || index}
              name={category.name || "Unknown Category"}
              count={category.count}
              active={false}
              onClick={() => handleCategoryClick(category.name || "unknown")}
            />
          ))}
        </SidebarSection>

        <SidebarSection title="Labels" collapsible defaultCollapsed={false}>
          {labels.map((label) => (
            <LabelItem
              key={label.id}
              label={label}
              active={false}
              onClick={() => handleLabelClick(label.id)}
            />
          ))}
        </SidebarSection>
      </div>
    </aside>
  );
};

export default Sidebar;
