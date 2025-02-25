
import { Button } from "@/components/ui/button";
import { Music, Palette, Utensils, Dog, Dumbbell, TreePine, Car, Target, Hammer, Waves } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

export const FeaturedCategories = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/listings?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <section className="py-12 bg-[#F1F1F1]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-4">Featured Categories</h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Explore our most popular learning categories and find the perfect educator for your interests
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map(category => (
            <div 
              key={category.name} 
              className="group p-6 bg-gray-50 rounded-xl hover:bg-primary hover:text-white transition-all duration-300 cursor-pointer"
              onClick={() => handleCategoryClick(category.name)}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <category.icon className="w-8 h-8 group-hover:text-white transition-colors" />
                <h3 className="font-semibold">{category.name}</h3>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-8">
          <Button 
            className="bg-primary hover:bg-primary/90 text-white gap-2"
            onClick={() => navigate('/listings')}
          >
            More Categories
          </Button>
        </div>
      </div>
    </section>
  );
};
