
import React from 'react';
import { PlayCircle, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const TestimonialVideos = () => {
  const { toast } = useToast();

  const handleWatch = (title) => {
    toast({
      description: `Lecture du témoignage : ${title}`,
    });
  };

  const testimonies = [
    { title: "Délivré de l'addiction", author: "Marc D.", duration: "10:20" },
    { title: "Guérison miraculeuse", author: "Sarah L.", duration: "08:45" },
    { title: "Une famille restaurée", author: "Famille Martin", duration: "15:00" },
    { title: "De l'athéisme à la foi", author: "Jean-Paul", duration: "12:30" },
    { title: "Trouver la paix", author: "Élise K.", duration: "09:15" },
    { title: "Ma rencontre avec Jésus", author: "Thomas B.", duration: "14:10" },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Témoignages Vidéo</h1>
        <p className="text-gray-400">Découvrez comment Dieu agit puissamment dans la vie de ses enfants.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonies.map((video, idx) => (
          <Card 
            key={idx}
            onClick={() => handleWatch(video.title)}
            className="bg-[#1a0b2e] border-white/10 overflow-hidden cursor-pointer group hover:border-pink-500/50 transition-all hover:-translate-y-1"
          >
            <div className="relative aspect-video bg-gray-900">
               <img alt={`Témoignage de ${video.author}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" src="https://images.unsplash.com/photo-1615579586746-84e166cfb265" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <PlayCircle className="w-14 h-14 text-white/80 group-hover:text-pink-400 transition-colors drop-shadow-lg" />
               </div>
               <div className="absolute top-2 left-2 bg-pink-500/20 text-pink-300 p-1.5 rounded-lg backdrop-blur-sm">
                   <Quote size={16} />
               </div>
            </div>
            <CardContent className="p-5">
               <h3 className="font-bold text-lg text-white mb-1 group-hover:text-pink-400 transition-colors">{video.title}</h3>
               <div className="flex justify-between items-center text-sm text-gray-500">
                   <span>{video.author}</span>
                   <span>{video.duration}</span>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TestimonialVideos;
