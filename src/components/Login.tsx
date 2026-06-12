import React, { useState } from 'react';
import { DbService } from '../services/dbService';
import { UserProfile } from '../types';
import { Lock, Mail, AlertCircle, ShieldCheck, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  // Logic preserved 100%
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Veuillez remplir tous les champs requis.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const user = await DbService.signIn(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(
        err.message || "Identifiants incorrects ou problème de connexion au serveur Supabase."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFillCredentials = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 p-4 font-sans selection:bg-blue-100">
      {/* Background subtil - Texture de grille légère pour l'aspect pro */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} 
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[440px] z-10"
      >
        {/* En-tête avec Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Console de Gestion
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">
            Finance & Inventaire Enterprise
          </p>
        </div>

        {/* Carte de Connexion */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="p-8">
            
            {/* Alert d'erreur épurée */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6"
                >
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-lg text-red-700">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="text-xs font-medium leading-relaxed">
                      {error}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700 ml-0.5">
                  Adresse e-mail professionnel
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@entreprise.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/5 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <label className="text-[13px] font-semibold text-slate-700">
                    Mot de passe
                  </label>
                  <button type="button" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider">
                    Oublié ?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/5 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Se connecter</span>
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  </>
                )}
              </button>
            </form>
          </div>
          
          {/* Footer de la carte */}
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-center">
            <p className="text-[11px] text-slate-500 font-medium">
              Authentification sécurisée via protocole SSL
            </p>
          </div>
        </div>

        {/* Mentions Légales */}
        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
          <p className="text-[11px] text-slate-400 font-medium">
            &copy; 2024 Nexus Systems Inc.
          </p>
          <a href="#" className="text-[11px] text-slate-400 hover:text-slate-600 font-medium underline underline-offset-2">
            Support technique
          </a>
          <a href="#" className="text-[11px] text-slate-400 hover:text-slate-600 font-medium underline underline-offset-2">
            Confidentialité
          </a>
        </div>
      </motion.div>
    </div>
  );
}
