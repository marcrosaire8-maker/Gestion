import { supabase } from '../supabaseClient';
import { Transaction, InventaireItem, LiaisonInventaireTransaction, UserProfile, ActivityLog, TeamUser, ParametresSysteme } from '../types';

// Nettoyage unique des anciennes données localStorage (migration one-shot)
if (typeof window !== 'undefined' && !localStorage.getItem('gfi_cleaned_mock_v3')) {
  localStorage.removeItem('gfi_inventaire');
  localStorage.removeItem('gfi_transactions');
  localStorage.removeItem('gfi_liaisons');
  localStorage.removeItem('gfi_activity_logs');
  localStorage.removeItem('gfi_team_users');
  localStorage.removeItem('gfi_parametres_systeme');
  localStorage.setItem('gfi_cleaned_mock_v3', 'cleaned');
}

// ─────────────────────────────────────────────
// HELPERS INTERNES
// ─────────────────────────────────────────────

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID(); } catch (_) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ─────────────────────────────────────────────
// SERVICE PRINCIPAL — SUPABASE UNIQUEMENT
// ─────────────────────────────────────────────

export class DbService {

  // ─── CONFIG ───────────────────────────────

  public static checkSupabaseConfig(): boolean {
    const url = (import.meta as any).env.VITE_SUPABASE_URL;
    const key = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
    return !!(url && key && url.includes('supabase.co'));
  }

  /** @deprecated Conservé pour compatibilité — toujours false désormais */
  public static getFallbackStatus() {
    return { isFallback: false, reason: '' };
  }

  // ─── AUTHENTIFICATION ─────────────────────

  public static async getCurrentUser(): Promise<UserProfile | null> {
    // 1. Session locale EN PREMIER (membres_equipe — pas de Supabase Auth)
    const raw = sessionStorage.getItem('gfi_session');
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }

    // 2. Supabase Auth (uniquement si pas de session locale)
    if (this.checkSupabaseConfig()) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (user) {
          const role: 'admin' | 'employe' = user.email === 'admin@gestion.bj' ? 'admin' : 'employe';
          return { id: user.id, email: user.email || '', role };
        }
      } catch (err: any) {
        // Silence — pas de session Supabase Auth, c'est normal pour membres_equipe
      }
    }

    return null;
  }

  public static async signIn(email: string, password: string): Promise<UserProfile> {
    if (!this.checkSupabaseConfig()) {
      throw new Error("Supabase n'est pas configuré. Vérifiez vos variables d'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
    }

    // 1. Vérifier dans la table membres_equipe (utilisateurs non-Auth)
    try {
      const { data, error } = await supabase
        .from('membres_equipe')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('password', password);

      if (!error && data && data.length > 0) {
        const match = data[0];
        const profile: UserProfile = {
          id: match.id,
          email: match.email,
          role: match.role as 'admin' | 'employe',
        };
        sessionStorage.setItem('gfi_session', JSON.stringify(profile));
        return profile;
      }
    } catch (err: any) {
      console.warn('Vérification membres_equipe échouée:', err.message);
    }

    // 2. Connexion via Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message || 'Identifiants incorrects.');

    if (data.user) {
      const role: 'admin' | 'employe' = data.user.email === 'admin@gestion.bj' ? 'admin' : 'employe';
      const profile: UserProfile = {
        id: data.user.id,
        email: data.user.email || '',
        role,
      };
      sessionStorage.setItem('gfi_session', JSON.stringify(profile));
      return profile;
    }

    throw new Error('Identifiants incorrects ou utilisateur non trouvé.');
  }

  public static async signOut(): Promise<void> {
    if (this.checkSupabaseConfig()) {
      try { await supabase.auth.signOut(); } catch (err) { console.warn('Supabase signOut error:', err); }
    }
    sessionStorage.removeItem('gfi_session');
  }

  // ─── INVENTAIRE ───────────────────────────

  public static async getInventaire(): Promise<InventaireItem[]> {
    const { data, error } = await supabase
      .from('inventaire')
      .select('*')
      .order('nom_article', { ascending: true });

    if (error) throw new Error(`Erreur chargement inventaire : ${error.message}`);
    return data as InventaireItem[];
  }

  public static async addInventaireItem(item: Omit<InventaireItem, 'id'>): Promise<InventaireItem> {
    const initialQty = item.quantite_disponible;
    const itemToInsert = { ...item, quantite_disponible: 0 };

    let res = await supabase.from('inventaire').insert([itemToInsert]).select();

    // Retry sans colonne 'unite' si la colonne n'existe pas encore
    if (res.error?.code === '42703') {
      const { unite, ...itemWithoutUnite } = itemToInsert as any;
      res = await supabase.from('inventaire').insert([itemWithoutUnite]).select();
    }

    if (res.error) throw new Error(`Erreur création article : ${res.error.message}`);

    const createdItem = res.data![0] as InventaireItem;

    if (initialQty > 0) {
      const montantTotal = initialQty * item.valeur_unitaire;
      const unitLabel = item.unite ? ` ${item.unite}` : '';
      await this.addTransaction(
        {
          type: 'sortie',
          montant: montantTotal,
          mode_paiement: 'Espèces',
          description: `Acquisition matériel : ${item.nom_article} (${initialQty}${unitLabel} à ${item.valeur_unitaire} F CFA)`,
          user_id: '',
        },
        createdItem.id,
        initialQty
      );
      createdItem.quantite_disponible = initialQty;
    }

    await this.addLog(
      'create_inv',
      `Équipement créé : "${createdItem.nom_article}"${createdItem.unite ? ` (Unité: ${createdItem.unite})` : ''} (Qté initiale : ${initialQty}, Valeur unitaire : ${createdItem.valeur_unitaire} F CFA)`
    );

    return createdItem;
  }

  public static async updateInventaireQty(id: string, newQty: number): Promise<void> {
    const inventaire = await this.getInventaire();
    const item = inventaire.find(i => i.id === id);
    const oldQty = item ? item.quantite_disponible : 0;
    const itemName = item ? item.nom_article : 'Équipement inconnu';

    const { error } = await supabase.from('inventaire').update({ quantite_disponible: newQty }).eq('id', id);
    if (error) throw new Error(`Erreur mise à jour quantité : ${error.message}`);

    await this.addLog('update_inv', `Quantité ajustée pour "${itemName}" : passée de ${oldQty} à ${newQty}`);
  }

  public static async deleteInventaireItem(id: string): Promise<void> {
    const inventaire = await this.getInventaire();
    const item = inventaire.find(i => i.id === id);
    const itemName = item ? item.nom_article : 'Équipement inconnu';
    const itemQty = item ? item.quantite_disponible : 0;

    if (isValidUUID(id)) {
      const { error: liaisonErr } = await supabase.from('liaison_inventaire_transaction').delete().eq('article_id', id);
      if (liaisonErr) console.warn('Suppression liaisons inventaire:', liaisonErr.message);

      const { error } = await supabase.from('inventaire').delete().eq('id', id);
      if (error) throw new Error(`Erreur suppression article : ${error.message}`);
    }

    await this.addLog('delete_inv', `Équipement supprimé : "${itemName}" (Qté restante lors de la suppression : ${itemQty})`);
  }

  // ─── TRANSACTIONS ─────────────────────────

  public static async getTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date_transaction', { ascending: false });

    if (error) throw new Error(`Erreur chargement transactions : ${error.message}`);
    return data as Transaction[];
  }

  public static async addTransaction(
    tx: Omit<Transaction, 'id' | 'date_transaction'>,
    associatedArticleId?: string,
    quantiteAchetee?: number
  ): Promise<Transaction> {
    const user = await this.getCurrentUser();
    const userId = user ? user.id : 'unknown-user';
    const finalTx = {
      ...tx,
      user_id: isValidUUID(userId) ? userId : null,
      date_transaction: new Date().toISOString(),
    };

    let res = await supabase.from('transactions').insert([finalTx]).select();

    // Retry sans colonnes nouvelles si elles n'existent pas
    if (res.error?.code === '42703') {
      const { categorie, associe_nom, ...txWithoutNewCols } = finalTx as any;
      res = await supabase.from('transactions').insert([txWithoutNewCols]).select();
    }

    if (res.error) throw new Error(`Erreur enregistrement transaction : ${res.error.message}`);

    const insertedTx = res.data![0] as Transaction;

    if (insertedTx && associatedArticleId && quantiteAchetee) {
      const liaison: LiaisonInventaireTransaction = {
        transaction_id: insertedTx.id,
        article_id: associatedArticleId,
        quantite_achetee: quantiteAchetee,
      };
      const { error: liaisonErr } = await supabase.from('liaison_inventaire_transaction').insert([liaison]);
      if (liaisonErr) console.warn('Liaison inventaire-transaction:', liaisonErr.message);

      const inventaire = await this.getInventaire();
      const item = inventaire.find(i => i.id === associatedArticleId);
      if (item) {
        const delta = tx.type === 'sortie' ? quantiteAchetee : -quantiteAchetee;
        const updatedQty = Math.max(0, item.quantite_disponible + delta);
        await this.updateInventaireQty(associatedArticleId, updatedQty);
      }
    }

    const detailsAttr = associatedArticleId && quantiteAchetee
      ? await (async () => {
          try {
            const inv = await this.getInventaire();
            const art = inv.find(i => i.id === associatedArticleId);
            return art ? ` (Lié à l'inventaire : ${quantiteAchetee}x "${art.nom_article}")` : '';
          } catch { return ''; }
        })()
      : '';

    const typeTxt = insertedTx.type === 'entrée' ? 'Entrée (+)' : 'Sortie (-)';
    await this.addLog(
      'create_tx',
      `Enregistrement d'une ${typeTxt} de ${insertedTx.montant.toLocaleString('fr-FR')} F CFA pour "${insertedTx.description}"${detailsAttr}`,
      insertedTx.montant,
      insertedTx.type
    );

    return insertedTx;
  }

  public static async uploadReceipt(file: File): Promise<string> {
    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const contentTypeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', pdf: 'application/pdf',
    };
    const contentType = contentTypeMap[fileExt] || file.type || 'application/octet-stream';

    const { error } = await supabase.storage
      .from('recus-preuves')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

    if (error) {
      if (error.message.includes('bucket') || error.message.includes('not found')) {
        throw new Error("Le bucket 'recus-preuves' n'existe pas. Créez-le dans Supabase → Storage.");
      }
      throw new Error(`Erreur upload fichier : ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage.from('recus-preuves').getPublicUrl(filePath);
    return publicUrl;
  }

  public static async getLiaisons(): Promise<LiaisonInventaireTransaction[]> {
    const { data, error } = await supabase.from('liaison_inventaire_transaction').select('*');
    if (error) throw new Error(`Erreur chargement liaisons : ${error.message}`);
    return data as LiaisonInventaireTransaction[];
  }

  public static async deleteTransaction(id: string): Promise<void> {
    const transactions = await this.getTransactions();
    const tx = transactions.find(t => t.id === id);
    const txDesc = tx ? tx.description : 'Opération inconnue';
    const txAmount = tx ? tx.montant : 0;
    const txType = tx ? tx.type : 'entrée';

    // Rétablir les quantités d'inventaire liées
    try {
      const liaisons = await this.getLiaisons();
      const liaison = liaisons.find(l => l.transaction_id === id);
      if (liaison && tx) {
        const delta = tx.type === 'sortie' ? -liaison.quantite_achetee : liaison.quantite_achetee;
        const inventaire = await this.getInventaire();
        const item = inventaire.find(i => i.id === liaison.article_id);
        if (item) {
          await this.updateInventaireQty(liaison.article_id, Math.max(0, item.quantite_disponible + delta));
        }
      }
    } catch (err) {
      console.warn('Impossible de rétablir les quantités inventaire:', err);
    }

    if (isValidUUID(id)) {
      const { error: liaisonErr } = await supabase.from('liaison_inventaire_transaction').delete().eq('transaction_id', id);
      if (liaisonErr) console.warn('Suppression liaison:', liaisonErr.message);

      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw new Error(`Erreur suppression transaction : ${error.message}`);
    }

    await this.addLog('delete_tx', `Suppression de l'opération : "${txDesc}" (Montant annulé : ${txAmount.toLocaleString('fr-FR')} F CFA)`, txAmount, txType);
  }

  public static async deleteAllTransactions(): Promise<void> {
    const txs = await this.getTransactions();
    const count = txs.length;

    const ids = txs.map(t => t.id).filter(isValidUUID);
    if (ids.length > 0) {
      const { error: liaisonErr } = await supabase.from('liaison_inventaire_transaction').delete().in('transaction_id', ids);
      if (liaisonErr) throw new Error(`Erreur suppression liaisons : ${liaisonErr.message}`);

      const { error } = await supabase.from('transactions').delete().in('id', ids);
      if (error) throw new Error(`Erreur purge transactions : ${error.message}`);
    }

    await this.addLog('purge_tx', `Purge complète : Suppression de toutes les opérations (${count} transactions effacées)`);
  }

  // ─── HISTORIQUE D'AUDIT ───────────────────

  public static async getLogs(): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('historique_activites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erreur chargement logs : ${error.message}`);
    return data as ActivityLog[];
  }

  public static async addLog(
    action_type: ActivityLog['action_type'],
    details: string,
    montant?: number,
    type_operation?: 'entrée' | 'sortie'
  ): Promise<ActivityLog> {
    const user = await this.getCurrentUser();
    const email = user ? user.email : 'Visiteur anonyme';

    const log: ActivityLog = {
      id: generateUUID(),
      created_at: new Date().toISOString(),
      user_email: email,
      action_type,
      details,
      montant,
      type_operation,
    };

    const { error } = await supabase.from('historique_activites').insert([log]);
    if (error) console.warn('Impossible d\'insérer le log dans Supabase:', error.message);

    return log;
  }

  public static async clearLogs(): Promise<void> {
    const { error } = await supabase.from('historique_activites').delete().gte('created_at', '1970-01-01');
    if (error) throw new Error(`Erreur suppression logs : ${error.message}`);
  }

  // ─── MEMBRES DE L'ÉQUIPE ──────────────────

  public static async getTeamUsers(): Promise<TeamUser[]> {
    const { data, error } = await supabase
      .from('membres_equipe')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erreur chargement utilisateurs : ${error.message}`);
    return data as TeamUser[];
  }

  public static async addTeamUser(email: string, password: string, role: 'admin' | 'employe'): Promise<TeamUser> {
    const user: TeamUser = {
      id: generateUUID(),
      email: email.toLowerCase().trim(),
      password,
      role,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('membres_equipe').insert([user]);
    if (error) throw new Error(`Erreur création utilisateur : ${error.message}`);

    await this.addLog('create_inv', `Droit de connexion accordé à : "${email}" en tant que ${role === 'admin' ? 'Administrateur' : 'Employé'}`);
    return user;
  }

  public static async deleteTeamUser(id: string): Promise<void> {
    const users = await this.getTeamUsers();
    const match = users.find(u => u.id === id);
    const email = match ? match.email : 'Utilisateur inconnu';

    if (!isValidUUID(id)) throw new Error("ID utilisateur invalide.");

    const { error } = await supabase.from('membres_equipe').delete().eq('id', id);
    if (error) throw new Error(`Erreur révocation accès : ${error.message}`);

    await this.addLog('delete_inv', `Accès révoqué pour l'utilisateur : "${email}"`);
  }

  // ─── PARAMÈTRES SYSTÈME ───────────────────

  public static async getParametresSysteme(): Promise<ParametresSysteme> {
    const defaultParams: ParametresSysteme = { id: 1, dernier_mois_verrouille: '' };

    const { data, error } = await supabase.from('parametres_systeme').select('*').eq('id', 1).maybeSingle();
    if (error) throw new Error(`Erreur chargement paramètres : ${error.message}`);

    if (data) return data as ParametresSysteme;

    // Première utilisation — insérer les paramètres par défaut
    const { error: insertErr } = await supabase.from('parametres_systeme').insert([defaultParams]);
    if (insertErr) console.warn('Impossible d\'insérer les paramètres par défaut:', insertErr.message);
    return defaultParams;
  }

  public static async updateDernierMoisVerrouille(mois: string): Promise<void> {
    const updatedParams: ParametresSysteme = { id: 1, dernier_mois_verrouille: mois };

    const { error } = await supabase.from('parametres_systeme').upsert([updatedParams]);
    if (error) throw new Error(`Erreur mise à jour paramètres : ${error.message}`);

    await this.addLog('update_inv', `Clôture comptable : Historique verrouillé jusqu'au mois ${mois || 'Aucun (débloqué)'}`);
  }

  // ─── NETTOYAGE ────────────────────────────

  /** Supprime les résidus localStorage d'ancienne version et recharge la page */
  public static resetLocalData(): void {
    localStorage.removeItem('gfi_inventaire');
    localStorage.removeItem('gfi_transactions');
    localStorage.removeItem('gfi_liaisons');
    localStorage.removeItem('gfi_activity_logs');
    localStorage.removeItem('gfi_team_users');
    localStorage.removeItem('gfi_parametres_systeme');
    localStorage.removeItem('gfi_cleaned_mock_v3');
    sessionStorage.removeItem('gfi_session');
    window.location.reload();
  }
}