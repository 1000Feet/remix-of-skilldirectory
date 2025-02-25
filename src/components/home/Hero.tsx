
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeroProps {
  onSearch?: (query: string) => void;
}

export function Hero({ onSearch }: HeroProps) {
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
            <Input 
              type="text" 
              name="search"
              placeholder="Search skills or educators..." 
              className="max-w-xs" 
            />
            <Button type="submit" className="bg-white text-primary hover:bg-white/90">
              Find Skills
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
