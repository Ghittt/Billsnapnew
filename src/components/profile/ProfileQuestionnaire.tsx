import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Home, Zap, Clock, Baby } from "lucide-react";

interface ProfileQuestionnaireProps {
  onComplete: () => void;
  userId?: string;
}

export const ProfileQuestionnaire = ({ onComplete, userId }: ProfileQuestionnaireProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [familySize, setFamilySize] = useState(1);
  const [hasChildren, setHasChildren] = useState(false);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [workFromHome, setWorkFromHome] = useState(false);
  const [homeType, setHomeType] = useState("");
  const [heatingType, setHeatingType] = useState("");
  const [appliances, setAppliances] = useState<string[]>([]);

  const appliancesList = [
    "Lavatrice",
    "Lavastoviglie",
    "Asciugatrice",
    "Forno elettrico",
    "Piano cottura a induzione",
    "Condizionatore",
    "Pompa di calore",
    "Scaldabagno elettrico",
    "Console videogiochi",
    "PC fisso"
  ];

  const handleApplianceToggle = (appliance: string) => {
    setAppliances(prev => 
      prev.includes(appliance) 
        ? prev.filter(a => a !== appliance)
        : [...prev, appliance]
    );
  };

  const handleChildAgeAdd = () => {
    setChildrenAges([...childrenAges, 0]);
  };

  const handleChildAgeChange = (index: number, age: string) => {
    const newAges = [...childrenAges];
    newAges[index] = parseInt(age) || 0;
    setChildrenAges(newAges);
  };

  const handleChildAgeRemove = (index: number) => {
    setChildrenAges(childrenAges.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const consumptionHabits = {
        peak_usage: workFromHome ? "alto_diurno" : "normale",
        evening_usage: hasChildren ? "alto" : "medio",
        weekend_usage: familySize > 2 ? "alto" : "medio"
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          family_size: familySize,
          has_children: hasChildren,
          children_ages: childrenAges,
          work_from_home: workFromHome,
          home_type: homeType,
          heating_type: heatingType,
          main_appliances: appliances,
          consumption_habits: consumptionHabits,
          profile_completed: true
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success("Profilo completato! Ora riceverai raccomandazioni personalizzate.");
      onComplete();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error("Errore nel salvataggio del profilo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Completa il tuo profilo</CardTitle>
        <CardDescription>
          Rispondi a queste domande per ricevere raccomandazioni AI personalizzate basate sul tuo stile di vita
        </CardDescription>
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 text-lg font-medium">
              <Users className="w-5 h-5 text-primary" />
              <span>La tua famiglia</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="familySize">Quante persone vivono in casa?</Label>
              <Input
                id="familySize"
                type="number"
                min="1"
                max="10"
                value={familySize}
                onChange={(e) => setFamilySize(parseInt(e.target.value) || 1)}
                className="w-32"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasChildren"
                  checked={hasChildren}
                  onCheckedChange={(checked) => {
                    setHasChildren(checked as boolean);
                    if (!checked) setChildrenAges([]);
                  }}
                />
                <Label htmlFor="hasChildren" className="cursor-pointer">
                  Ho figli
                </Label>
              </div>

              {hasChildren && (
                <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                  <div className="flex items-center gap-2">
                    <Baby className="w-4 h-4 text-primary" />
                    <Label>Età dei figli (aiuta a prevedere i consumi)</Label>
                  </div>
                  {childrenAges.map((age, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        type="number"
                        min="0"
                        max="99"
                        value={age}
                        onChange={(e) => handleChildAgeChange(index, e.target.value)}
                        placeholder="Età"
                        className="w-24"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChildAgeRemove(index)}
                      >
                        Rimuovi
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleChildAgeAdd}
                  >
                    + Aggiungi figlio
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 text-lg font-medium">
              <Home className="w-5 h-5 text-primary" />
              <span>La tua abitazione</span>
            </div>

            <div className="space-y-2">
              <Label>Tipo di abitazione</Label>
              <RadioGroup value={homeType} onValueChange={setHomeType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="appartamento" id="appartamento" />
                  <Label htmlFor="appartamento" className="cursor-pointer">Appartamento</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="casa" id="casa" />
                  <Label htmlFor="casa" className="cursor-pointer">Casa indipendente</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="villa" id="villa" />
                  <Label htmlFor="villa" className="cursor-pointer">Villa</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Tipo di riscaldamento</Label>
              <RadioGroup value={heatingType} onValueChange={setHeatingType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gas" id="gas" />
                  <Label htmlFor="gas" className="cursor-pointer">Gas metano</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="elettrico" id="elettrico" />
                  <Label htmlFor="elettrico" className="cursor-pointer">Riscaldamento elettrico</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pompa_calore" id="pompa_calore" />
                  <Label htmlFor="pompa_calore" className="cursor-pointer">Pompa di calore</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="workFromHome"
                checked={workFromHome}
                onCheckedChange={(checked) => setWorkFromHome(checked as boolean)}
              />
              <Label htmlFor="workFromHome" className="cursor-pointer flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Lavoro da casa (consumi diurni più alti)
              </Label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 text-lg font-medium">
              <Zap className="w-5 h-5 text-primary" />
              <span>Elettrodomestici principali</span>
            </div>

            <div className="space-y-2">
              <Label>Seleziona gli elettrodomestici che usi regolarmente</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {appliancesList.map((appliance) => (
                  <div key={appliance} className="flex items-center space-x-2">
                    <Checkbox
                      id={appliance}
                      checked={appliances.includes(appliance)}
                      onCheckedChange={() => handleApplianceToggle(appliance)}
                    />
                    <Label htmlFor={appliance} className="cursor-pointer">
                      {appliance}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Indietro
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} className="ml-auto">
              Avanti
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="ml-auto">
              {loading ? "Salvataggio..." : "Completa profilo"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
