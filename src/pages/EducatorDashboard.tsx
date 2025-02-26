import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { Header } from "@/components/Header";
import { AuthButtonClient } from "@/components/auth-button-client";
import { AccountForm } from "@/components/account-form";
import { EducatorProfile } from "@/components/educator/EducatorProfile";

export default function EducatorDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabaseClient = useSupabaseClient();
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.push("/");
    }
  }, [session, router]);

  const user = session?.user;

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-6 px-4 space-y-8">
        <div className="flex justify-end">
          <AuthButtonClient />
        </div>
        <AccountForm
          session={session}
          supabaseClient={supabaseClient}
          setIsModalOpen={setIsModalOpen}
        />
        <EducatorProfile user={user} />
      </main>
    </div>
  );
}
