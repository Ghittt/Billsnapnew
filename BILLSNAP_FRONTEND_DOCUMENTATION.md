# 📘 BillSnap - Documentazione Frontend Completa Fase 1 MVP

**Versione:** 1.0  
**Data:** 2025  
**Stack:** React + TypeScript + Tailwind CSS + Vite  
**Design System:** Apple-inspired, Purple Gradient Brand Identity

---

## 📑 Indice

1. [Sistema Design](#sistema-design)
2. [Configurazione Tailwind](#configurazione-tailwind)
3. [Homepage Completa](#homepage-completa)
4. [Header Component](#header-component)
5. [Upload Zone Component](#upload-zone-component)
6. [Pagina Offerta Collettiva](#pagina-offerta-collettiva)
7. [Pagina Results con Badge SnapAI](#pagina-results)
8. [Utility Classes](#utility-classes)
9. [Responsive Design](#responsive-design)
10. [Componenti UI Riutilizzabili](#componenti-ui)

---

## 🎨 Sistema Design

### Palette Colori (HSL Format)

```css
/* src/index.css */

@layer base {
  :root {
    /* Apple-inspired Purple Gradient System */
    --background: 0 0% 100%;
    --foreground: 0 0% 9%;

    --card: 0 0% 100%;
    --card-foreground: 0 0% 9%;

    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 9%;

    /* Primary: Brand Purple Gradient (#B07AFF → #8B5BFF → #5A31FF) */
    --primary: 271 100% 68%;
    --primary-foreground: 0 0% 100%;
    --primary-glow: 271 100% 74%;
    --primary-deep: 255 100% 60%;

    /* Secondary: Soft Purple */
    --secondary: 270 60% 96%;
    --secondary-foreground: 271 81% 56%;

    --muted: 270 60% 96%;
    --muted-foreground: 0 0% 45%;

    --accent: 280 70% 92%;
    --accent-foreground: 271 81% 56%;

    /* Success: Clean green */
    --success: 142 76% 36%;
    --success-foreground: 0 0% 100%;

    /* Warning */
    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    --border: 270 30% 90%;
    --input: 270 30% 90%;
    --ring: 271 81% 56%;

    /* Purple Gradients - Brand Identity (200°) */
    --gradient-hero: linear-gradient(200deg, hsl(271 100% 74%) 0%, hsl(271 100% 68%) 50%, hsl(255 100% 60%) 100%);
    --gradient-subtle: linear-gradient(180deg, hsl(270 60% 98%) 0%, hsl(0 0% 100%) 100%);
    --gradient-glow: radial-gradient(circle at 50% 0%, hsl(271 100% 74% / 0.15) 0%, transparent 50%);

    /* Elegant Shadows with Purple Tint */
    --shadow-xs: 0 1px 2px 0 hsla(271 81% 56% / 0.04);
    --shadow-sm: 0 1px 3px 0 hsla(271 81% 56% / 0.08), 0 1px 2px -1px hsla(271 81% 56% / 0.08);
    --shadow-md: 0 4px 6px -1px hsla(271 81% 56% / 0.1), 0 2px 4px -2px hsla(271 81% 56% / 0.1);
    --shadow-lg: 0 10px 15px -3px hsla(271 81% 56% / 0.12), 0 4px 6px -4px hsla(271 81% 56% / 0.12);
    --shadow-xl: 0 20px 25px -5px hsla(271 81% 56% / 0.15), 0 8px 10px -6px hsla(271 81% 56% / 0.15);
    --shadow-glow: 0 0 40px hsla(280 90% 70% / 0.3);

    /* Smooth Transitions */
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    --radius: 1rem;

    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  .dark {
    --background: 0 0% 6%;
    --foreground: 0 0% 98%;

    --card: 0 0% 9%;
    --card-foreground: 0 0% 98%;

    --popover: 0 0% 9%;
    --popover-foreground: 0 0% 98%;

    --primary: 271 100% 74%;
    --primary-foreground: 0 0% 100%;
    --primary-glow: 271 100% 80%;
    --primary-deep: 255 100% 65%;

    --secondary: 270 40% 15%;
    --secondary-foreground: 0 0% 98%;

    --muted: 270 30% 15%;
    --muted-foreground: 0 0% 60%;

    --accent: 270 50% 20%;
    --accent-foreground: 0 0% 98%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;

    --border: 270 30% 18%;
    --input: 270 30% 18%;
    --ring: 280 90% 70%;
    
    --gradient-hero: linear-gradient(200deg, hsl(271 100% 74%) 0%, hsl(271 100% 68%) 50%, hsl(255 100% 60%) 100%);
    --gradient-subtle: linear-gradient(180deg, hsl(270 40% 8%) 0%, hsl(0 0% 6%) 100%);
    --gradient-glow: radial-gradient(circle at 50% 0%, hsl(271 100% 74% / 0.2) 0%, transparent 50%);
    
    --sidebar-background: 0 0% 9%;
    --sidebar-foreground: 0 0% 98%;
    --sidebar-primary: 211 100% 50%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 0 0% 15%;
    --sidebar-accent-foreground: 0 0% 98%;
    --sidebar-border: 0 0% 18%;
    --sidebar-ring: 211 100% 50%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground font-inter antialiased;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

/* Utility classes */
@layer utilities {
  .glass {
    background: hsla(0 0% 100% / 0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid hsla(270 60% 96% / 0.5);
  }
  
  .gradient-hero {
    background: var(--gradient-hero);
  }
  
  .gradient-glow {
    background: var(--gradient-glow);
  }
  
  .text-gradient {
    background: var(--gradient-hero);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}
```

### Typography

```css
/* Font Family */
font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Import in index.html */
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
```

---

## ⚙️ Configurazione Tailwind

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        inter: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      backgroundImage: {
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-subtle': 'var(--gradient-subtle)',
        'gradient-glow': 'var(--gradient-glow)',
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        glow: "var(--shadow-glow)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      transitionTimingFunction: {
        DEFAULT: "var(--transition)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

---

## 🏠 Homepage Completa

```tsx
// src/pages/Index.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import UploadZone from '@/components/upload/UploadZone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, TrendingDown, Lock, Zap, Award, ArrowRight, Users } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleFileUpload = (files: File[]) => {
    navigate('/upload', { state: { files } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* ============================================
          1. HERO SECTION
          ============================================ */}
      <section className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 gradient-glow" />
        
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            
            {/* Badge SnapAI */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Powered by SnapAi™</span>
            </div>
            
            {/* Hero Title */}
            <h1 className="text-6xl md:text-8xl font-bold leading-tight tracking-tight">
              <span className="text-gradient">Risparmia</span>
              <br />
              <span className="text-foreground">sulle tue bollette</span>
            </h1>
            
            {/* Hero Description */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Carica la tua bolletta. SnapAi™ trova automaticamente l'offerta perfetta per te. 
              <span className="text-foreground font-semibold"> Zero stress, massimo risparmio.</span>
            </p>
            
            {/* Upload Zone */}
            <div className="max-w-2xl mx-auto pt-8">
              <UploadZone onFileUpload={handleFileUpload} />
              
              {/* Trust Indicators */}
              <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span>100% Sicuro</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Risultati in 25s</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  <span>50+ Fornitori</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          2. COLLECTIVE OFFER TEASER (Placeholder)
          ============================================ */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="border-primary/30 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-2xl font-bold">Offerta Collettiva BillSnap</h3>
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                        In arrivo
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Unisciti al gruppo: a 2.000 adesioni negoziamo l'offerta più bassa
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Più siamo, meno paghiamo. Stiamo costruendo la prima offerta di gruppo sull'energia.
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      ✓ Tariffa esclusiva • Zero vincoli • Info chiare
                    </p>
                    <Button 
                      variant="outline"
                      className="w-full sm:w-auto" 
                      size="lg"
                      onClick={() => navigate('/offerta-collettiva')}
                    >
                      Scopri di più
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ============================================
          3. STATS SECTION
          ============================================ */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              
              {/* Stat 1 - Risparmio Medio */}
              <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="text-6xl font-bold text-gradient mb-3">
                    €427
                  </div>
                  <p className="text-base text-muted-foreground">
                    Risparmio medio all'anno
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Dati aggiornati 2025
                  </p>
                </CardContent>
              </Card>
              
              {/* Stat 2 - Tempo Analisi */}
              <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="text-6xl font-bold text-gradient mb-3">
                    25s
                  </div>
                  <p className="text-base text-muted-foreground">
                    Tempo di analisi
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Velocità media AI
                  </p>
                </CardContent>
              </Card>
              
              {/* Stat 3 - Soddisfazione */}
              <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="text-6xl font-bold text-gradient mb-3">
                    98%
                  </div>
                  <p className="text-base text-muted-foreground">
                    Utenti soddisfatti
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Rating medio
                  </p>
                </CardContent>
              </Card>
              
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          4. HOW IT WORKS
          ============================================ */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            
            {/* Section Header */}
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-6xl font-bold mb-4">
                Semplice. <span className="text-gradient">Veloce.</span> Efficace.
              </h2>
              <p className="text-xl text-muted-foreground">
                Tre passi per iniziare a risparmiare
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12">
              
              {/* Step 1 - Carica */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
                <div className="relative text-center space-y-4 p-6">
                  <div className="w-16 h-16 gradient-hero rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <span className="text-3xl font-bold text-white">1</span>
                  </div>
                  <h3 className="text-2xl font-bold">Carica</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Scatta una foto alla tua bolletta o carica il PDF. Accettiamo qualsiasi formato.
                  </p>
                </div>
              </div>
              
              {/* Step 2 - Analizza */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
                <div className="relative text-center space-y-4 p-6">
                  <div className="w-16 h-16 gradient-hero rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <span className="text-3xl font-bold text-white">2</span>
                  </div>
                  <h3 className="text-2xl font-bold">Analizza</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    SnapAi™ confronta 50+ fornitori in tempo reale per trovare l'offerta perfetta.
                  </p>
                </div>
              </div>
              
              {/* Step 3 - Risparmia */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
                <div className="relative text-center space-y-4 p-6">
                  <div className="w-16 h-16 gradient-hero rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <span className="text-3xl font-bold text-white">3</span>
                  </div>
                  <h3 className="text-2xl font-bold">Risparmia</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Ricevi un report dettagliato con l'offerta migliore. Attivala in un click.
                  </p>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          5. CTA SECTION
          ============================================ */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-5" />
        <div className="relative container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="border-primary/20 shadow-xl bg-gradient-subtle backdrop-blur-sm">
              <CardContent className="p-12 text-center space-y-6">
                <div className="w-16 h-16 gradient-hero rounded-2xl flex items-center justify-center mx-auto shadow-glow">
                  <TrendingDown className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-4xl md:text-5xl font-bold">
                  Inizia a risparmiare <span className="text-gradient">oggi</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Unisciti a migliaia di italiani che hanno già ridotto le loro bollette.
                  Nessuna registrazione richiesta per iniziare.
                </p>
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 gradient-hero border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                >
                  Analizza la tua bolletta
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
    </div>
  );
};

export default Index;
```

---

## 🧭 Header Component

```tsx
// src/components/layout/Header.tsx
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, User, Bell } from 'lucide-react';
import { useState } from 'react';
import NotificationBell from '@/components/notifications/NotificationBell';

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-hero rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="font-bold text-xl">BillSnap</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/offerta-collettiva" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              Offerta Collettiva
            </Link>
            <Link to="/feedback" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              Feedback
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <NotificationBell />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/profile')}
                  className="rounded-full"
                >
                  <User className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate('/auth')}
                className="gradient-hero text-white border-0"
              >
                Accedi
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/40">
            <nav className="flex flex-col space-y-3">
              <Link 
                to="/" 
                className="text-sm font-medium text-foreground/80 hover:text-foreground py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/offerta-collettiva" 
                className="text-sm font-medium text-foreground/80 hover:text-foreground py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Offerta Collettiva
              </Link>
              <Link 
                to="/feedback" 
                className="text-sm font-medium text-foreground/80 hover:text-foreground py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Feedback
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
```

---

## 📤 Upload Zone Component

```tsx
// src/components/upload/UploadZone.tsx
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadZoneProps {
  onFileUpload: (files: File[]) => void;
}

const UploadZone = ({ onFileUpload }: UploadZoneProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative group cursor-pointer rounded-2xl border-2 border-dashed 
        transition-all duration-300 p-12
        ${isDragActive 
          ? 'border-primary bg-primary/5 shadow-glow' 
          : 'border-border hover:border-primary/50 hover:bg-primary/5'
        }
      `}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className={`
          w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
          ${isDragActive ? 'bg-primary/20 scale-110' : 'bg-primary/10 group-hover:bg-primary/20'}
        `}>
          <Upload className={`w-8 h-8 transition-colors ${isDragActive ? 'text-primary' : 'text-primary/70'}`} />
        </div>
        
        <div>
          <h3 className="text-xl font-semibold mb-2">
            {isDragActive ? 'Rilascia qui il file' : 'Carica la tua bolletta'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Trascina qui il file oppure clicca per selezionarlo
          </p>
          <p className="text-xs text-muted-foreground">
            Formati supportati: PDF, JPG, PNG (max 10MB)
          </p>
        </div>

        <Button 
          type="button"
          className="gradient-hero text-white border-0 mt-4"
          size="lg"
        >
          <FileText className="w-4 h-4 mr-2" />
          Scegli file
        </Button>
      </div>
    </div>
  );
};

export default UploadZone;
```

---

## 🤝 Pagina Offerta Collettiva (Placeholder Fase 1)

```tsx
// src/pages/CollectiveOffer.tsx
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Zap, CheckCircle2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CollectiveOffer() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        
        {/* ============================================
            HERO SECTION (Placeholder)
            ============================================ */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-medium">In arrivo presto</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
            Offerta Collettiva BillSnap
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Stiamo costruendo la prima offerta di gruppo sull'energia. Più siamo, meno paghiamo.
          </p>

          <Badge variant="outline" className="text-base px-6 py-2">
            🚀 Fase 2 - Coming Soon
          </Badge>
        </div>

        {/* ============================================
            FEATURE CARD
            ============================================ */}
        <Card className="mb-8 border-primary/20 shadow-lg">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Come funzionerà</h2>
            
            <div className="space-y-6">
              
              {/* Feature 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg mb-1">Unisciti al gruppo</p>
                  <p className="text-muted-foreground">
                    A 2.000 adesioni negoziamo l'offerta più bassa sul mercato
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg mb-1">Negoziazione diretta</p>
                  <p className="text-muted-foreground">
                    Trattiamo con i fornitori per ottenere condizioni esclusive
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg mb-1">Risparmio garantito</p>
                  <p className="text-muted-foreground">
                    Prezzi che non trovi sul mercato, zero vincoli
                  </p>
                </div>
              </div>
              
            </div>
          </CardContent>
        </Card>

        {/* ============================================
            BENEFITS GRID
            ============================================ */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 text-center text-lg">Vantaggi dell'offerta collettiva</h3>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              
              <div>
                <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">Tariffa esclusiva</p>
                <p className="text-sm text-muted-foreground">Solo per il gruppo</p>
              </div>
              
              <div>
                <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">Zero vincoli</p>
                <p className="text-sm text-muted-foreground">Libero di scegliere</p>
              </div>
              
              <div>
                <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">Info chiare</p>
                <p className="text-sm text-muted-foreground">Trasparenza totale</p>
              </div>
              
            </div>
          </CardContent>
        </Card>

        {/* ============================================
            CTA FINALE
            ============================================ */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-8 text-center">
            <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Resta sintonizzato</h3>
            <p className="text-muted-foreground mb-6">
              L'Offerta Collettiva sarà disponibile nella Fase 2. Nel frattempo, continua a usare BillSnap per trovare le migliori offerte energia.
            </p>
            <Button size="lg" onClick={() => navigate('/')}>
              Torna alla Home
            </Button>
          </CardContent>
        </Card>
        
      </main>
    </div>
  );
}
```

---

## 📊 Pagina Results con Badge SnapAI

```tsx
// src/pages/Results.tsx (estratto Badge SnapAI)
import { Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// All'interno del componente Results, aggiungi questo badge dove vuoi mostrare SnapAI:

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 cursor-help">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-primary">Powered by SnapAi™</span>
      </div>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="max-w-xs">
      <p className="text-sm">
        SnapAi™ è la nostra intelligenza proprietaria. Presto disponibile in versione completa.
      </p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## 🎨 Utility Classes

### Gradient Text

```html
<span className="text-gradient">Testo con gradient</span>
```

### Glass Effect

```html
<div className="glass p-6 rounded-lg">
  Contenuto con effetto vetro
</div>
```

### Gradient Backgrounds

```html
<!-- Hero Gradient -->
<div className="gradient-hero">...</div>

<!-- Subtle Gradient -->
<div className="bg-gradient-subtle">...</div>

<!-- Glow Effect -->
<div className="gradient-glow">...</div>
```

### Shadows

```html
<div className="shadow-glow">Elemento con glow</div>
<div className="shadow-lg">Elemento con shadow</div>
```

---

## 📱 Responsive Design

### Breakpoints Tailwind

```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1400px (custom in container)
```

### Esempi Common Patterns

```tsx
{/* Typography Responsive */}
<h1 className="text-4xl md:text-6xl lg:text-8xl">...</h1>

{/* Spacing Responsive */}
<section className="py-12 md:py-20 lg:py-32">...</section>

{/* Grid Responsive */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">...</div>

{/* Button Responsive */}
<Button className="w-full sm:w-auto">...</Button>

{/* Container Responsive */}
<div className="container mx-auto px-4 md:px-6 lg:px-8">...</div>
```

---

## 🧩 Componenti UI Riutilizzabili

### Button

```tsx
import { Button } from '@/components/ui/button';

// Variants
<Button variant="default">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>

// Con Gradient
<Button className="gradient-hero text-white border-0">
  Gradient Button
</Button>
```

### Card

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

<Card className="border-primary/10 shadow-lg">
  <CardHeader>
    <CardTitle>Titolo Card</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Contenuto della card</p>
  </CardContent>
</Card>
```

### Badge

```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="default">Default</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="secondary">Secondary</Badge>

// Custom Style
<Badge className="bg-yellow-500/10 border-yellow-500/20 text-yellow-700">
  In arrivo
</Badge>
```

---

## 🎯 Best Practices

### 1. Usa sempre semantic tokens
```tsx
// ❌ WRONG
<div className="text-white bg-purple-500">

// ✅ CORRECT
<div className="text-primary-foreground bg-primary">
```

### 2. Mobile-First Approach
```tsx
// Start con mobile, poi aggiungi breakpoints
<div className="text-base md:text-lg lg:text-xl">
```

### 3. Consistent Spacing
```tsx
// Usa la scala di Tailwind: 4, 6, 8, 12, 16, 20, 24, 32
<section className="py-12 md:py-20">
<div className="space-y-6">
```

### 4. Transition Smooth
```tsx
<div className="transition-all duration-300 hover:shadow-xl">
```

### 5. Accessibilità
```tsx
<button aria-label="Chiudi menu">
<img alt="Logo BillSnap" />
```

---

## 📦 Package Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.1",
    "lucide-react": "^0.462.0",
    "tailwindcss": "^3.4.0",
    "react-dropzone": "^14.3.8",
    "@radix-ui/react-*": "latest"
  }
}
```

---

## 🚀 Quick Start

### 1. Clone e Install
```bash
git clone <repo>
npm install
```

### 2. Run Dev
```bash
npm run dev
```

### 3. Build
```bash
npm run build
```

---

## 📝 Checklist Implementazione Fase 1

- [x] Design System completo (gradiente 200°)
- [x] Homepage con Hero Section
- [x] Upload Zone component
- [x] Collective Offer Teaser (placeholder)
- [x] Stats Section
- [x] How It Works Section
- [x] CTA Section
- [x] Header con navigazione
- [x] Pagina Offerta Collettiva (placeholder)
- [x] Badge SnapAI™ (placeholder)
- [x] Responsive mobile-first
- [x] Semantic color tokens
- [x] Shadows con purple tint
- [x] Hover animations
- [x] Typography Inter

---

## 🔮 Roadmap Fase 2

- [ ] Attivare Offerta Collettiva (backend + form)
- [ ] Implementare SnapAI proprietaria
- [ ] Sistema autenticazione completo
- [ ] Dashboard amministrativa
- [ ] Statistiche utilizzo
- [ ] Lead automation verso fornitori
- [ ] Notifiche push
- [ ] Gamification badges

---

## 📞 Support

Per domande o supporto:
- Email: support@billsnap.it
- Documentazione: [docs.billsnap.it](https://docs.billsnap.it)

---

**© 2025 BillSnap - Tutti i diritti riservati**
