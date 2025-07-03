import { Skeleton } from "@/components/ui/skeleton";

const HeaderSkeleton: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-background">
      <Skeleton className="h-6 w-32" />

      <div className="flex-1 max-w-md ml-3 mr-8">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      <div className="flex items-center space-x-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="hidden md:block">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderSkeleton;
