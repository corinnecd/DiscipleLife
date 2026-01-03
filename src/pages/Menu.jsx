
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  User, 
  Globe, 
  Settings as SettingsIcon, 
  HelpCircle, 
  ChevronRight 
} from 'lucide-react';

const MenuItem = ({ icon: Icon, label, path, color }) => {
  const navigate = useNavigate();
  return (
    <div 
      onClick={() => navigate(path)}
      className="flex items-center justify-between p-4 bg-[#1a0b2e] border border-white/5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white`}>
           <Icon size={20} />
        </div>
        <span className="text-white font-medium text-lg">{label}</span>
      </div>
      <ChevronRight className="text-gray-600 group-hover:text-white transition-colors" />
    </div>
  );
};

const Menu = () => {
  return (
    <div className="max-w-md mx-auto space-y-6 pb-20 pt-4">
      <h1 className="text-3xl font-bold text-white px-2">Menu</h1>
      
      <div className="space-y-3">
        <MenuItem 
            icon={Send} 
            label="Envoyer Rapport" 
            path="/send-report" 
            color="bg-teal-500" 
        />
        <MenuItem 
            icon={User} 
            label="Mon Profil" 
            path="/profile" 
            color="bg-indigo-500" 
        />
        <MenuItem 
            icon={Globe} 
            label="About Global Mission" 
            path="/" 
            color="bg-blue-500" 
        />
        <MenuItem 
            icon={SettingsIcon} 
            label="Paramètres" 
            path="/settings" 
            color="bg-gray-600" 
        />
        <MenuItem 
            icon={HelpCircle} 
            label="FAQ" 
            path="/faq" 
            color="bg-orange-500" 
        />
      </div>

      <div className="text-center pt-8">
          <p className="text-gray-600 text-xs">Version 1.0.2</p>
          <p className="text-gray-700 text-[10px] mt-1">© 2024 DiscipleLife Inc.</p>
      </div>
    </div>
  );
};

export default Menu;
