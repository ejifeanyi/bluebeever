"use client";

import React, { useState } from "react";
import { Search, Bell, Settings } from "lucide-react";

interface HeaderProps {
  onSearch?: (query: string) => void;
  notificationCount?: number;
  userImage?: string;
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({
  onSearch,
  notificationCount = 0,
  userImage,
  userName = "John Doe",
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  return (
    <header className="flex items-center justify-between py-4 px-6 bg-background border-b border-border">
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          <h1 className="text-xl font-bold text-primary tracking-tight">
            BlueBeever
          </h1>
        </div>

        <div className="relative w-96">
          <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-lg border transition-all duration-200">
            <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search in mail"
              value={searchQuery}
              onChange={handleSearchChange}
              className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground text-foreground"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
          {notificationCount > 0 && (
            <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-red-500 rounded-full">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </div>

        <Settings className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />

        <div className="flex-shrink-0">
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm font-medium text-muted-foreground">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
