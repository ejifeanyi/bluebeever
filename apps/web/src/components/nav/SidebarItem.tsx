import React from "react";

type Props = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  name: string;
  count?: number;
  active?: boolean;
};

const SidebarItem = ({ icon: Icon, name, count, active = false }: Props) => {
  return (
    <div className="flex items-center w-full justify-between">
      <div className="flex items-center">
        <Icon
          className={`size-5 transition-colors ${
            active ? "text-blueBeever-500" : "text-text-muted"
          }`}
        />
        <span
          className={`ml-3 text-md transition-colors ${
            active ? "text-text-main" : "text-text-muted"
          }`}
        >
          {name}
        </span>
      </div>
      {count !== undefined && (
        <span
          className={`text-xs transition-all ${
            active
              ? "bg-blue-100 text-blue-700 rounded-full px-2 py-0.5"
              : "text-text-muted"
          }`}
        >
          {count}
        </span>
      )}
    </div>
  );
};

export default SidebarItem;
