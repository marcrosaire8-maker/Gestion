import { useState, useEffect, FormEvent } from 'react';
import { TeamUser, UserProfile } from '../types';
import { DbService } from '../services/dbService';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  ShieldCheck, 
  Mail, 
  Key, 
  Calendar, 
  ShieldAlert, 
  User, 
  RefreshCw,
  Info,
  Database,
  Code,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GestionUtilisateursProps {
  user: UserProfile;
}

export default function GestionUtilisateurs({ user }: GestionUtilisateursProps) {
  const [usersList, setUsersList] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Custom revocation modal state
  const [userToRevoke, setUserToRevoke] = useState<{ id: string; email: string } | null>(null);
  
  // SQL Help States
  const [showSqlSetup, setShowSqlSetup] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const sqlCode = `-- 1. Création de la table pour les membres de l'équipe (Associés / Co-fondateurs)
CREATE TABLE IF NOT EXISTS membres_equipe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'associe')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Activer la sécurité au niveau des lignes (RLS)
ALTER TABLE membres_equipe ENABLE ROW LEVEL SECURITY;

-- 3. Politique d'accès public/authentifié (lecture et écriture sans blocage Postgres)
CREATE POLICY "Accès complet membres_equipe" ON membres_equipe
    FOR ALL USING (true) WITH CHECK (true);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'associe'>('associe');
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const list = await DbService.getTeamUsers();
      setUsersList(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Veuillez renseigner tous les champs obligatoires.' });
      return;
    }

    setCreating(true);
    setMessage(null);

    try {
      await DbService.addTeamUser(email, password, role);
      setMessage({ 
        type: 'success', 
        text: `L'accès utilisateur pour "${email}" a été créé avec succès. L'associé peut désormais se connecter.` 
      });
      setEmail('');
      setPassword('');
      setRole('associe');
      await fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: `Erreur : ${err.message || 'Impossible de créer le profil.'}` });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (targetId: string, emailToDelete: string) => {
    try {
      await DbService.deleteTeamUser(targetId);
      setMessage({ type: 'success', text: `L'accès de "${emailToDelete}" a été révoqué.` });
      await fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: `Impossible de supprimer : ${err.message || 'Inconnue'}` });
    }
  };

  return (
    <div className="space-y-6" id="gestion-utilisateurs-container">
      {/* Title banner */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Gestion des Accès & Associés
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Créez des accès sécurisés pour vos co-fondateurs ou associés d'exploitation afin qu'ils puissent piloter la trésorerie et le capital.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border text-xs flex justify-between items-center ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <p>{message.text}</p>
          <button 
            type="button"
            onClick={() => setMessage(null)}
            className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            Fermer
          </button>
        </motion.div>
      )}

      {/* SQL Setup Assistant and Helper */}
      <div className="bg-slate-900/20 border border-slate-800/60 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-white block">Aide à l'intégration Supabase (SQL)</span>
              <span className="text-[10px] text-slate-400 block">Si vous rencontrez des erreurs de synchronisation de base de données.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSqlSetup(!showSqlSetup)}
            className="shrink-0 px-3 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Code className="w-3.5 h-3.5" />
            {showSqlSetup ? 'Masquer le script SQL' : 'Afficher le script SQL'}
          </button>
        </div>

        {showSqlSetup && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3 pt-2"
          >
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pour pouvoir enregistrer et révoquer les accès des associés directement dans votre instance Supabase, exécutez le script SQL d'initialisation ci-dessous dans l'onglet <strong className="text-white">SQL Editor</strong> de votre console Supabase. Ce script résout l'erreur de rôle inexistant en créant la table et en configurant des politiques d'accès universelles robustes.
            </p>

            <div className="relative bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-hidden">
              <button
                type="button"
                onClick={copySqlToClipboard}
                className="absolute top-2 right-2 p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded transition-all cursor-pointer"
                title="Copier le script SQL"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <pre className="text-[10px] text-slate-300 font-mono leading-relaxed overflow-x-auto whitespace-pre pr-8">
                {sqlCode}
              </pre>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create User Form Box */}
        <div className="lg:col-span-1 bg-slate-900/30 border border-slate-900 rounded-xl p-5 space-y-5 h-fit">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
            <UserPlus className="w-4.5 h-4.5 text-indigo-400" />
            <span className="text-xs uppercase font-bold text-white tracking-wide">Ajouter un Associé</span>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            {/* Email input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Adresse Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="create-user-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="associe@entreprise.bj"
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs text-white focus:outline-none placeholder-slate-500 transition-all font-medium font-sans"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Mot de Passe de Connexion
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  id="create-user-password"
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ex: Passe@2026"
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs text-white focus:outline-none placeholder-slate-500 transition-all font-medium font-sans"
                />
              </div>
            </div>

            {/* Role select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Rôle Accordé
              </label>
              <select
                id="create-user-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'associe')}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs text-white focus:outline-none transition-all font-medium"
              >
                <option value="associe">Associé d'exploitation (Lecture + Écritures)</option>
                <option value="admin">Co-fondateur (Droits d'administration complets)</option>
              </select>
            </div>

            <div className="p-3 bg-slate-950/50 border border-slate-900 rounded-lg text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-500/80 shrink-0 mt-0.5" />
              <span>
                Les membres avec le rôle <strong className="text-slate-300">Associé</strong> ont accès à toutes les données, à l'historique d'audit, mais ne peuvent pas supprimer définitivement des transactions (uniquement les admins ont ce droit).
              </span>
            </div>

            <button
              id="btn-confirm-create-user"
              type="submit"
              disabled={creating}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {creating ? 'Création de l\'accès...' : 'Créer l\'accès utilisateur'}
            </button>
          </form>
        </div>

        {/* Existing Users Table List */}
        <div className="lg:col-span-2 bg-slate-900/30 border border-slate-900 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-900">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
              <span className="text-xs uppercase font-bold text-white tracking-wide">Utilisateurs Enregistrés ({usersList.length})</span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
              <p className="text-[11px]">Mise à jour de la liste...</p>
            </div>
          ) : usersList.length === 0 ? (
            <div className="text-center py-16 text-slate-500 border border-dashed border-slate-850 rounded-xl space-y-1">
              <User className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-bold">Aucun utilisateur créé.</p>
              <p className="text-[11px]">Renseignez le formulaire de gauche pour associer vos partenaires.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {usersList.map((usr) => (
                <div 
                  key={usr.id} 
                  className="p-4 bg-slate-950/50 border border-slate-850 hover:border-slate-800 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all"
                  id={`user-item-${usr.id}`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center border shrink-0 ${
                      usr.role === 'admin' 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                      {usr.role === 'admin' ? <ShieldAlert className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{usr.email}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border font-mono font-medium ${
                          usr.role === 'admin' 
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' 
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                        }`}>
                          {usr.role === 'admin' ? 'Co-fondateur (Admin)' : 'Associé'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        <span>Créé le {new Date(usr.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>

                        {usr.password && (
                          <>
                            <span className="text-slate-800">•</span>
                            <span className="text-indigo-400">Pass : <strong className="font-mono text-slate-300">{usr.password}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setUserToRevoke({ id: usr.id, email: usr.email })}
                    className="self-end sm:self-center px-2.5 py-1 text-[10px] text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/10 hover:border-rose-500 rounded font-bold cursor-pointer transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Révoquer l'accès
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modern Custom Confirmation Modal for Role Revocation to prevent iframe blocks */}
      <AnimatePresence>
        {userToRevoke && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Révoquer un utilisateur ?</h4>
              </div>
              
              <p className="text-xs text-slate-300 leading-relaxed">
                Êtes-vous certain de vouloir révoquer l'accès de l'associé <strong className="text-white">"{userToRevoke.email}"</strong> ? 
                Cette personne ne pourra plus du tout se connecter à l'espace financier.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToRevoke(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-705 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Conserver
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const idToDel = userToRevoke.id;
                    const emailToDel = userToRevoke.email;
                    setUserToRevoke(null);
                    await handleDeleteUser(idToDel, emailToDel);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Oui, révoquer l'accès
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
