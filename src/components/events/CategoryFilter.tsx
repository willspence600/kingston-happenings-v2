'use client';

import type { Event, EventCategory } from '@/types/event';
import { categoryLabels, categoryColors, allCategories } from '@/constants/categories';

interface CategoryFilterProps {
  selected: EventCategory[];
  onChange: (categories: EventCategory[]) => void;
  showAll?: boolean;
  events?: Event[];
  showCounts?: boolean;
}

export default function CategoryFilter({ 
  selected, 
  onChange, 
  showAll = true, 
  events = [],
  showCounts = false 
}: CategoryFilterProps) {
  const toggleCategory = (category: EventCategory) => {
    if (selected.includes(category)) {
      onChange(selected.filter((c) => c !== category));
    } else {
      onChange([...selected, category]);
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  const getCategoryCount = (category: EventCategory) => {
    if (!showCounts || events.length === 0) return null;
    return events.filter(e => e.categories.includes(category)).length;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Categories</h3>
        {selected.length > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-primary hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {showAll && (
          <button
            onClick={clearAll}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selected.length === 0
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-border'
            }`}
          >
            All Events
            {showCounts && events.length > 0 && (
              <span className="ml-1.5 opacity-70">({events.length})</span>
            )}
          </button>
        )}
        {allCategories.map((category) => {
          const isSelected = selected.includes(category);
          const count = getCategoryCount(category);
          return (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isSelected
                  ? `${categoryColors[category]} text-white`
                  : 'bg-muted text-muted-foreground hover:bg-border'
              }`}
            >
              {categoryLabels[category]}
              {showCounts && count !== null && count > 0 && (
                <span className="ml-1.5 opacity-70">({count})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

