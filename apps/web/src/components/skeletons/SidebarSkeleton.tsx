import { Skeleton } from "@/components/ui/skeleton";

const SidebarSkeleton: React.FC = () => {
  return (
    <aside className="w-64 bg-sidebar rounded-lg h-full min-h-screen p-4 space-y-6">
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SidebarSkeleton;
