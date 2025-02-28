import { Header } from "@/components/Header";
import { StudentProfileForm } from "@/components/student/StudentProfileForm";
import { LessonRequests } from "@/components/student/LessonRequests";
import { FavoriteEducators } from "@/components/student/FavoriteEducators";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (user.user_metadata?.user_type !== 'student') {
      toast.error('Access denied. This page is only for students.');
      navigate('/');
      return;
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Student Dashboard</h1>
        <div className="grid grid-cols-1 gap-8">
          <FavoriteEducators />
          <LessonRequests />
          <StudentProfileForm />
        </div>
      </div>
    </>
  );
}
