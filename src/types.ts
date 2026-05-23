export interface Transaction {
  id: string;
  user_id: string;
  type: 'entrée' | 'sortie';
  montant: number;
  date_transaction: string;
  mode_paiement: string;
  preuve_url?: string;
  description: string;
  categorie?: 'Développement/Tech' | 'Marketing/Com' | 'Logistique' | 'Administratif/Frais' | 'Autre';
  associe_nom?: string;
}

export interface InventaireItem {
  id: string;
  nom_article: string;
  quantite_disponible: number;
  valeur_unitaire: number;
  unite?: string;
}

export interface LiaisonInventaireTransaction {
  transaction_id: string;
  article_id: string;
  quantite_achetee: number;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'associe';
}

export interface TeamUser {
  id: string;
  email: string;
  password?: string;
  role: 'admin' | 'associe';
  created_at: string;
}

export interface ActivityLog {
  id: string;
  created_at: string;
  user_email: string;
  action_type: 'create_tx' | 'delete_tx' | 'purge_tx' | 'create_inv' | 'delete_inv' | 'update_inv' | 'adjust_qty';
  details: string;
  montant?: number;
  type_operation?: 'entrée' | 'sortie';
}

export interface ParametresSysteme {
  id: number;
  dernier_mois_verrouille: string; // 'YYYY-MM'-format or empty
}
