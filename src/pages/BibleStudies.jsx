import React from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const StudyCategory = ({ title, videos }) => (
  <div className="mb-8">
    <h2 className="text-xl font-bold text-white mb-4 pl-2 border-l-4 border-yellow-500">{title}</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video, idx) => (
        <motion.div 
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="bg-[#1a0b2e] border border-white/5 rounded-xl overflow-hidden hover:border-yellow-500/50 transition-all group cursor-pointer"
        >
          <div className="relative aspect-video bg-black/50">
            <img alt={`Thumbnail for ${video.title}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" src="https://images.unsplash.com/photo-1589465306922-f72b4853de9c" />
            <div className="absolute inset-0 flex items-center justify-center">
              <PlayCircle className="w-12 h-12 text-white/80 group-hover:text-yellow-400 transition-colors" />
            </div>
            <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white font-mono flex items-center gap-1">
               <Clock size={10} /> {video.duration}
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-start">
               <h3 className="font-semibold text-white line-clamp-1">{video.title}</h3>
               <span className="text-xs text-gray-500">{video.progress}%</span>
            </div>
            <Progress value={video.progress} className="h-1 bg-white/10" indicatorClassName="bg-yellow-500" />
            <p className="text-xs text-gray-400 line-clamp-2">{video.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const BibleStudies = () => {
  const categories = [
    {
      title: "4 Chair Discipling",
      videos: [
        { title: "Introduction aux 4 Chaises", duration: "12:30", progress: 100, description: "Comprendre le mouvement du disciple." },
        { title: "Le Chercheur", duration: "15:45", progress: 60, description: "Comment identifier et aider le chercheur." },
        { title: "Le Croyant", duration: "18:20", progress: 0, description: "Nourrir la foi du nouveau croyant." },
      ]
    },
    {
      title: "Walk Like Jesus",
      videos: [
        { title: "L'intimité avec le Père", duration: "22:10", progress: 30, description: "Développer une vie de prière profonde." },
        { title: "La puissance de l'Esprit", duration: "20:00", progress: 0, description: "Marcher selon l'Esprit au quotidien." },
      ]
    },
    {
      title: "Live Like Jesus",
      videos: [
        { title: "Servir comme Lui", duration: "25:15", progress: 0, description: "Le service désintéressé." },
        { title: "Aimer son prochain", duration: "19:45", progress: 0, description: "L'amour en action." },
        { title: "Faire des disciples", duration: "28:30", progress: 0, description: "La grande commission." },
      ]
    }
  ];

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Études Bibliques</h1>
        <p className="text-gray-400">Ressources vidéos pour votre croissance spirituelle.</p>
      </div>
      
      {categories.map((cat, idx) => (
        <StudyCategory key={idx} title={cat.title} videos={cat.videos} />
      ))}
    </div>
  );
};

export default BibleStudies;