import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const signupParam = queryParams.get('signup');
  const fromPricing = queryParams.get('fromPricing');
  
  const [isLogin, setIsLogin] = useState(!signupParam);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'student' | 'educator'>(
    signupParam === 'educator' ? 'educator' : 'student'
  );
  const { signIn, signUp, user } = useAuth();

  // Redirect after successful educator signup to pricing page
  useEffect(() => {
    const redirectAfterSignup = async () => {
      const shouldRedirect = sessionStorage.getItem('redirect_to_pricing');
      if (shouldRedirect && user && user.user_metadata?.user_type === 'educator') {
        sessionStorage.removeItem('redirect_to_pricing');
        navigate('/pricing');
      }
    };
    
    redirectAfterSignup();
  }, [user, navigate]);

  // Redirect if user is already logged in
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        // For educator signups, we'll want to redirect to pricing
        if (userType === 'educator') {
          sessionStorage.setItem('redirect_to_pricing', 'true');
        }
        await signUp(email, password, userType);
        // Show toast to let user know signup was successful
        toast.success(`Account created successfully${userType === 'educator' ? '. Now choose a subscription plan.' : '.'}`);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2FCE2] flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">
            {isLogin ? 'Welcome Back!' : 'Create Your Account'}
          </h1>
          <p className="text-gray-600">
            {isLogin
              ? 'Sign in to access your account'
              : 'Join our community of learners and educators'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label>I am a:</Label>
              <RadioGroup
                value={userType}
                onValueChange={(value) => setUserType(value as 'student' | 'educator')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="student" id="student" />
                  <Label htmlFor="student">Student</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="educator" id="educator" />
                  <Label htmlFor="educator">Educator</Label>
                </div>
              </RadioGroup>
              {userType === 'educator' && (
                <p className="text-sm text-muted-foreground mt-2">
                  Educator accounts require a subscription plan. You'll be redirected to choose a plan after signup.
                </p>
              )}
            </div>
          )}

          <Button type="submit" className="w-full">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </Card>
    </div>
  );
}
