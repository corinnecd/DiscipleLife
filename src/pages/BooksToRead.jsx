
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, CheckCircle, BarChart } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const BooksToRead = () => {
  const navigate = useNavigate();

  const books = [
    {
      id: "prisons-interieures",
      title: "Sortir des Prisons Intérieures",
      author: "Yvan Castanou",
      chapters: 12,
      completed: 4,
      coverColor: "bg-red-900/40",
      textColor: "text-red-400"
    },
    {
      id: "power-prayer",
      title: "La Puissance de la Prière",
      author: "E.M. Bounds",
      chapters: 8,
      completed: 0,
      coverColor: "bg-blue-900/40",
      textColor: "text-blue-400"
    },
    {
      id: "purpose-driven",
      title: "Une Vie Motivée par l'Essentiel",
      author: "Rick Warren",
      chapters: 40,
      completed: 15,
      coverColor: "bg-green-900/40",
      textColor: "text-green-400"
    },
    {
      id: "mere-christianity",
      title: "Les Fondements du Christianisme",
      author: "C.S. Lewis",
      chapters: 15,
      completed: 0,
      coverColor: "bg-yellow-900/40",
      textColor: "text-yellow-400"
    },
    {
      id: "crazy-love",
      title: "Un Amour Fou",
      author: "Francis Chan",
      chapters: 10,
      completed: 0,
      coverColor: "bg-purple-900/40",
      textColor: "text-purple-400"
    },
    {
      id: "imitating-christ",
      title: "L'Imitation de Jésus-Christ",
      author: "Thomas a Kempis",
      chapters: 20,
      completed: 0,
      coverColor: "bg-indigo-900/40",
      textColor: "text-indigo-400"
    },
    {
      id: "grace-revolution",
      title: "La Révolution de la Grâce",
      author: "Joseph Prince",
      chapters: 18,
      completed: 2,
      coverColor: "bg-pink-900/40",
      textColor: "text-pink-400"
    },
    {
      id: "battlefield-mind",
      title: "Le Champ de Bataille de la Pensée",
      author: "Joyce Meyer",
      chapters: 14,
      completed: 0,
      coverColor: "bg-teal-900/40",
      textColor: "text-teal-400"
    },
    {
      id: "pilgrims-progress",
      title: "Le Voyage du Pèlerin",
      author: "John Bunyan",
      chapters: 12,
      completed: 0,
      coverColor: "bg-orange-900/40",
      textColor: "text-orange-400"
    },
    {
      id: "god-chasers",
      title: "Les Chasseurs de Dieu",
      author: "Tommy Tenney",
      chapters: 10,
      completed: 0,
      coverColor: "bg-cyan-900/40",
      textColor: "text-cyan-400"
    }
  ];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Livres à Lire</h1>
        <p className="text-gray-400">Une sélection de lectures essentielles pour votre croissance spirituelle.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {books.map((book) => (
          <Card key={book.id} className="bg-[#1a0b2e] border-white/10 flex flex-col h-full hover:border-white/20 transition-all group">
            <div className={`aspect-[2/3] w-full ${book.coverColor} relative flex items-center justify-center p-6 text-center`}>
               {/* Book Cover Placeholder */}
               <div className="absolute inset-2 border border-white/20 rounded-sm" />
               <div className="relative z-10">
                 <Book className={`w-12 h-12 mx-auto mb-2 ${book.textColor}`} />
                 <h3 className="font-serif font-bold text-white leading-tight mb-1">{book.title}</h3>
                 <p className="text-xs text-gray-300 font-medium">{book.author}</p>
               </div>
            </div>
            
            <CardContent className="p-4 flex-1 flex flex-col gap-4">
              <div className="space-y-2 mt-auto">
                 <div className="flex justify-between text-xs text-gray-400 font-medium">
                    <span>{Math.round((book.completed / book.chapters) * 100)}% lu</span>
                    <span>{book.completed}/{book.chapters} chap.</span>
                 </div>
                 <Progress value={(book.completed / book.chapters) * 100} className="h-1.5" />
              </div>
            </CardContent>

            <CardFooter className="p-4 pt-0">
               <Button 
                  onClick={() => navigate(`/books-to-read/${book.id}`)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  size="sm"
               >
                 {book.completed > 0 ? "Continuer" : "Commencer"}
               </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BooksToRead;
