
import { useState, useEffect } from "react";
import { BusinessCard } from "@/components/BusinessCard";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/home/Hero";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext
} from "@/components/ui/pagination";
import { useDistance } from "@/hooks/useDistance";
import { GeocodingTest } from "@/components/GeocodingTest";
import {
  Music,
  Palette,
  Utensils,
  Dog,
  Dumbbell,
  TreePine,
  Car,
  Target,
  Hammer,
  Waves
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  distance?: string;
  is_active: boolean;
}

const Listings = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [educatorProfiles, setEducatorProfiles] = useState<EducatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { calculateDistanceFromStudent, loading: distanceLoading, isAuthenticated } = useDistance();

  useEffect(() => {
    fetchEducatorProfiles();
  }, [selectedCategory]);

  const fetchEducatorProfiles = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('educator_profiles')
        .select('id, name, description, image, categories, address, is_active')
        .eq('is_active', true) // Only fetch active educators
        .not('image', 'is', null)
        .not('name', 'is', null)
        .not('name', 'eq', '');

      if (selectedCategory) {
        query = query.contains('categories', [selectedCategory]);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Only calculate distances if user is authenticated
      const profilesWithDistance = await Promise.all(
        (data || []).map(async (profile) => ({
          ...profile,
          distance: isAuthenticated ? await calculateDistanceFromStudent(profile.address) : null
        }))
      );

      setEducatorProfiles(profilesWithDistance);
    } catch (error) {
      console.error('Error fetching educator profiles:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Hero />
      <main className="container mx-auto py-8 flex gap-8">
        <Sidebar 
          categories={categories} 
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        <div className="flex-1">
          <GeocodingTest />
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
                  distance={profile.distance || 'N/A'}
                  educator_profile_id={profile.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Listings;
