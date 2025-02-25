
import React from 'react';
import { Check } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CategorySelectionProps {
  categories: string[];
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
}

const availableCategories = [
  "Animals",
  "Arts & Crafts",
  "Food and Beverage",
  "Martial Arts",
  "Music and Performing Arts",
  "Outdoor Recreation",
  "Personal Fitness/ Sports",
  "Shooting Sports",
  "Trades",
  "Vehicle Operation",
  "Water Recreation"
];

export function CategorySelection({ selectedCategories, onChange }: CategorySelectionProps) {
  const toggleCategory = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    onChange(newCategories);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Categories</label>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {availableCategories.map((category) => (
          <Button
            key={category}
            type="button"
            variant="outline"
            className={cn(
              "justify-start gap-2",
              selectedCategories.includes(category) && "bg-primary/5 text-primary"
            )}
            onClick={() => toggleCategory(category)}
          >
            {selectedCategories.includes(category) && (
              <Check className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">{category}</span>
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        Select all categories that apply to your business
      </p>
    </div>
  );
}
