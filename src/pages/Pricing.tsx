
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { StripeCheckout } from "@/components/stripe/StripeCheckout";
import { supabase } from "@/integrations/supabase/client";

// Updated with the actual Stripe price IDs
const PRICE_IDS = {
  BASIC: "price_1Qxp1X2ef3wsxdNewIs5Ewzl", // Get Listed
  STANDARD: "price_1Qxp262ef3wsxdNeH5ShSDTi", // Get Seen
  PREMIUM: "price_1Qxp2c2ef3wsxdNeQ62MW8h8", // Get Results
};

const plans = [
  {
    name: "Basic: Get Listed",
    price: "FREE",
    priceId: PRICE_IDS.BASIC,
    features: [
      "Profile Picture",
      "Business Name",
      "Link to Website",
      "Search Visibility (Limited)",
      "Ads"
    ],
    highlight: false
  },
  {
    name: "Standard: Get Seen",
    price: "$30",
    priceId: PRICE_IDS.STANDARD,
    features: [
      "Includes everything in basic subscription",
      "Links to Social Media",
      "Email + Phone Number",
      "Videos Upload",
      "Custom AI Chatbot"
    ],
    highlight: true
  },
  {
    name: "Premium: Get Results",
    price: "$50",
    priceId: PRICE_IDS.PREMIUM,
    features: [
      "Includes everything in standard subscription",
      "Lesson Booking Module",
      "Custom AI Voice Agent",
      "Priority Placement in Search",
      "Featured on Homepage Carousel"
    ],
    highlight: false
  }
];

const Feature = ({ text }: { text: string }) => (
  <div className="flex items-center text-gray-600 text-base">
    <Check className="w-6 h-6 text-primary mr-2 flex-shrink-0" />
    {text}
  </div>
);

const PricingPage = () => {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'student' | 'educator' | null>(null);
  const [pendingSignup, setPendingSignup] = useState(false);
  
  useEffect(() => {
    // Check for pending signup from session storage
    const email = sessionStorage.getItem('pending_educator_email');
    const password = sessionStorage.getItem('pending_educator_password');
    
    if (email && password) {
      setPendingSignup(true);
    }
    
    // Get user type from metadata
    if (user) {
      setUserType(user.user_metadata?.user_type || null);
    }
    
    setLoading(false);
  }, [user]);

  const handlePlanSelection = async (plan: typeof plans[0]) => {
    if (plan.price !== "FREE") {
      // For paid plans, the StripeCheckout handles everything
      return;
    }
    
    // For the free plan
    setLoading(true);
    
    try {
      // For the free plan with pending educator signup
      if (pendingSignup) {
        const email = sessionStorage.getItem('pending_educator_email');
        const password = sessionStorage.getItem('pending_educator_password');
        
        if (!email || !password) {
          toast.error('Signup information is missing. Please try again.');
          navigate('/auth?signup=educator');
          return;
        }
        
        // Create the user directly since it's a free plan
        const { data, error } = await signUp(email, password, 'educator');
        
        if (error) {
          throw new Error(error.message);
        }
        
        // If signup was successful and we have user data
        if (data?.user?.id) {
          // Update educator profile with subscription info
          await supabase
            .from('educator_profiles')
            .update({
              subscription_tier: 'basic',
              subscription_status: 'active',
              subscription_renewed_at: new Date().toISOString()
            })
            .eq('user_id', data.user.id);
          
          // Clear stored credentials
          sessionStorage.removeItem('pending_educator_email');
          sessionStorage.removeItem('pending_educator_password');
          
          toast.success('Your free account has been created!');
          navigate('/educator-dashboard');
        }
      } else if (user) {
        // For existing users, just navigate to dashboard
        navigate('/educator-dashboard');
      } else {
        // For users who aren't signed in, redirect to auth page
        navigate('/auth?signup=educator');
      }
    } catch (error) {
      console.error('Error signing up:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutSuccess = () => {
    // After successful checkout
    if (pendingSignup) {
      // Clear the credentials (account creation is handled by webhook)
      sessionStorage.removeItem('pending_educator_email');
      sessionStorage.removeItem('pending_educator_password');
    }
    navigate('/educator-dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              Get Listed on <span className="text-primary">SKILL</span>DIRECTORY
              <span className="text-neutral-700"> – Pricing Plans for Businesses & Experts</span>
            </h1>
            <p className="text-xl text-gray-600">
              Choose the plan that works best for you and get listed on <span className="text-primary">SKILL</span>DIRECTORY.com!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className="overflow-hidden flex flex-col h-full">
                <div className={`p-6 text-center ${plan.highlight ? 'bg-primary' : 'bg-primary'}`}>
                  <h3 className="text-2xl font-semibold text-white">{plan.name}</h3>
                </div>
                <div className="p-6 text-center border-b h-24 flex flex-col justify-center">
                  <div className="text-4xl font-bold">{plan.price}</div>
                  {plan.price !== "FREE" && <div className="text-gray-500">/month</div>}
                </div>
                <div className="p-6 space-y-4 flex-1">
                  {plan.features.map((feature, featureIndex) => (
                    <Feature key={featureIndex} text={feature} />
                  ))}
                </div>
                <div className="p-6 mt-auto">
                  {plan.price === "FREE" ? (
                    <Button
                      className="w-full text-lg py-6"
                      variant={plan.highlight ? "default" : "default"}
                      onClick={() => handlePlanSelection(plan)}
                      disabled={loading}
                    >
                      {loading ? "PROCESSING..." : (pendingSignup ? "SIGN UP NOW" : (user ? "ACTIVATE" : "SIGN UP FREE"))}
                    </Button>
                  ) : (
                    <StripeCheckout
                      priceId={plan.priceId}
                      buttonText={pendingSignup ? "SIGN UP & SUBSCRIBE" : (user ? "SUBSCRIBE" : "SIGN UP & SUBSCRIBE")}
                      className="w-full text-lg py-6"
                      userType="educator"
                      onSuccess={handleCheckoutSuccess}
                    />
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default PricingPage;
