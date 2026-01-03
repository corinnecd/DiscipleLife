
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Mic, Video, UploadCloud, FileText, History, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import AudioSummaryUpload from '@/components/summaries/AudioSummaryUpload';
import VideoSummaryUpload from '@/components/summaries/VideoSummaryUpload';
import VideoRecorderSummary from '@/components/summaries/VideoRecorderSummary';
import SummaryHistory from '@/components/summaries/SummaryHistory';

const MySummaries = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadType, setUploadType] = useState('audio'); // 'audio', 'video-upload', 'video-record'
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const handleSuccess = () => {
    setRefreshHistory(prev => prev + 1);
    setActiveTab('history');
  };

  // Error boundary effect equivalent
  useEffect(() => {
    if (!user) {
        setError("Vous devez être connecté pour accéder à cette page.");
    }
  }, [user]);

  if (error) {
    return (
        <div className="flex items-center justify-center min-h-[50vh] text-red-600 gap-2">
            <AlertCircle />
            <p>{error}</p>
        </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Mes Résumés | DiscipleLife</title>
      </Helmet>

      <div className="container mx-auto max-w-5xl py-8 space-y-8">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Mes Résumés</h1>
            <p className="text-slate-500">Partagez votre progression et vos réflexions avec votre mentor et votre groupe.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-8">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                    <FileText size={16} /> Nouveau résumé
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                    <History size={16} /> Historique
                </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Selection Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        <Card 
                            className={`cursor-pointer transition-all hover:border-primary/50 ${uploadType === 'audio' ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => setUploadType('audio')}
                        >
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                                    <Mic size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">Message Vocal</h3>
                                    <p className="text-xs text-slate-500">Enregistrer un audio (max 10 min)</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card 
                            className={`cursor-pointer transition-all hover:border-primary/50 ${uploadType === 'video-record' ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => setUploadType('video-record')}
                        >
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 rounded-full bg-red-100 text-red-600">
                                    <Video size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">Me Filmer</h3>
                                    <p className="text-xs text-slate-500">Enregistrer avec la caméra</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card 
                            className={`cursor-pointer transition-all hover:border-primary/50 ${uploadType === 'video-upload' ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => setUploadType('video-upload')}
                        >
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                                    <UploadCloud size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">Uploader Vidéo</h3>
                                    <p className="text-xs text-slate-500">Depuis votre appareil (max 100MB)</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Form Area */}
                    <div className="lg:col-span-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {uploadType === 'audio' && "Enregistrer un résumé audio"}
                                    {uploadType === 'video-record' && "Enregistrer une vidéo"}
                                    {uploadType === 'video-upload' && "Envoyer un fichier vidéo"}
                                </CardTitle>
                                <CardDescription>
                                    Choisissez la visibilité et ajoutez un titre à votre résumé.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {uploadType === 'audio' && <AudioSummaryUpload onSuccess={handleSuccess} />}
                                {uploadType === 'video-record' && <VideoRecorderSummary onSuccess={handleSuccess} />}
                                {uploadType === 'video-upload' && <VideoSummaryUpload onSuccess={handleSuccess} />}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="history">
                <SummaryHistory refreshTrigger={refreshHistory} />
            </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default MySummaries;
