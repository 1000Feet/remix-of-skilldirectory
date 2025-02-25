
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Dispatch, SetStateAction } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Eye, GraduationCap, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: Dispatch<SetStateAction<string>>;
}

export const Header = ({ searchQuery, onSearchChange }: HeaderProps = {}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/auth', { replace: true });
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  // Check if user exists and has user_metadata
  const isEducator = user?.user_metadata?.user_type === 'educator';
  const isStudent = user?.user_metadata?.user_type === 'student';

  const handleViewProfile = async () => {
    if (!user || !isEducator) return;

    try {
      const { data: profile } = await supabase
        .from('educator_profiles')
        .select('id, name')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        const slug = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        window.open(`/educator/${slug}`, '_blank');
      }
    } catch (error) {
      console.error('Error fetching educator profile:', error);
      toast.error('Could not open profile');
    }
  };

  console.log('Current user in header:', user?.user_metadata);

  return (
    <header className="relative z-50">
      <div className="bg-[#333333] text-white">
        <div className="container mx-auto py-2 text-center text-sm italic">
          INVEST IN YOURSELF
        </div>
      </div>
      <div className="bg-[#F2FCE2] py-8">
        <div className="container mx-auto">
          <img 
            src="/lovable-uploads/0a56a419-7e3e-4266-a1e3-6fdd59c00442.png" 
            alt="Skill Directory" 
            className="h-20 mx-auto"
          />
        </div>
      </div>
      <nav className="bg-[#333333] border-t border-gray-700">
        <div className="container mx-auto">
          <div className="flex items-center justify-between py-4">
            <div className="flex gap-8 mx-auto">
              <Link to="/" className="text-white hover:text-gray-200">HOME</Link>
              <Link to="/listings" className="text-white hover:text-gray-200">LISTINGS</Link>
              <Link to="/about" className="text-white hover:text-gray-200">ABOUT</Link>
              <Link to="/pricing" className="text-white hover:text-gray-200">PRICING</Link>
              <Link to="/support" className="text-white hover:text-gray-200">SUPPORT</Link>
            </div>
            <div className="absolute right-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-2 text-white hover:text-gray-200">
                        {isEducator ? (
                          <GraduationCap className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                        {user.email}
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      {isEducator && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link to="/dashboard" className="w-full cursor-pointer flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" />
                              Educator Dashboard
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleViewProfile} className="cursor-pointer flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            View Public Profile
                          </DropdownMenuItem>
                        </>
                      )}
                      {isStudent && (
                        <DropdownMenuItem asChild>
                          <Link to="/student-dashboard" className="w-full cursor-pointer flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Student Dashboard
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={handleSignOut} className="cursor-pointer">
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Link to="/auth">
                  <Button className="bg-primary hover:bg-primary/90">
                    LOGIN / SIGN UP
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
