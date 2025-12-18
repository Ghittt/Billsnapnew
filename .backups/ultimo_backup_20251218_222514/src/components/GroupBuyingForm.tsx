import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Mail, Phone, MapPin, Zap } from 'lucide-react';

export const GroupBuyingForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    city: '',
    province: '',
    annual_consumption_kwh: '',
    current_provider: '',
    interested_in: 'dual',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('group_buying_subscribers')
        .insert([{
          ...formData,
          annual_consumption_kwh: formData.annual_consumption_kwh ? parseInt(formData.annual_consumption_kwh) : null,
        }]);

      if (error) throw error;

      toast({
        title: "✅ Iscrizione completata!",
        description: "Ti contatteremo appena avremo novità sul gruppo di acquisto.",
      });

      setFormData({
        email: '',
        name: '',
        phone: '',
        city: '',
        province: '',
        annual_consumption_kwh: '',
        current_provider: '',
        interested_in: 'dual',
      });

    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: "❌ Errore",
        description: error.message.includes('duplicate') 
          ? "Questa email è già registrata!" 
          : "Si è verificato un errore. Riprova.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Gruppo di Acquisto</h2>
      </div>
      
      <p className="text-gray-600 mb-6">
        Unisciti al nostro gruppo di acquisto per ottenere tariffe ancora più vantaggiose! 
        Più siamo, più risparmiamo.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="tua@email.it"
            />
          </div>

          <div>
            <Label htmlFor="name">Nome e Cognome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Mario Rossi"
            />
          </div>

          <div>
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Telefono
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+39 123 456 7890"
            />
          </div>

          <div>
            <Label htmlFor="city" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Città
            </Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Roma"
            />
          </div>

          <div>
            <Label htmlFor="province">Provincia</Label>
            <Input
              id="province"
              maxLength={2}
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value.toUpperCase() })}
              placeholder="RM"
            />
          </div>

          <div>
            <Label htmlFor="consumption" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Consumo Annuo (kWh)
            </Label>
            <Input
              id="consumption"
              type="number"
              value={formData.annual_consumption_kwh}
              onChange={(e) => setFormData({ ...formData, annual_consumption_kwh: e.target.value })}
              placeholder="2500"
            />
          </div>

          <div>
            <Label htmlFor="provider">Fornitore Attuale</Label>
            <Input
              id="provider"
              value={formData.current_provider}
              onChange={(e) => setFormData({ ...formData, current_provider: e.target.value })}
              placeholder="Enel, Eni, ecc."
            />
          </div>

          <div>
            <Label htmlFor="interested">Interessato a</Label>
            <Select
              value={formData.interested_in}
              onValueChange={(value) => setFormData({ ...formData, interested_in: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="luce">Solo Luce</SelectItem>
                <SelectItem value="gas">Solo Gas</SelectItem>
                <SelectItem value="dual">Luce + Gas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Iscrizione in corso..." : "Iscriviti al Gruppo di Acquisto"}
        </Button>
      </form>
    </div>
  );
};
