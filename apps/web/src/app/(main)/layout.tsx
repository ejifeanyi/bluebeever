import Header from "@/components/nav/Header";
import Sidebar from "@/components/nav/Sidebar";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header
        // onSearch={(query) => console.log("Search:", query)}
        notificationCount={3}
        userName="Jane Smith"
        userEmail="jane@company.com"
        userImage="/path/to/avatar.jpg"
      />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <div className="h-full p-6">
            <div className="h-full bg-card rounded-lg border shadow-sm p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
