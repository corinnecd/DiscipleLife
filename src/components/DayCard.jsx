
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, BookOpen, MessageSquare, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

export default function DayCard({ day, status, onToggleComplete, onSaveNotes, savedNotes }) {
  const [notes, setNotes] = React.useState(savedNotes || '');
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleSave = () => {
    onSaveNotes(day.id, notes);
  };

  return (
    <Card className={`border transition-all ${status === 'completed' ? 'bg-green-50/50 border-green-200' : status === 'locked' ? 'opacity-50 bg-slate-50' : 'bg-white hover:shadow-md'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <button 
            onClick={() => status !== 'locked' && onToggleComplete(day.id, status !== 'completed')}
            disabled={status === 'locked'}
            className={`mt-1 shrink-0 transition-colors ${status === 'locked' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {status === 'completed' ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <Circle className="h-6 w-6 text-slate-300" />
            )}
          </button>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className={`font-bold text-lg ${status === 'completed' ? 'text-green-800' : 'text-slate-900'}`}>
                  Jour {day.dayNumber}: {day.title}
                </h3>
                <p className="text-sm text-slate-500 mt-1">{day.verseReference}</p>
              </div>
            </div>
            
            {(status !== 'locked' || isExpanded) && (
              <div className="mt-4 space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 italic text-slate-700 text-sm">
                  "{day.verseText}"
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {day.content}
                </p>
                
                <div className="pt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-slate-400 hover:text-slate-600 p-0 h-auto text-xs flex items-center gap-1"
                  >
                    <MessageSquare size={12} />
                    {isExpanded ? 'Masquer mes notes' : 'Ajouter des notes personnelles'}
                  </Button>
                  
                  {isExpanded && (
                    <div className="mt-3 space-y-2">
                      <Textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ce que ce passage m'inspire..."
                        className="text-sm min-h-[100px]"
                      />
                      <Button size="sm" onClick={handleSave} className="gap-2">
                        <Save size={14} /> Enregistrer
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
