import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestResult {
  id: string;
  fileName: string;
  format: string;
  ocr: 'OK' | 'KO' | 'PENDING';
  parsing: 'OK' | 'KO' | 'PENDING';
  output: 'OK' | 'KO' | 'PENDING';
  cta: 'OK' | 'KO' | 'PENDING';
  timeSeconds: number | null;
  notes: string;
  priority: 'P0' | 'P1' | 'P2' | '';
}

const initialTests: TestResult[] = [
  { id: 'T01', fileName: 'JPG nitida (dati completi)', format: 'JPG', ocr: 'PENDING', parsing: 'PENDING', output: 'PENDING', cta: 'PENDING', timeSeconds: null, notes: '', priority: '' },
  { id: 'T02', fileName: 'JPG leggermente sfocata', format: 'JPG', ocr: 'PENDING', parsing: 'PENDING', output: 'PENDING', cta: 'PENDING', timeSeconds: null, notes: '', priority: '' },
  { id: 'T03', fileName: 'PNG da scanner (bianco/nero)', format: 'PNG', ocr: 'PENDING', parsing: 'PENDING', output: 'PENDING', cta: 'PENDING', timeSeconds: null, notes: '', priority: '' },
  { id: 'T04', fileName: 'HEIC da iPhone (screenshot)', format: 'HEIC', ocr: 'PENDING', parsing: 'PENDING', output: 'PENDING', cta: 'PENDING', timeSeconds: null, notes: '', priority: '' },
  { id: 'T05', fileName: 'PDF 1 pagina (standard)', format: 'PDF', ocr: 'PENDING', parsing: 'PENDING', output: 'PENDING', cta: 'PENDING', timeSeconds: null, notes: '', priority: '' },
  { id: 'T06', fileName: 'PDF 2 pagine (dati in 2ª)', format: 'PDF', ocr: 'PENDING', parsing: 'PENDING', output: 'PENDING', cta: 'PENDING', timeSeconds: null, notes: '', priority: '' },
  { id: 'T07', fileName: 'JPG con ombre e angolazione', format: 'JPG', ocr: 'PENDING', parsing: 'PENDING', output: 'PENDING', cta: 'PENDING', timeSeconds: null, notes: '', priority: '' },
  { id: 'T08', fileName: 'PNG con font piccoli', format: 'PNG', ocr: 'PENDING', parsing: 'PENDING', output: 'PENDING', cta: 'PENDING', timeSeconds: null, notes: '', priority: '' },
  { id: 'T09', fileName: 'PDF con virgole (1.578,00 €)', format: 'PDF', ocr: 'PENDING', parsing: 'PENDING', output: 'PENDING', cta: 'PENDING', timeSeconds: null, notes: '', priority: '' },
  { id: 'T10', fileName: 'JPG con watermark/logo', format: 'JPG', ocr: 'PENDING', parsing: 'PENDING', output: 'PENDING', cta: 'PENDING', timeSeconds: null, notes: '', priority: '' },
];

const TestingDashboard = () => {
  const [tests, setTests] = useState<TestResult[]>(initialTests);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  const updateTest = (id: string, field: keyof TestResult, value: any) => {
    setTests(prev => prev.map(test => 
      test.id === id ? { ...test, [field]: value } : test
    ));
  };

  const StatusIcon = ({ status }: { status: 'OK' | 'KO' | 'PENDING' }) => {
    switch (status) {
      case 'OK': return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'KO': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'PENDING': return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const PriorityBadge = ({ priority }: { priority: string }) => {
    if (!priority) return null;
    const colors = {
      'P0': 'bg-destructive text-destructive-foreground',
      'P1': 'bg-warning text-warning-foreground',
      'P2': 'bg-muted text-muted-foreground'
    };
    return (
      <Badge className={colors[priority as keyof typeof colors] || ''}>
        {priority}
      </Badge>
    );
  };

  const successCount = tests.filter(t => 
    t.ocr === 'OK' && t.parsing === 'OK' && t.output === 'OK' && t.cta === 'OK'
  ).length;

  const totalTested = tests.filter(t => 
    t.ocr !== 'PENDING' || t.parsing !== 'PENDING' || t.output !== 'PENDING' || t.cta !== 'PENDING'
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{successCount}</div>
            <div className="text-sm text-muted-foreground">Successi completi</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{totalTested}</div>
            <div className="text-sm text-muted-foreground">File testati</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">
              {tests.filter(t => t.priority === 'P0').length}
            </div>
            <div className="text-sm text-muted-foreground">Bug P0</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">
              {tests.filter(t => t.timeSeconds && t.timeSeconds > 30).length}
            </div>
            <div className="text-sm text-muted-foreground">Timeout (&gt;30s)</div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Risultati Test QA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">File</th>
                  <th className="text-left p-2">Formato</th>
                  <th className="text-left p-2">OCR</th>
                  <th className="text-left p-2">Parsing</th>
                  <th className="text-left p-2">Output</th>
                  <th className="text-left p-2">CTA</th>
                  <th className="text-left p-2">Tempo</th>
                  <th className="text-left p-2">Priorità</th>
                  <th className="text-left p-2">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test) => (
                  <tr key={test.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-mono">{test.id}</td>
                    <td className="p-2 text-sm max-w-32 truncate">{test.fileName}</td>
                    <td className="p-2">
                      <Badge variant="outline">{test.format}</Badge>
                    </td>
                    <td className="p-2">
                      <StatusIcon status={test.ocr} />
                    </td>
                    <td className="p-2">
                      <StatusIcon status={test.parsing} />
                    </td>
                    <td className="p-2">
                      <StatusIcon status={test.output} />
                    </td>
                    <td className="p-2">
                      <StatusIcon status={test.cta} />
                    </td>
                    <td className="p-2 font-mono text-sm">
                      {test.timeSeconds ? `${test.timeSeconds}s` : '-'}
                    </td>
                    <td className="p-2">
                      <PriorityBadge priority={test.priority} />
                    </td>
                    <td className="p-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTest(test.id)}
                      >
                        Modifica
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Test Modal (Simple Form) */}
      {selectedTest && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Modifica Test {selectedTest}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const test = tests.find(t => t.id === selectedTest)!;
              return (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium">OCR</label>
                      <select
                        value={test.ocr}
                        onChange={(e) => updateTest(selectedTest, 'ocr', e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="OK">OK</option>
                        <option value="KO">KO</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Parsing</label>
                      <select
                        value={test.parsing}
                        onChange={(e) => updateTest(selectedTest, 'parsing', e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="OK">OK</option>
                        <option value="KO">KO</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Output</label>
                      <select
                        value={test.output}
                        onChange={(e) => updateTest(selectedTest, 'output', e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="OK">OK</option>
                        <option value="KO">KO</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">CTA</label>
                      <select
                        value={test.cta}
                        onChange={(e) => updateTest(selectedTest, 'cta', e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="OK">OK</option>
                        <option value="KO">KO</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Tempo (secondi)</label>
                      <input
                        type="number"
                        value={test.timeSeconds || ''}
                        onChange={(e) => updateTest(selectedTest, 'timeSeconds', parseInt(e.target.value) || null)}
                        className="w-full p-2 border rounded"
                        placeholder="30"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Priorità Bug</label>
                      <select
                        value={test.priority}
                        onChange={(e) => updateTest(selectedTest, 'priority', e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="">Nessuna</option>
                        <option value="P0">P0 - Bloccante</option>
                        <option value="P1">P1 - Importante</option>
                        <option value="P2">P2 - Minore</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Note/Bug</label>
                    <textarea
                      value={test.notes}
                      onChange={(e) => updateTest(selectedTest, 'notes', e.target.value)}
                      className="w-full p-2 border rounded h-24"
                      placeholder="Descrivi eventuali problemi, errori o comportamenti anomali..."
                    />
                  </div>
                  
                  <Button onClick={() => setSelectedTest(null)}>
                    Chiudi
                  </Button>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Istruzioni Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>1.</strong> Vai alla homepage e carica ogni file test seguendo l'ordine T01-T10</p>
          <p><strong>2.</strong> Per ogni file, cronometra il tempo totale (upload → risultati)</p>
          <p><strong>3.</strong> Aggiorna lo status di ogni step: OCR, Parsing, Output, CTA</p>
          <p><strong>4.</strong> Se un step fallisce, annota il bug e assegna priorità (P0/P1/P2)</p>
          <p><strong>5.</strong> P0 = Bloccante, P1 = Dati mancanti ma procede, P2 = Cosmetico</p>
          <p><strong>6.</strong> Se hai 3+ fallimenti P0, ferma i test e segnala i bug per il fix</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestingDashboard;