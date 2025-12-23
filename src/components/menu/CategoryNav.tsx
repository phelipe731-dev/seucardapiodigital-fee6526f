import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface CategoryNavProps {
  categories: Category[];
  activeCategory: string | null;
  onCategoryClick: (categoryId: string) => void;
}

export function CategoryNav({ categories, activeCategory, onCategoryClick }: CategoryNavProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active category into view
  useEffect(() => {
    if (activeRef.current && navRef.current) {
      const nav = navRef.current;
      const active = activeRef.current;
      const navRect = nav.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      
      const scrollLeft = active.offsetLeft - navRect.width / 2 + activeRect.width / 2;
      nav.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeCategory]);

  if (categories.length === 0) return null;

  return (
    <div 
      ref={navRef}
      className="sticky top-0 z-30 bg-background border-b overflow-x-auto scrollbar-hide"
    >
      <div className="flex px-4 py-2 gap-1 min-w-max">
        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              ref={isActive ? activeRef : null}
              onClick={() => onCategoryClick(category.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium whitespace-nowrap rounded-full transition-all",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
