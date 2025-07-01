"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";

interface HeaderProps {
  onSearch?: (query: string) => void;
  notificationCount?: number;
  userImage?: string;
  userName?: string;
  userEmail?: string;
}

const Header: React.FC<HeaderProps> = ({
  onSearch,
  notificationCount = 0,
  userImage,
  userName = "John Doe",
  userEmail = "john@example.com",
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

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
            <Search className="h-4 w-4 flex-shrink-0 transition-colors text-muted-foreground" />
            <input
              type="text"
              placeholder="Search in mail"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground text-foreground focus:outline-none focus:ring-0"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
