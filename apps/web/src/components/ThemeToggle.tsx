"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/useThemeStore";
import { Button } from "@/components/ui/button";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-full justify-start text-left font-normal text-accent-foreground"
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4 mr-3 text-accent-foreground" />
      ) : (
        <Sun className="h-4 w-4 mr-3 text-accent-foreground" />
      )}
      {theme === "light" ? "Dark mode" : "Light mode"}
    </Button>
  );
};

export default ThemeToggle;
