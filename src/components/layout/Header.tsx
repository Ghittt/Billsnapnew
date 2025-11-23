import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center hover:opacity-80 transition-all">
          <span className="text-lg md:text-xl font-sf-pro font-bold text-primary tracking-wide">
            BillSnap
          </span>
        </Link>
        
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link 
            to="/terms-and-conditions#chi-siamo" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            <span className="hidden sm:inline">Chi siamo</span>
            <span className="sm:hidden">Chi</span>
          </Link>
          
          <Link 
            to="/offerta-collettiva" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            <span className="hidden sm:inline">Offerta Collettiva</span>
            <span className="sm:hidden">Gruppo</span>
          </Link>
          
          <Link 
            to="/feedback" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            Feedback
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;