
import React from 'react';
import { Calendar, Book, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';

const WordMeditation = () => {
  const { toast } = useToast();

  const cycles = [
    {
      id: 1,
      title: "Cycle 1 : L'Identité en Christ",
      days: 21,
      completed: 5,
      description: "Découvrez qui vous êtes réellement aux yeux de Dieu.",
      color: "text-blue-400",
      progressColor: "bg-blue-500"
    },
    {
      id: 2,
      title: "Cycle 2 : La Puissance de la Prière",
      days: 21,
      completed: 0,
      description: "Apprenez à communiquer efficacement avec le Père.",
      color: "text-purple-400",
      progressColor: "bg-purple-500"
    },
    {
      id: 3,
      title: "Cycle 3 : Marcher par l'Esprit",
      days: 21,
      completed: 0,
      description: "Vivre une vie guidée quotidiennement par le Saint-Esprit.",
      color: "text-emerald-400",
      progressColor: "bg-emerald-500"
    }
  ];

  const handleStart = (cycleTitle) => {
    toast({
      title: "Cycle Démarré",
      description: `Vous avez ouvert : ${cycleTitle}`,
    });
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Méditation de la Parole</h1>
        <p className="text-gray-400">Cycles de 21 jours pour ancrer la Parole de Dieu dans votre cœur.</p>
      </div>

      <div className="grid gap-6">
        {cycles.map((cycle) => (
          <Card key={cycle.id} className="bg-[#1a0b2e] border-white/10 overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className={`text-xl font-bold ${cycle.color} mb-2`}>{cycle.title}</h3>
                    <p className="text-gray-300">{cycle.description}</p>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg">
                    <Calendar className="text-gray-400" size={24} />
                  </div>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Progression</span>
                    <span>{cycle.completed} / {cycle.days} jours</span>
                  </div>
                  <Progress value={(cycle.completed / cycle.days) * 100} className="h-2 bg-gray-700" indicatorClassName={cycle.progressColor} />
                </div>

                <Button 
                  onClick={() => handleStart(cycle.title)}
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/10"
                >
                  {cycle.completed > 0 ? "Continuer" : "Commencer le cycle"} <ChevronRight size={16} className="ml-2" />
                </Button>
              </div>
              
              {/* Preview Days Grid - Decorative mostly */}
              <div className="bg-black/20 p-6 w-full md:w-64 border-l border-white/5">
                <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <Book size={14} /> Aperçu des jours
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`
                        aspect-square rounded flex items-center justify-center text-xs font-medium border
                        ${i < cycle.completed 
                          ? `bg-${cycle.color.split('-')[1]}-500/20 border-${cycle.color.split('-')[1]}-500/50 text-${cycle.color.split('-')[1]}-400` 
                          : 'bg-white/5 border-white/10 text-gray-500'}
                      `}
                    >
                      {i + 1}
                    </div>
                  ))}
                  <div className="aspect-square flex items-center justify-center text-xs text-gray-600">...</div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WordMeditation;
