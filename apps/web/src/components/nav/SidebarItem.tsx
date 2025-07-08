import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon?: React.ComponentType<{ className?: string }>;
  name: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  name,
  count,
  active = false,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 group hover:bg-accent/50 cursor-pointer",
        active && "bg-primary/10"
      )}
    >
      <div className="flex items-center space-x-3">
        {Icon && (
          <Icon
            className={cn(
              "h-4 w-4 transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground group-hover:text-foreground"
            )}
          />
        )}
        <span
          className={cn(
            "font-medium transition-colors",
            active
              ? "text-foreground"
              : "text-muted-foreground group-hover:text-foreground"
          )}
        >
          {name}
        </span>
      </div>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full transition-all",
            active ? "bg-primary/10 text-primary" : "text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
};

export default SidebarItem;
