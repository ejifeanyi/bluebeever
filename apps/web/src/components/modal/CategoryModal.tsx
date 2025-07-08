import React, { useState } from "react";
import { X, Plus, Folder, Check, FolderOpen, Search } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: string) => void;
  currentCategory?: string;
  categories: string[];
  onCreateCategory: (category: string) => void;
}

interface CategoryModalState {
  newCategory: string;
  isCreating: boolean;
  searchTerm: string;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
  currentCategory,
  categories,
  onCreateCategory,
}: CategoryModalProps) => {
  const [newCategory, setNewCategory] =
    useState<CategoryModalState["newCategory"]>("");
  const [isCreating, setIsCreating] =
    useState<CategoryModalState["isCreating"]>(false);
  const [searchTerm, setSearchTerm] =
    useState<CategoryModalState["searchTerm"]>("");

  const filteredCategories = categories.filter((category) =>
    category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCategory = (): void => {
    if (newCategory.trim()) {
      onCreateCategory(newCategory.trim());
      setNewCategory("");
      setIsCreating(false);
    }
  };

  const handleSelectCategory = (category: string): void => {
    onSelectCategory(category);
    onClose();
  };

  const handleClose = (): void => {
    setSearchTerm("");
    setNewCategory("");
    setIsCreating(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-background border border-border shadow-2xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center justify-center gap-3 text-xl font-semibold text-card-foreground">
            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            Choose Category
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2 text-center leading-relaxed">
            Pick a category to move this email, or create your own if none
            match.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Search Bar */}
          {categories.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setSearchTerm(e.target.value)
                }
                className="pl-10 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground text-foreground"
              />
            </div>
          )}

          {/* Categories List with Scroll Area */}
          <div className="space-y-2">
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-2">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category: string) => (
                    <Button
                      key={category}
                      variant="ghost"
                      className={cn(
                        "w-full justify-between py-6 px-3 text-left rounded-md cursor-pointer",
                        currentCategory === category
                          ? "bg-primary/10 border-2 border-primary text-primary shadow-sm"
                          : "border-2 border-transparent hover:border-border/50"
                      )}
                      onClick={(): void => handleSelectCategory(category)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-lg transition-all duration-200",
                            currentCategory === category
                              ? "bg-primary/20 border border-primary/30"
                              : "bg-muted group-hover:bg-accent"
                          )}
                        >
                          <Folder
                            className={cn(
                              "h-4 w-4 transition-colors duration-200",
                              currentCategory === category
                                ? "text-primary"
                                : "text-muted-foreground group-hover:text-accent-foreground"
                            )}
                          />
                        </div>
                        <span className="font-medium text-sm text-accent-foreground">
                          {category}
                        </span>
                      </div>
                      {currentCategory === category && (
                        <div className="p-1.5 bg-primary rounded-full shadow-sm">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </Button>
                  ))
                ) : categories.length > 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No categories found</p>
                    <p className="text-sm">Try adjusting your search</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No categories yet</p>
                    <p className="text-sm">Create your first category below</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Create New Category Section */}
          <div className="border-t border-border pt-6">
            {!isCreating ? (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14 border-2 border-dashed cursor-pointer border-muted hover:border-primary hover:bg-accent/30 transition-all duration-200 hover:scale-[1.01] group"
                onClick={(): void => setIsCreating(true)}
              >
                <div className="p-2 bg-accent/50 rounded-lg group-hover:bg-primary/20 transition-all duration-200">
                  <Plus className="h-4 w-4 text-accent-foreground group-hover:text-primary" />
                </div>
                <span className="font-medium tracking-wide text-accent-foreground">
                  Create New Category
                </span>
              </Button>
            ) : (
              <div className="space-y-4 p-5 bg-muted/50 rounded-xl border border-border/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-1.5 bg-primary/20 rounded-lg">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-accent-foreground tracking-wide">
                    New Category
                  </span>
                </div>
                <Input
                  placeholder="Enter category name..."
                  value={newCategory}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setNewCategory(e.target.value)
                  }
                  onKeyDown={(
                    e: React.KeyboardEvent<HTMLInputElement>
                  ): void => {
                    if (e.key === "Enter") {
                      handleCreateCategory();
                    }
                    if (e.key === "Escape") {
                      setIsCreating(false);
                      setNewCategory("");
                    }
                  }}
                  className="h-12 text-base text-accent-foreground border-input focus:border-ring focus:ring-ring bg-background shadow-sm"
                  autoFocus
                />
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    onClick={handleCreateCategory}
                    disabled={!newCategory.trim()}
                    className="flex-1 h-11 bg-primary hover:bg-primary/90 text-accent-foreground font-medium shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                  >
                    Create Category
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(): void => {
                      setIsCreating(false);
                      setNewCategory("");
                    }}
                    className="flex-1 h-11 border-border hover:bg-accent/50 transition-all duration-200 text-accent-foreground cursor-pointer"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryModal;
