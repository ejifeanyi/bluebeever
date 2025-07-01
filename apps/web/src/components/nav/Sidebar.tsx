"use client";

import { useState } from "react";
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

interface Label {
  id: string;
  name: string;
  color: string;
  count?: number;
}

const Sidebar: React.FC = () => {
  const [activeItem, setActiveItem] = useState("inbox");

  const labels: Label[] = [
    { id: "1", name: "Work", color: "#3b82f6", count: 12 },
    { id: "2", name: "Personal", color: "#10b981", count: 8 },
    { id: "3", name: "Important", color: "#f59e0b", count: 3 },
    { id: "4", name: "Travel", color: "#8b5cf6", count: 5 },
    { id: "5", name: "Finance", color: "#ef4444", count: 2 },
    { id: "6", name: "Health", color: "#06b6d4" },
  ];

  const mainItems = [
    { id: "inbox", icon: Inbox, name: "Inbox", count: 3 },
    { id: "favorites", icon: Star, name: "Favorites", count: 7 },
    { id: "sent", icon: Send, name: "Sent" },
    { id: "drafts", icon: FileText, name: "Drafts", count: 2 },
    { id: "spam", icon: AlertTriangle, name: "Spam", count: 15 },
    { id: "archive", icon: Archive, name: "Archive" },
    { id: "trash", icon: Trash2, name: "Trash", count: 4 },
  ];

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
              active={activeItem === item.id}
              onClick={() => setActiveItem(item.id)}
            />
          ))}
        </SidebarSection>

        <SidebarSection title="Categories" collapsible defaultCollapsed={false}>
          <SidebarItem
            icon={Folder}
            name="All Categories"
            active={activeItem === "categories"}
            onClick={() => setActiveItem("categories")}
          />
        </SidebarSection>

        <SidebarSection title="Labels" collapsible defaultCollapsed={false}>
          {labels.map((label) => (
            <LabelItem
              key={label.id}
              label={label}
              active={activeItem === `label-${label.id}`}
              onClick={() => setActiveItem(`label-${label.id}`)}
            />
          ))}
        </SidebarSection>
      </div>
    </aside>
  );
};

export default Sidebar;
