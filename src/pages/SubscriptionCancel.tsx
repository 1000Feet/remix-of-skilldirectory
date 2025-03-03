
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

const SubscriptionCancel = () => {
  const navigate = useNavigate();

  const goToPlans = () => {
    navigate('/subscription/plans');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-gray-50 py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="flex flex-col items-center justify-center py-8">
              <XCircle className="w-20 h-20 text-red-500 mb-6" />
              <h1 className="text-3xl font-bold mb-4">Subscription Cancelled</h1>
              <p className="text-xl text-gray-700 mb-6">
                Your subscription process was cancelled. 
                You can try again or select a different plan.
              </p>
              <Button size="lg" onClick={goToPlans} className="text-lg px-8 py-6">
                Return to Plans
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SubscriptionCancel;
