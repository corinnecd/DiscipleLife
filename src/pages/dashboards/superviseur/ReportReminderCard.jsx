import React from 'react';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Alerte de rappel pour le rapport mensuel (affichée 5 jours avant la fin du mois).
 */
export function ReportReminderCard({ reportReminder, onGoToSendReport }) {
  if (!reportReminder?.showReminder) return null;

  const message =
    reportReminder.daysLeft === 0
      ? "⏰ Le mois se termine aujourd'hui ! N'oubliez pas d'envoyer votre rapport mensuel."
      : reportReminder.daysLeft === 1
      ? "⏰ Le mois se termine demain ! N'oubliez pas d'envoyer votre rapport mensuel."
      : `⏰ Le mois se termine dans ${reportReminder.daysLeft} jours ! N'oubliez pas d'envoyer votre rapport mensuel.`;

  return (
    <Card className="bg-blue-50 border-blue-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Rappel : Rapport mensuel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-900 font-medium">{message}</p>
            <p className="text-sm text-blue-700 mt-2">
              Vous pouvez envoyer votre rapport depuis la page "Envoyer un rapport".
            </p>
          </div>
          <Button
            onClick={onGoToSendReport}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Envoyer le rapport
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
