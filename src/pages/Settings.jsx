import React from 'react';
import { Globe, Lock, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto space-y-6 pt-4 pb-20">
      <h1 className="text-3xl font-bold text-white px-2">Paramètres</h1>
      
      <Card className="bg-[#1a0b2e] border-white/10">
        <CardContent className="p-0 divide-y divide-white/5">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                    <Globe className="text-gray-400" size={20} />
                    <div>
                        <p className="text-white font-medium">Langue</p>
                        <p className="text-xs text-gray-500">Français (Défaut)</p>
                    </div>
                </div>
                <ChevronRight className="text-gray-600" size={16} />
            </div>
            
            <div 
                onClick={() => navigate('/update-password')}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Lock className="text-gray-400" size={20} />
                    <div>
                        <p className="text-white font-medium">Sécurité</p>
                        <p className="text-xs text-gray-500">Changer mot de passe</p>
                    </div>
                </div>
                <ChevronRight className="text-gray-600" size={16} />
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;