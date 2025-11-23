import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 h-16 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center hover:opacity-80 transition-all flex-shrink-0">
          <span className="text-[18px] md:text-[20px] font-sf-pro font-semibold text-primary tracking-wide">
            BillSnap
          </span>
        </Link>
        
        <nav className="flex items-center gap-2 sm:gap-3 md:gap-6 flex-shrink min-w-0">
          <Link 
            to="/terms-and-conditions#chi-siamo" 
            className="text-[13px] sm:text-[15px] md:text-[16px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            Chi
          </Link>
          
          <Link 
            to="/offerta-collettiva" 
            className="text-[13px] sm:text-[15px] md:text-[16px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            Gruppo
          </Link>
          
          <Link 
            to="/feedback" 
            className="text-[13px] sm:text-[15px] md:text-[16px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            Feedback
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;