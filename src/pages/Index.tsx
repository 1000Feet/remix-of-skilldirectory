import { useState, useEffect, useRef } from "react";
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
import { Music, Palette, Utensils, Dog, Dumbbell, TreePine, Car, Target, Hammer, Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDistance } from "@/hooks/useDistance";

const categories = [
  { name: "Animals", icon: Dog },
  { name: "Arts & Crafts", icon: Palette },
  { name: "Food and Beverage", icon: Utensils },
  { name: "Martial Arts", icon: Target },
  { name: "Music and Performing Arts", icon: Music },
  { name: "Outdoor Recreation", icon: TreePine },
  { name: "Personal Fitness/ Sports", icon: Dumbbell },
  { name: "Shooting Sports", icon: Target },
  { name: "Trades", icon: Hammer },
  { name: "Vehicle Operation", icon: Car },
  { name: "Water Recreation", icon: Waves },
];

interface EducatorProfile {
  id: string;
  name: string;
  description: string;
  image: string;
  categories: string[];
  address: string;
  distance?: {
    miles: number;
    kilometers: number;
  } | null;
  is_active: boolean;
}

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [educatorProfiles, setEducatorProfiles] = useState<EducatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const educatorListingsRef = useRef<HTMLDivElement>(null);
  const { 
    calculateDistanceFromStudent, 
    loading: distanceLoading, 
    isAuthenticated, 
    studentAddress,
    refetchAddress 
  } = useDistance();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        console.log('User signed in, refreshing data');
        refetchAddress();
        fetchEducatorProfiles();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    fetchEducatorProfiles();
  }, [selectedCategory, isAuthenticated]);

  const fetchEducatorProfiles = async (searchTerm?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('educator_profiles')
        .select('id, name, description, image, categories, address, is_active')
        .eq('is_active', true) 
        .not('image', 'is', null)
        .not('name', 'is', null)
        .not('name', 'eq', '');

      if (selectedCategory) {
        query = query.contains('categories', [selectedCategory]);
      }

      const termToSearch = searchTerm !== undefined ? searchTerm : searchQuery;
      if (termToSearch.trim()) {
        query = query.or(
          `name.ilike.%${termToSearch.trim()}%,` +
          `description.ilike.%${termToSearch.trim()}%,` +
          `categories.cs.{"${termToSearch.trim()}"}`
        );
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const profilesWithDistance = await Promise.all(
        (data || []).map(async (profile) => {
          let distance = null;
          if (isAuthenticated && profile.address) {
            distance = await calculateDistanceFromStudent(profile.address);
          }
          return {
            ...profile,
            distance: distance
          };
        })
      );

      setEducatorProfiles(profilesWithDistance);
    } catch (error) {
      console.error('Error fetching educator profiles:', error);
      toast.error('Error loading educator profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentAddress && educatorProfiles.length > 0) {
      console.log('Student address changed, recalculating distances');
      fetchEducatorProfiles();
    }
  }, [studentAddress]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    fetchEducatorProfiles(query);
    
    setTimeout(() => {
      if (educatorListingsRef.current) {
        educatorListingsRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  };

  const handleReset = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    fetchEducatorProfiles("");
  };

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    fetchEducatorProfiles();
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

        <div className="flex-1 space-y-6" ref={educatorListingsRef}>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : educatorProfiles.length === 0 ? (
            <div className="text-center py-8">No educator profiles found</div>
          ) : (
            <div className="space-y-6">
              {educatorProfiles.map((profile) => (
                <BusinessCard
                  key={profile.id}
                  name={profile.name}
                  description={profile.description}
                  image={profile.image}
                  distance={profile.distance 
                    ? `${profile.distance.miles} mi (${profile.distance.kilometers} km)`
                    : 'N/A'}
                  educator_profile_id={profile.id}
                />
              ))}
            </div>
          )}

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
