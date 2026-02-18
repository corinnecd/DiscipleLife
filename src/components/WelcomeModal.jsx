import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlayCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WelcomeModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('welcome_modal_seen');
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('welcome_modal_seen', 'true');
  };

  const handleWatchVideo = () => {
    setShowVideo(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-[#1a0b2e] border-white/10 text-white sm:max-w-md text-center">
            <DialogHeader>
                <div className="mx-auto w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-yellow-400/20">
                    <span className="text-black font-bold text-2xl">DL</span>
                </div>
                <DialogTitle className="text-2xl font-bold">Bienvenue sur Disciple 70 !</DialogTitle>
                <DialogDescription className="text-gray-300 pt-2 text-base">
                    Votre plateforme tout-en-un pour faire des disciples, suivre leur progression et grandir ensemble en Christ.
                </DialogDescription>
            </DialogHeader>
            
            <div className="py-6 space-y-4">
                <Button 
                    onClick={handleWatchVideo}
                    className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white py-6 text-lg font-bold shadow-xl"
                >
                    <PlayCircle className="mr-2" size={24} /> REGARDER L'INTRODUCTION
                </Button>
                <Button 
                    variant="ghost" 
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white"
                >
                    Passer l'introduction
                </Button>
            </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {showVideo && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
            >
                <div className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
                    <Button 
                        onClick={() => setShowVideo(false)}
                        className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                        size="icon"
                    >
                        <X size={24} />
                    </Button>
                    <iframe 
                        width="100%" 
                        height="100%" 
                        src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" 
                        title="Introduction Disciple 70" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                    ></iframe>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WelcomeModal;