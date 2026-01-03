
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, History, X, ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOnClickOutside } from '@/lib/utils'; // Assuming this might exist or I'll implement a simple ref check

const GlobalSearch = ({ className = "" }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const history = localStorage.getItem('search_history');
    if (history) {
      setRecentSearches(JSON.parse(history));
    }
  }, []);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Save to history
    const newHistory = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(newHistory);
    localStorage.setItem('search_history', JSON.stringify(newHistory));

    setIsOpen(false);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const clearHistory = (e) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('search_history');
  };

  const handleRecentClick = (term) => {
    setQuery(term);
    navigate(`/search?q=${encodeURIComponent(term)}`);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full max-w-md ${className}`} ref={containerRef}>
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Rechercher disciples, prières, études..."
          className="pl-9 pr-4 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:bg-slate-900 focus:border-purple-500 transition-all h-10 w-full rounded-full"
        />
      </form>

      {isOpen && (recentSearches.length > 0 || query) && (
        <Card className="absolute top-full mt-2 left-0 w-full bg-[#1a0b2e] border-slate-700 shadow-xl rounded-xl overflow-hidden z-50">
          <div className="p-2">
            {recentSearches.length > 0 && (
              <div className="mb-2">
                 <div className="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <span>Récent</span>
                    <button onClick={clearHistory} className="hover:text-red-400 transition-colors">Effacer</button>
                 </div>
                 {recentSearches.map((term, index) => (
                    <div 
                      key={index} 
                      onClick={() => handleRecentClick(term)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer text-slate-300 transition-colors group"
                    >
                       <History className="h-3.5 w-3.5 text-slate-500 group-hover:text-purple-400" />
                       <span className="text-sm truncate flex-1">{term}</span>
                       <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 text-slate-500" />
                    </div>
                 ))}
              </div>
            )}
            
            {query && (
               <div 
                  onClick={handleSearch}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 cursor-pointer text-purple-200 transition-colors border border-purple-500/20"
               >
                  <Search className="h-4 w-4" />
                  <span className="text-sm font-medium">Rechercher "{query}"</span>
               </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default GlobalSearch;
