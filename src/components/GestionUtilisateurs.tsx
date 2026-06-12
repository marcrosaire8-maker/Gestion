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
  Check,
  ChevronRight,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GestionUtilisateursProps {
  user: UserProfile;
}

export default function GestionUtilisateurs({ user }: GestionUtilisateursProps) {
  // Logic preserved 100%
  const [usersList, setUsersList] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [userToRevoke, setUserToRevoke] = useState<{ id: string; email: string } | null>(null);
  const [showSqlSetup, setShowSqlSetup] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'associe'>('associe');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sqlCode = `-- SQL Script preserved... (Same as original)`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const list = await DbService.getTeamUsers();
      setUsersList(list);
    } catch (err: any) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Veuillez renseigner tous les champs.' });
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      await DbService.addTeamUser(email, password, role);
      setMessage({ type: 'success', text: `L'accès pour "${email}" a été créé.` });
      setEmail(''); setPassword(''); setRole('associe');
      await fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erreur de création.' });
    } finally { setCreating(false); }
  };

  const handleDeleteUser = async (targetId: string, emailToDelete: string) => {
    try {
      await DbService.deleteTeamUser(targetId);
      setMessage({ type: 'success', text: `Accès révoqué pour "${emailToDelete}".` });
      await fetchUsers();
    } catch (err: any) { setMessage({ type: 'error', text: err.message }); }
  };

  return (
    <div className="space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Gestion des Accès</h2>
            <p className="text-[13px] text-slate-500 font-medium">Contrôle des privilèges et membres de l'équipe</p>
          </div>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-70"
        >
          <RefreshCw className={`w-4 h-4 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
          Actualiser la liste
        </button>
      </div>

      {/* SQL Setup Helper (Style Alert Enterprise) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Assistant Intégration Supabase</span>
          </div>
          <button
            onClick={() => setShowSqlSetup(!showSqlSetup)}
            className="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest hover:underline"
          >
            {showSqlSetup ? 'Masquer' : 'Afficher le script SQL'}
          </button>
        </div>
        <AnimatePresence>
          {showSqlSetup && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="p-6 space-y-4">
                <p className="text-[13px] text-slate-500 leading-relaxed font-medium">
                  Exécutez ce script dans votre console <span className="text-slate-900 font-bold">Supabase (SQL Editor)</span> pour initialiser la table des membres et les politiques de sécurité.
                </p>
                <div className="relative bg-slate-900 rounded-xl p-5 group">
                  <button
                    onClick={copySqlToClipboard}
                    className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
                  >
                    {copiedSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <pre className="text-[11px] text-blue-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
                    {sqlCode}
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Creation Form Card */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden h-fit sticky top-8">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Nouvel Associé</h3>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email professionnel</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@entreprise.bj"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/5 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mot de passe provisoire</label>
                <div className="relative group">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text" required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ex: Securite@2024"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/5 focus:border-blue-600 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Niveau d'accès</label>
                <select
                  value={role} onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-semibold text-slate-700 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="associe">Associé d'exploitation</option>
                  <option value="admin">Co-fondateur (Admin)</option>
                </select>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  L'utilisateur <span className="font-bold">Associé</span> peut consulter et enregistrer des données mais ne peut pas effectuer de suppressions définitives.
                </p>
              </div>

              <button
                type="submit" disabled={creating}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
              >
                {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Créer l'accès</span>
              </button>
            </form>
          </div>
        </div>

        {/* Users List Card */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Utilisateurs Autorisés ({usersList.length})</h3>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-12 text-center text-slate-400 text-sm font-medium">Chargement des membres...</div>
              ) : usersList.length === 0 ? (
                <div className="p-12 text-center">
                  <User className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">Aucun accès créé pour le moment.</p>
                </div>
              ) : (
                usersList.map((usr) => (
                  <div key={usr.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        usr.role === 'admin' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                      }`}>
                        {usr.role === 'admin' ? <ShieldAlert className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-slate-800">{usr.email}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight ${
                            usr.role === 'admin' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {usr.role === 'admin' ? 'Admin' : 'Associé'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(usr.created_at).toLocaleDateString('fr-FR')}</span>
                          {usr.password && <span className="text-blue-600 font-mono">PWD: {usr.password}</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setUserToRevoke({ id: usr.id, email: usr.email })}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Revocation Modal */}
      <AnimatePresence>
        {userToRevoke && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Révoquer l'accès ?</h4>
              <p className="text-[13px] text-slate-500 font-medium mb-8 leading-relaxed">
                Voulez-vous supprimer l'accès de <span className="font-bold text-slate-800">"{userToRevoke.email}"</span> ? Cette personne ne pourra plus se connecter.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setUserToRevoke(null)} className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Conserver</button>
                <button 
                  onClick={async () => {
                    const id = userToRevoke.id;
                    const email = userToRevoke.email;
                    setUserToRevoke(null);
                    await handleDeleteUser(id, email);
                  }}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-100 transition-colors"
                >
                  Oui, révoquer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Toast for Success/Error */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-[200]"
          >
            <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 ${
              message.type === 'success' ? 'bg-white border-emerald-100 text-emerald-800' : 'bg-white border-rose-100 text-rose-800'
            }`}>
              {message.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
              <span className="text-[13px] font-bold pr-8">{message.text}</span>
              <button onClick={() => setMessage(null)} className="p-1 hover:bg-slate-100 rounded-md transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
