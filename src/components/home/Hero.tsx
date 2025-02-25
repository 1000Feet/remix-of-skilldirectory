
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface HeroProps {
  onSearch?: (query: string) => void;
  onReset?: () => void;
  hasSearchResults?: boolean;
  searchQuery?: string;
}

export function Hero({ onSearch, onReset, hasSearchResults, searchQuery }: HeroProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchQuery = formData.get('search') as string;
    onSearch?.(searchQuery);
  };

  return (
    <section className="relative overflow-hidden bg-primary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 md:py-[40px] lg:px-[16px]">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Find Educators Near You
          </h1>
          <p className="mt-6 text-lg leading-8 text-white">
            Discover local instructors and learn new skills in your area
          </p>
          <form onSubmit={handleSubmit} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="relative w-full max-w-xs">
              <Input 
                type="text" 
                name="search"
                value={searchQuery}
                onChange={(e) => onSearch?.(e.target.value)}
                placeholder="Search skills or educators..." 
                className="w-full" 
              />
              {hasSearchResults && (
                <button
                  type="button"
                  onClick={onReset}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              )}
            </div>
            <Button type="submit" className="bg-white text-primary hover:bg-white/90">
              Find Skills
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
