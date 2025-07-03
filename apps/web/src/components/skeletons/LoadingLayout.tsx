import DashboardSkeleton from "./DashboardSkeloton";
import HeaderSkeleton from "./HeaderSkeleton";
import SidebarSkeleton from "./SidebarSkeleton";

interface LoadingLayoutProps {
  showDashboard?: boolean;
  children?: React.ReactNode;
}

const LoadingLayout: React.FC<LoadingLayoutProps> = ({
  showDashboard = true,
  children,
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HeaderSkeleton />
      <div className="flex">
        <SidebarSkeleton />
        <main className="flex-1 overflow-hidden">
          <div className="h-full p-6">
            <div className="h-full bg-card rounded-lg p-6">
              {children || (showDashboard && <DashboardSkeleton />)}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LoadingLayout;
