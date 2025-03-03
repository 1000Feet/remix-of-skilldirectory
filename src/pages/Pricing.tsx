
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Basic: Get Listed",
    price: "FREE",
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
                  <Button
                    className="w-full text-lg py-6"
                    variant={plan.highlight ? "default" : "default"}
                  >
                    SIGN UP
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PricingPage;
