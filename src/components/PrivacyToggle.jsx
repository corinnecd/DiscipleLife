import React from 'react';
import { Lock, Users, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const PrivacyToggle = ({ value, onChange }) => {
  const options = [
    { value: 'mentor_only', label: 'Mentor seul', icon: Lock },
    { value: 'group', label: 'Tout le groupe', icon: Users },
  ];

  return (
    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 w-full md:w-auto">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
              isActive 
                ? "bg-white text-primary shadow-sm ring-1 ring-slate-200" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            )}
          >
            <Icon size={16} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default PrivacyToggle;