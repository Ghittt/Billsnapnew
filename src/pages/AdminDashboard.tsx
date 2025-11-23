import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, FileText, TrendingUp, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  email: string;
  created_at: string;
  notifications_opt_in: boolean;
}

interface Bill {
  id: string;
  email: string;
  provider: string;
  price: number;
  kwh: number;
  m3: number;
  predicted_savings: number;
  created_at: string;
}

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'savings'>('date');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
    fetchData();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: 'Accesso negato',
        description: 'Devi effettuare il login come admin',
        variant: 'destructive'
      });
      navigate('/');
      return;
    }

    const { data: isAdmin } = await supabase.rpc('is_admin', { 
      check_user_id: user.id 
    });

    if (!isAdmin) {
      toast({
        title: 'Accesso negato',
        description: 'Non hai i permessi per accedere a questa pagina',
        variant: 'destructive'
      });
      navigate('/');
    }
  };

  const fetchData = async () => {
    try {
      const [usersData, billsData] = await Promise.all([
        supabase.from('billsnap_users').select('*').order('created_at', { ascending: false }),
        supabase.from('billsnap_bills').select('*').order('created_at', { ascending: false })
      ]);

      if (usersData.data) setUsers(usersData.data);
      if (billsData.data) setBills(billsData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i dati',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills
    .filter(bill => 
      (searchEmail === '' || bill.email?.toLowerCase().includes(searchEmail.toLowerCase())) &&
      (filterProvider === 'all' || bill.provider === filterProvider)
    )
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return (b.predicted_savings || 0) - (a.predicted_savings || 0);
    });

  const uniqueProviders = [...new Set(bills.map(b => b.provider).filter(Boolean))];
  
  const stats = {
    totalUsers: users.length,
    totalBills: bills.length,
    optInUsers: users.filter(u => u.notifications_opt_in).length,
    avgSavings: bills.reduce((acc, b) => acc + (b.predicted_savings || 0), 0) / bills.length || 0
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Admin</h1>
            <p className="text-muted-foreground">Gestione utenti e bollette BillSnap</p>
          </div>
          <Button onClick={fetchData} variant="outline">
            Aggiorna dati
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Utenti Totali</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{stats.totalUsers}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bollette Analizzate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{stats.totalBills}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Opt-in Notifiche</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{stats.optInUsers}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Risparmio Medio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">€{stats.avgSavings.toFixed(0)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Utenti Registrati</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Data Registrazione</TableHead>
                  <TableHead>Notifiche</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString('it-IT')}</TableCell>
                    <TableCell>
                      <Badge variant={user.notifications_opt_in ? 'default' : 'secondary'}>
                        {user.notifications_opt_in ? 'Attive' : 'Disattivate'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Bills Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bollette Analizzate</CardTitle>
            <div className="flex gap-4 mt-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterProvider} onValueChange={setFilterProvider}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Fornitore" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i fornitori</SelectItem>
                  {uniqueProviders.map(provider => (
                    <SelectItem key={provider} value={provider || 'unknown'}>
                      {provider || 'Sconosciuto'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'savings')}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Ordina per data</SelectItem>
                  <SelectItem value="savings">Ordina per risparmio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Fornitore</TableHead>
                  <TableHead>Prezzo</TableHead>
                  <TableHead>kWh</TableHead>
                  <TableHead>m³</TableHead>
                  <TableHead>Risparmio</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.email || 'Anonimo'}</TableCell>
                    <TableCell>{bill.provider || '-'}</TableCell>
                    <TableCell>€{bill.price?.toFixed(3) || '-'}</TableCell>
                    <TableCell>{bill.kwh || '-'}</TableCell>
                    <TableCell>{bill.m3 || '-'}</TableCell>
                    <TableCell>
                      {bill.predicted_savings ? (
                        <Badge variant="default">€{bill.predicted_savings.toFixed(0)}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{new Date(bill.created_at).toLocaleDateString('it-IT')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
