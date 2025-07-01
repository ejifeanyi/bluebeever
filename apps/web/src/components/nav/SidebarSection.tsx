"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SidebarSectionProps {
  title?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="space-y-2">
      {collapsible ? (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between space-x-2 w-full px-3 py-5 text-sm font-bold text-foreground"
        >
          <span>{title}</span>
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
      ) : (
        <div className="px-3 py-1">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
        </div>
      )}
      {!collapsed && <div className="space-y-1">{children}</div>}
    </div>
  );
};

export default SidebarSection;
