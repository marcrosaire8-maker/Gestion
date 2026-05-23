/**
 * Tests unitaires pour DbService
 * Framework : Vitest
 * Emplacement : __tests__/dbService.test.ts  (à la racine du projet, PAS dans src/)
 * Lancer avec : npm run test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─────────────────────────────────────────────
// Mock du client Supabase
// ─────────────────────────────────────────────
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import { supabase } from '../src/supabaseClient';
import { DbService } from '../src/services/dbService';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function mockSupabaseUser(email: string) {
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: { id: 'uuid-123', email } },
    error: null,
  } as any);
}

function mockSupabaseAuthError(message = 'Network error') {
  vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error(message));
}

function setSession(profile: object | null) {
  if (profile) {
    sessionStorage.setItem('gfi_session', JSON.stringify(profile));
  } else {
    sessionStorage.removeItem('gfi_session');
  }
}

// ─────────────────────────────────────────────
// SUITE : getCurrentUser
// ─────────────────────────────────────────────
describe('DbService.getCurrentUser', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.removeItem('gfi_is_fallback');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('retourne le rôle "admin" pour admin@gestion.bj', async () => {
    mockSupabaseUser('admin@gestion.bj');
    const user = await DbService.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.role).toBe('admin');
    expect(user!.email).toBe('admin@gestion.bj');
    expect(user!.id).toBe('uuid-123');
  });

  it('retourne le rôle "employe" pour tout autre email connecté', async () => {
    mockSupabaseUser('associe@gestion.bj');
    const user = await DbService.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.role).toBe('employe');
    expect(user!.email).toBe('associe@gestion.bj');
  });

  it('retourne "employe" pour un email quelconque non admin', async () => {
    mockSupabaseUser('nouveau.collaborateur@example.com');
    const user = await DbService.getCurrentUser();
    expect(user!.role).toBe('employe');
  });

  it('retourne null si Supabase ne retourne aucun utilisateur et aucune session locale', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);
    const user = await DbService.getCurrentUser();
    expect(user).toBeNull();
  });

  it('retombe sur la session locale si Supabase lève une erreur réseau', async () => {
    mockSupabaseAuthError('Failed to fetch');
    setSession({ id: 'local-id', email: 'local@gestion.bj', role: 'employe' });
    const user = await DbService.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.email).toBe('local@gestion.bj');
    expect(user!.role).toBe('employe');
  });

  it('retourne null si la session locale est du JSON invalide', async () => {
    mockSupabaseAuthError('timeout');
    sessionStorage.setItem('gfi_session', '{INVALID_JSON');
    const user = await DbService.getCurrentUser();
    expect(user).toBeNull();
  });

  it('utilise la session locale en mode fallback sans appel Supabase', async () => {
    sessionStorage.setItem('gfi_is_fallback', 'true');
    setSession({ id: 'user-associe', email: 'associe@gestion.bj', role: 'associe' });
    const user = await DbService.getCurrentUser();
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
    expect(user!.role).toBe('associe');
  });

  it('ne confond pas admin@gestion.BJ (casse différente) avec l\'admin', async () => {
    mockSupabaseUser('Admin@Gestion.BJ');
    const user = await DbService.getCurrentUser();
    expect(user!.role).toBe('employe');
  });
});

// ─────────────────────────────────────────────
// SUITE : signIn
// ─────────────────────────────────────────────
describe('DbService.signIn', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.removeItem('gfi_team_users');
    vi.clearAllMocks();
  });

  it('connecte un utilisateur présent dans gfi_team_users (localStorage)', async () => {
    const teamUser = {
      id: 'team-1',
      email: 'partenaire@gestion.bj',
      password: 'Pass2026!',
      role: 'associe',
      created_at: new Date().toISOString(),
    };
    localStorage.setItem('gfi_team_users', JSON.stringify([teamUser]));
    const profile = await DbService.signIn('partenaire@gestion.bj', 'Pass2026!');
    expect(profile.email).toBe('partenaire@gestion.bj');
    expect(profile.role).toBe('associe');
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('est insensible à la casse de l\'email pour gfi_team_users', async () => {
    const teamUser = {
      id: 'team-2',
      email: 'partenaire@gestion.bj',
      password: 'Pass2026!',
      role: 'associe',
      created_at: new Date().toISOString(),
    };
    localStorage.setItem('gfi_team_users', JSON.stringify([teamUser]));
    const profile = await DbService.signIn('PARTENAIRE@GESTION.BJ', 'Pass2026!');
    expect(profile.email).toBe('partenaire@gestion.bj');
  });

  it('rejette des identifiants inconnus', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null },
      error: { status: 400, message: 'Invalid login credentials' },
    } as any);
    await expect(
      DbService.signIn('inconnu@example.com', 'mauvais-mdp')
    ).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────
// SUITE : signOut
// ─────────────────────────────────────────────
describe('DbService.signOut', () => {
  it('supprime la session locale après déconnexion', async () => {
    sessionStorage.setItem('gfi_session', JSON.stringify({ id: '1', email: 'x@x.com', role: 'employe' }));
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as any);
    await DbService.signOut();
    expect(sessionStorage.getItem('gfi_session')).toBeNull();
    expect(sessionStorage.getItem('gfi_is_fallback')).toBeNull();
  });
});
