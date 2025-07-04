"use client";

import { useEffect } from "react";
import SidebarItem from "./SidebarItem";
import SidebarSection from "./SidebarSection";
import {
  AlertTriangle,
  Archive,
  FileText,
  Folder,
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
  const { activeFolder, setActiveFolder, stats, loadStats } = useEmailStore();

  useEffect(() => {
    loadStats();
  }, [loadStats]);

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
    },
    {
      id: "favorites" as EmailFolder,
      icon: Star,
      name: "Favorites",
      count: stats?.favoritesCount || 0,
    },
    {
      id: "sent" as EmailFolder,
      icon: Send,
      name: "Sent",
      count: stats?.sentCount || 0,
    },
    {
      id: "drafts" as EmailFolder,
      icon: FileText,
      name: "Drafts",
      count: stats?.draftsCount || 0,
    },
    {
      id: "spam" as EmailFolder,
      icon: AlertTriangle,
      name: "Spam",
      count: stats?.spamCount || 0,
    },
    {
      id: "archive" as EmailFolder,
      icon: Archive,
      name: "Archive",
      count: stats?.archiveCount || 0,
    },
    {
      id: "trash" as EmailFolder,
      icon: Trash2,
      name: "Trash",
      count: stats?.trashCount || 0,
    },
  ];

  const handleFolderClick = (folderId: EmailFolder) => {
    setActiveFolder(folderId);
  };

  const handleLabelClick = (labelId: string) => {
    // TODO: Implement label filtering when categories are implemented
    console.log("Label clicked:", labelId);
  };

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
              active={activeFolder === item.id}
              onClick={() => handleFolderClick(item.id)}
            />
          ))}
        </SidebarSection>

        <SidebarSection title="Categories" collapsible defaultCollapsed={false}>
          <SidebarItem
            icon={Folder}
            name="All Categories"
            active={activeFolder === "inbox" && false}
            onClick={() => console.log("Categories to be implemented")}
          />
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
