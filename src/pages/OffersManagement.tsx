import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, Leaf } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface Offer {
  id: string;
  provider: string;
  plan_name: string;
  commodity: string;
  price_kwh: number;
  fixed_fee_eur_mo: number;
  pricing_type: string;
  valid_from: string;
  valid_to: string | null;
  redirect_url: string | null;
  terms_url: string | null;
  is_active: boolean;
  is_green: boolean;
  source: string;
  notes: string | null;
  tariff_type?: string;
  price_f1?: number;
  price_f2?: number;
  price_f3?: number;
  price_f23?: number;
  power_fee_year?: number;
}

const OffersManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    provider: '',
    plan_name: '',
    commodity: 'power',
    price_kwh: '',
    fixed_fee_eur_mo: '',
    pricing_type: 'fixed',
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: '',
    redirect_url: '',
    terms_url: '',
    is_active: true,
    is_green: false,
    notes: ''
  });

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.rpc('is_admin', { 
        check_user_id: user.id 
      });

      if (error || !data) {
        toast({
          title: "Accesso negato",
          description: "Non hai i permessi per accedere a questa pagina",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      fetchOffers();
    };

    checkAdminStatus();
  }, [user, navigate]);

  const fetchOffers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le offerte",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const offerData = {
        ...formData,
        price_kwh: parseFloat(formData.price_kwh),
        fixed_fee_eur_mo: parseFloat(formData.fixed_fee_eur_mo),
        valid_to: formData.valid_to || null,
        redirect_url: formData.redirect_url || null,
        terms_url: formData.terms_url || null,
        notes: formData.notes || null
      };

      if (editingOffer) {
        const { error } = await supabase
          .from('offers')
          .update(offerData)
          .eq('id', editingOffer.id);

        if (error) throw error;
        toast({ title: "Offerta aggiornata con successo" });
      } else {
        const { error } = await supabase
          .from('offers')
          .insert([offerData]);

        if (error) throw error;
        toast({ title: "Offerta creata con successo" });
      }

      setIsDialogOpen(false);
      setEditingOffer(null);
      resetForm();
      fetchOffers();
    } catch (error) {
      console.error('Error saving offer:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare l'offerta",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      provider: offer.provider,
      plan_name: offer.plan_name,
      commodity: offer.commodity,
      price_kwh: offer.price_kwh.toString(),
      fixed_fee_eur_mo: offer.fixed_fee_eur_mo.toString(),
      pricing_type: offer.pricing_type,
      valid_from: offer.valid_from,
      valid_to: offer.valid_to || '',
      redirect_url: offer.redirect_url || '',
      terms_url: offer.terms_url || '',
      is_active: offer.is_active,
      is_green: offer.is_green,
      notes: offer.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa offerta?')) return;

    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Offerta eliminata con successo" });
      fetchOffers();
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'offerta",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      provider: '',
      plan_name: '',
      commodity: 'power',
      price_kwh: '',
      fixed_fee_eur_mo: '',
      pricing_type: 'fixed',
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: '',
      redirect_url: '',
      terms_url: '',
      is_active: true,
      is_green: false,
      notes: ''
    });
  };

  const fmt = (n: number) => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(n);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Gestione Offerte</h1>
              <p className="text-muted-foreground mt-1">
                Crea e gestisci le offerte energetiche disponibili
              </p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingOffer(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuova Offerta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingOffer ? 'Modifica Offerta' : 'Nuova Offerta'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="provider">Provider *</Label>
                      <Input
                        id="provider"
                        value={formData.provider}
                        onChange={(e) => setFormData({...formData, provider: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="plan_name">Nome Piano *</Label>
                      <Input
                        id="plan_name"
                        value={formData.plan_name}
                        onChange={(e) => setFormData({...formData, plan_name: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="commodity">Commodity *</Label>
                      <Select value={formData.commodity} onValueChange={(v) => setFormData({...formData, commodity: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="power">Luce</SelectItem>
                          <SelectItem value="gas">Gas</SelectItem>
                          <SelectItem value="dual">Dual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pricing_type">Tipo Prezzo *</Label>
                      <Select value={formData.pricing_type} onValueChange={(v) => setFormData({...formData, pricing_type: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fisso</SelectItem>
                          <SelectItem value="indexed">Indicizzato</SelectItem>
                          <SelectItem value="promo">Promo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price_kwh">€/kWh *</Label>
                      <Input
                        id="price_kwh"
                        type="number"
                        step="0.0001"
                        value={formData.price_kwh}
                        onChange={(e) => setFormData({...formData, price_kwh: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fixed_fee_eur_mo">Quota Fissa €/mese *</Label>
                      <Input
                        id="fixed_fee_eur_mo"
                        type="number"
                        step="0.01"
                        value={formData.fixed_fee_eur_mo}
                        onChange={(e) => setFormData({...formData, fixed_fee_eur_mo: e.target.value})}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="valid_from">Valida da *</Label>
                      <Input
                        id="valid_from"
                        type="date"
                        value={formData.valid_from}
                        onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="valid_to">Valida fino a</Label>
                      <Input
                        id="valid_to"
                        type="date"
                        value={formData.valid_to}
                        onChange={(e) => setFormData({...formData, valid_to: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="redirect_url">URL Offerta</Label>
                      <Input
                        id="redirect_url"
                        type="url"
                        value={formData.redirect_url}
                        onChange={(e) => setFormData({...formData, redirect_url: e.target.value})}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="terms_url">URL Condizioni</Label>
                    <Input
                      id="terms_url"
                      type="url"
                      value={formData.terms_url}
                      onChange={(e) => setFormData({...formData, terms_url: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Note</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                      />
                      <Label htmlFor="is_active">Attiva</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id="is_green"
                        checked={formData.is_green}
                        onCheckedChange={(checked) => setFormData({...formData, is_green: checked})}
                      />
                      <Label htmlFor="is_green">Energia Verde</Label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annulla
                    </Button>
                    <Button type="submit">
                      {editingOffer ? 'Aggiorna' : 'Crea'} Offerta
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Offerte ({offers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : offers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nessuna offerta disponibile
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Piano</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">€/kWh</TableHead>
                        <TableHead className="text-right">Quota/mese</TableHead>
                        <TableHead>Validità</TableHead>
                        <TableHead className="text-center">Verde</TableHead>
                        <TableHead className="text-center">Stato</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offers.map((offer) => (
                        <TableRow key={offer.id}>
                          <TableCell className="font-medium">{offer.provider}</TableCell>
                          <TableCell>{offer.plan_name}</TableCell>
                          <TableCell className="capitalize">{offer.pricing_type}</TableCell>
                          <TableCell className="text-right font-mono">
                            {offer.price_kwh.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right">{fmt(offer.fixed_fee_eur_mo)}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(offer.valid_from).toLocaleDateString('it-IT')}
                            {offer.valid_to && ` - ${new Date(offer.valid_to).toLocaleDateString('it-IT')}`}
                          </TableCell>
                          <TableCell className="text-center">
                            {offer.is_green && <Leaf className="w-4 h-4 text-green-600 inline" />}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-xs px-2 py-1 rounded-full ${offer.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {offer.is_active ? 'Attiva' : 'Inattiva'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(offer)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(offer.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default OffersManagement;
