import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-[#333333] text-white mt-auto">
      <div className="container mx-auto py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <img 
            src="/lovable-uploads/b71f5020-bb1c-464a-8ba8-60e008e8c40a.png" 
            alt="Skill Directory" 
            className="h-8"
          />
          <nav className="flex flex-wrap gap-6 text-sm items-center">
            <a href="#" className="hover:text-primary-foreground/90">ABOUT</a>
            <a href="#" className="hover:text-primary-foreground/90">PRICING</a>
            <a href="#" className="hover:text-primary-foreground/90">PRIVACY POLICY</a>
            <a href="#" className="hover:text-primary-foreground/90">TERMS & CONDITIONS</a>
            <a href="#" className="hover:text-primary-foreground/90">SUPPORT</a>
            <Link 
              to="/auth?signup=educator" 
              className="bg-[#88C440] text-white px-4 py-2 rounded-md hover:bg-[#78b32d] transition-colors font-medium"
            >
              SKILL PROVIDER? SIGN UP HERE
            </Link>
          </nav>
        </div>
        <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-700 text-sm text-gray-400">
          <div>
            Copyright 2025 <span className="text-[#88C440]">SKILLDIRECTORY.COM</span>. All Rights Reserved.
          </div>
          <div>
            Website by <a href="#" className="text-[#88C440]">1000FEET</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
