import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

interface EducatorProfile {
  id: string;
  name: string;
  email: string;
  is_featured: boolean;
  categories: string[];
}

export function FeaturedEducatorsManager() {
  const [educators, setEducators] = useState<EducatorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEducators();
  }, []);

  const fetchEducators = async () => {
    try {
      const { data, error } = await supabase
        .from('educator_profiles')
        .select('id, name, email, is_featured, categories')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setEducators(data || []);
    } catch (error) {
      console.error('Error fetching educators:', error);
      toast.error('Failed to load educators');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeaturedStatus = async (educatorId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('educator_profiles')
        .update({ is_featured: !currentStatus })
        .eq('id', educatorId);

      if (error) throw error;

      setEducators(educators.map(educator =>
        educator.id === educatorId
          ? { ...educator, is_featured: !currentStatus }
          : educator
      ));

      toast.success(`Educator ${currentStatus ? 'removed from' : 'added to'} featured list`);
    } catch (error) {
      console.error('Error toggling featured status:', error);
      toast.error('Failed to update featured status');
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3].map((n) => (
        <div key={n} className="h-12 bg-gray-200 rounded"></div>
      ))}
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Featured Educators</h2>
        <p className="text-sm text-gray-500">
          {educators.filter(e => e.is_featured).length} educators featured
        </p>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead>Featured Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {educators.map((educator) => (
            <TableRow key={educator.id}>
              <TableCell className="font-medium">{educator.name}</TableCell>
              <TableCell>{educator.email}</TableCell>
              <TableCell>{educator.categories?.join(', ') || 'N/A'}</TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  educator.is_featured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {educator.is_featured ? 'Featured' : 'Not Featured'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-4">
                  <Switch
                    checked={educator.is_featured}
                    onCheckedChange={() => toggleFeaturedStatus(educator.id, educator.is_featured)}
                  />
                  <span className="text-sm text-gray-500">
                    {educator.is_featured ? 'Remove from Featured' : 'Add to Featured'}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
