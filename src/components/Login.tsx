import React, { useState } from 'react';
import { DbService } from '../services/dbService';
import { UserProfile } from '../types';
import { Lock, Mail, AlertCircle, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false); // Kept state as per original code

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
    <div className="min-h-screen flex items-center justify-center bg-[#020617] text-slate-100 p-6 relative overflow-hidden select-none font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/30 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -40, 0],
            y: [0, 60, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[120px]" 
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] relative z-10"
      >
        {/* Main Card */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
          
          {/* Accent Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
          
          <div className="p-10">
            {/* Header */}
            <div className="flex flex-col items-center mb-10 text-center">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-indigo-500/20 ring-1 ring-white/20"
              >
                <ShieldCheck className="w-7 h-7 text-white" strokeWidth={1.5} />
              </motion.div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                Bienvenue
              </h1>
              <p className="text-slate-400 text-sm font-medium">
                Accédez à votre console de gestion financière
              </p>
            </div>

            {/* Error Message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, mb: 0 }}
                  animate={{ opacity: 1, height: 'auto', mb: 24 }}
                  exit={{ opacity: 0, height: 0, mb: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                    <div>
                      <h4 className="text-sm font-bold text-rose-200">Erreur de connexion</h4>
                      <p className="text-xs text-rose-300/80 mt-0.5 leading-relaxed">{error}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1">
                  Identifiant Email
                </label>
                <div className="group relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 transition-colors group-focus-within:text-indigo-400">
                    <Mail className="w-[18px] h-[18px]" />
                  </span>
                  <input
                    id="email-input"
                    type="email"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950/40 border border-slate-700/50 rounded-2xl text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all text-white placeholder-slate-600 shadow-inner"
                    placeholder="nom@entreprise.bj"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1">
                  Mot de passe
                </label>
                <div className="group relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 transition-colors group-focus-within:text-indigo-400">
                    <Lock className="w-[18px] h-[18px]" />
                  </span>
                  <input
                    id="password-input"
                    type="password"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950/40 border border-slate-700/50 rounded-2xl text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all text-white placeholder-•••••••• shadow-inner"
                    placeholder="Entrez votre code secret"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                id="btn-submit-login"
                type="submit"
                disabled={loading}
                className="relative overflow-hidden w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/25 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="relative z-10">Se connecter au tableau de bord</span>
                    <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
                {/* Glossy overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
              </button>
            </form>
          </div>
        </div>

        {/* Footer / Meta info */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 text-slate-500 text-xs font-medium tracking-wide uppercase"
        >
          Système Sécurisé &bull; Version 2.4.0
        </motion.p>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}
