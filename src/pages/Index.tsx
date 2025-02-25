
import { useState } from "react";
import { BusinessCard } from "@/components/BusinessCard";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext } from "@/components/ui/pagination";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Stats } from "@/components/home/Stats";
import { FeaturedCategories } from "@/components/home/FeaturedCategories";
import { FeaturedEducators } from "@/components/home/FeaturedEducators";
import { TrustIndicators } from "@/components/home/TrustIndicators";
import { Music, Palette, Utensils, Dumbbell, TreePine, Car, Waves, Hammer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const businesses = [{
  id: 1,
  name: "The Princess Co.",
  description: "The Princess Co. is a professional children's entertainment company...",
  distance: "4,714.2",
  image: "/lovable-uploads/9845c1eb-dafb-4d19-8c8b-2014f389a748.png",
  educator_id: "0e4c4a2e-6431-4751-ac9b-b743c126766b",
  educator_profile_id: "0e4c4a2e-6431-4751-ac9b-b743c126766b"
}, {
  id: 2,
  name: "Hinnendael Studios",
  description: "Hinnendael Studios offers full music production, including audio re...",
  distance: "4,714.2",
  image: "/lovable-uploads/77ef91f8-c568-43b4-8b0b-472abea9b6f0.png",
  educator_id: "1e4c4a2e-6431-4751-ac9b-b743c126766b",
  educator_profile_id: "1e4c4a2e-6431-4751-ac9b-b743c126766b"
}, {
  id: 3,
  name: "Kayla Peeters Music Lessons",
  description: "As passionate educators and instructors, Kayla Peeters and her teac...",
  distance: "4,714.2",
  image: "/lovable-uploads/bb36ffc0-6b79-40df-af4c-b088ee7d30bb.png",
  educator_id: "2e4c4a2e-6431-4751-ac9b-b743c126766b",
  educator_profile_id: "2e4c4a2e-6431-4751-ac9b-b743c126766b"
}];

const categories = [{
  name: "Music and Performing Arts",
  icon: Music
}, {
  name: "Arts & Crafts",
  icon: Palette
}, {
  name: "Food and Beverage",
  icon: Utensils
}, {
  name: "Personal Fitness/ Sports",
  icon: Dumbbell
}, {
  name: "Outdoor Recreation",
  icon: TreePine
}, {
  name: "Vehicle Operation",
  icon: Car
}, {
  name: "Water Recreation",
  icon: Waves
}, {
  name: "Trades",
  icon: Hammer
}];

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filteredBusinesses, setFilteredBusinesses] = useState(businesses);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterBusinesses(query, selectedCategory);
  };

  const handleReset = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setFilteredBusinesses(businesses);
  };

  const filterBusinesses = (query: string, category: string | null) => {
    let filtered = [...businesses];

    if (query.trim()) {
      const searchLower = query.toLowerCase();
      filtered = filtered.filter(business => 
        business.name.toLowerCase().includes(searchLower)
      );
    }

    if (category) {
      filtered = filtered.filter(business => 
        business.name.includes(category)
      );
    }

    setFilteredBusinesses(filtered);
  };

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    filterBusinesses(searchQuery, category);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Hero 
        onSearch={handleSearch}
        onReset={handleReset}
        hasSearchResults={searchQuery.length > 0}
        searchQuery={searchQuery}
      />
      <HowItWorks />
      <FeaturedCategories />
      <FeaturedEducators />
      <Stats />
      <TrustIndicators />

      <main className="container mx-auto py-8 flex gap-8 flex-1">
        <Sidebar 
          categories={categories} 
          selectedCategory={selectedCategory} 
          onSelectCategory={handleCategorySelect}
        />

        <div className="flex-1 space-y-6">
          {filteredBusinesses.map(business => (
            <BusinessCard 
              key={business.id} 
              id={business.id} 
              name={business.name} 
              description={business.description} 
              distance={business.distance} 
              image={business.image}
              educator_id={business.educator_id}
              educator_profile_id={business.educator_profile_id}
            />
          ))}

          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationLink isActive>1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink>2</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink>3</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink>4</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
