import { cn } from "@/lib/utils";
import { Circle } from "lucide-react";

interface Label {
  id: string;
  name: string;
  color: string;
  count?: number;
}

const LabelItem: React.FC<{
  label: Label;
  active?: boolean;
  onClick?: () => void;
}> = ({ label, active = false, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 group hover:bg-accent/50",
        active && "bg-accent text-accent-foreground shadow-sm"
      )}
    >
      <div className="flex items-center space-x-3">
        <Circle
          className={cn("h-2 w-2 fill-current")}
          style={{ color: label.color }}
        />
        <span
          className={cn(
            "font-medium transition-colors text-left",
            active
              ? "text-foreground"
              : "text-muted-foreground group-hover:text-foreground"
          )}
        >
          {label.name}
        </span>
      </div>
      {label.count !== undefined && label.count > 0 && (
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full transition-all",
            active
              ? "bg-primary/10 text-primary font-medium"
              : "bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground"
          )}
        >
          {label.count}
        </span>
      )}
    </button>
  );
};

export default LabelItem;