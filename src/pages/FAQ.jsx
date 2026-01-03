import React from 'react';
import { PlusCircle, MinusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="border border-white/10 rounded-lg bg-[#1a0b2e] overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-medium text-white pr-4">{question}</span>
        {isOpen ? <MinusCircle className="text-pink-500 shrink-0" /> : <PlusCircle className="text-gray-500 shrink-0" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 text-gray-400 text-sm leading-relaxed border-t border-white/5 bg-black/20">
                {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQ = () => {
  const faqs = [
    {
        question: "Comment ajouter un nouveau disciple ?",
        answer: "Allez dans la section 'Mes Disciples' ou 'Cercles', cliquez sur le bouton '+', remplissez les informations (Nom, Statut) et validez. Le disciple apparaîtra instantanément dans votre liste."
    },
    {
        question: "Comment planifier un rendez-vous ?",
        answer: "Utilisez le bouton 'Planifier un entretien' sur votre tableau de bord ou l'icône calendrier. Sélectionnez le disciple, la date et l'heure. Vous recevrez un rappel avant l'événement."
    },
    {
        question: "Mes données sont-elles sécurisées ?",
        answer: "Absolument. Toutes les données sont cryptées et stockées de manière sécurisée. Seuls vous et les administrateurs autorisés ont accès à vos informations de suivi pastoral."
    },
    {
        question: "Puis-je changer mon niveau spirituel ?",
        answer: "Le niveau spirituel est généralement évalué par votre mentor. Cependant, vous pouvez voir votre progression dans votre profil. Discutez-en avec votre leader pour mettre à jour votre statut."
    }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-4 pb-20">
      <div className="space-y-2 px-2">
        <h1 className="text-3xl font-bold text-white">Questions Fréquentes</h1>
        <p className="text-gray-400">Des réponses simples pour vous aider à avancer.</p>
      </div>
      
      <div className="space-y-3">
        {faqs.map((faq, idx) => (
            <FAQItem key={idx} question={faq.question} answer={faq.answer} />
        ))}
      </div>
    </div>
  );
};

export default FAQ;