import React from 'react';
import Header from '@/components/layout/Header';
import TestingDashboard from '@/components/qa/TestingDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bug, TestTube, Clock } from 'lucide-react';

const QAPage = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
              <TestTube className="w-8 h-8 text-primary" />
              BillSnap QA Dashboard
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Dashboard per tracciare i test di qualità del funnel completo: Upload → OCR → Parsing → Output → CTA
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-primary flex items-center gap-2">
                  <TestTube className="w-4 h-4" />
                  Target Test
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">10</div>
                <div className="text-sm text-muted-foreground">File da testare</div>
              </CardContent>
            </Card>

            <Card className="border-warning">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-warning flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Soglia Tempo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">30s</div>
                <div className="text-sm text-muted-foreground">Tempo massimo target</div>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-destructive flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Stop Rule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <div className="text-sm text-muted-foreground">Bug P0 per fermare</div>
              </CardContent>
            </Card>
          </div>

          {/* Testing Dashboard */}
          <TestingDashboard />
        </div>
      </div>
    </div>
  );
};

export default QAPage;