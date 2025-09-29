import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Inserisci un indirizzo email valido'),
  password: z.string().min(6, 'La password deve contenere almeno 6 caratteri')
});

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === 'email') fieldErrors.email = err.message;
          if (err.path[0] === 'password') fieldErrors.password = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        console.error('Auth error:', error);
        
        // Display user-friendly error messages
        let errorMessage = 'Si è verificato un errore. Riprova.';
        
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Email o password non corretti.';
        } else if (error.message?.includes('User already registered')) {
          errorMessage = 'Un account con questa email esiste già. Prova ad accedere.';
          setIsLogin(true);
        } else if (error.message?.includes('Password should be at least')) {
          errorMessage = 'La password deve contenere almeno 6 caratteri.';
        } else if (error.message?.includes('Invalid email')) {
          errorMessage = 'Inserisci un indirizzo email valido.';
        }
        
        toast({
          title: isLogin ? "Errore di accesso" : "Errore di registrazione",
          description: errorMessage,
          variant: "destructive"
        });
      } else {
        if (!isLogin) {
          toast({
            title: "Registrazione completata",
            description: "Account creato con successo! Ora puoi caricare le tue bollette.",
          });
        }
        navigate('/');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore imprevisto. Riprova.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 mx-auto text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla home
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-primary">
            <Zap className="w-8 h-8" />
            <h1 className="text-2xl font-bold">BillSnap</h1>
          </div>
        </div>

        <Card className="border-primary/20">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">
              {isLogin ? 'Accedi al tuo account' : 'Crea un nuovo account'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isLogin 
                ? 'Inserisci le tue credenziali per accedere' 
                : 'Registrati per iniziare a risparmiare sulle bollette'
              }
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@esempio.com"
                  className={errors.email ? 'border-destructive' : ''}
                  required
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Almeno 6 caratteri"
                  className={errors.password ? 'border-destructive' : ''}
                  required
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11"
                disabled={loading}
              >
                {loading ? (
                  'Caricamento...'
                ) : (
                  isLogin ? 'Accedi' : 'Registrati'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? 'Non hai ancora un account?' : 'Hai già un account?'}
              </p>
              <Button
                variant="link"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                  setEmail('');
                  setPassword('');
                }}
                className="text-primary p-0 h-auto font-medium"
              >
                {isLogin ? 'Registrati qui' : 'Accedi qui'}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            I tuoi dati sono protetti e crittografati
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;