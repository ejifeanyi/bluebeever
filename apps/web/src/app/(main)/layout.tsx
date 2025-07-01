import Sidebar from "@/components/nav/Sidebar";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <div className="h-full bg-card rounded-lg border shadow-sm p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
