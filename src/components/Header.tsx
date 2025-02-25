
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Eye, LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createSlug } from '@/lib/utils';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleViewProfile = () => {
    if (user?.email) {
      const slug = createSlug(user.email.split('@')[0]);
      window.open(`/educator/${slug}`, '_blank');
    }
  };

  return (
    <header className="w-full border-b bg-white">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <a href="/" className="text-2xl font-bold">
          SkillDirectory
        </a>

        <nav className="flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem onClick={handleViewProfile}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Public Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate('/auth')} variant="default">
              Sign In
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
