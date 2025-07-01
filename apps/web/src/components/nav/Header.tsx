"use client";

import React, { useState } from "react";
import { Search, Bell, Settings, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch?.(searchQuery);
    }
  };

  const getUserInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="flex items-center justify-between py-4 px-6 bg-background">
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          <h1 className="text-xl font-bold text-primary tracking-tight">
            BlueBeever
          </h1>
        </div>

        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyPress={handleKeyPress}
            className="pl-10 pr-4 w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {notificationCount > 99 ? "99+" : notificationCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notificationCount === 0 ? (
              <div className="p-4 text-center text-foreground">
                No new notifications
              </div>
            ) : (
              <>
                <DropdownMenuItem className="flex flex-col items-start p-4">
                  <div className="font-medium">New message received</div>
                  <div className="text-sm text-foreground">
                    2 minutes ago
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start p-4">
                  <div className="font-medium">Task completed</div>
                  <div className="text-sm text-foreground">
                    1 hour ago
                  </div>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuItem>Account Settings</DropdownMenuItem>
            <DropdownMenuItem>Theme</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Help & Support</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={userImage} alt={userName} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getUserInitials(userName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-foreground">
                  {userEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Team</DropdownMenuItem>
            <DropdownMenuItem>Subscription</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
