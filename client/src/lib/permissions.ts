import type { User } from "@shared/schema";

// Tipi di permessi disponibili
export type Permission = "read" | "edit" | "admin" | "translate";

// Ruoli utente con i loro permessi di default
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ["read", "edit", "admin", "translate"], // Accesso completo a tutto
  editor: ["read", "edit"], // Tutto tranne impostazioni
  translator: ["translate"], // Solo traduzioni
  reader: ["read"] // Solo lettura/anteprima
};

// Permessi specifici per azioni
export const ACTION_PERMISSIONS = {
  // Visualizzazione documenti
  viewDocument: ["read", "edit", "admin", "translate"] as Permission[],
  viewDocumentPreview: ["read", "edit", "admin", "translate"] as Permission[],
  
  // Modifica documenti
  editDocument: ["edit", "admin"] as Permission[],
  createDocument: ["edit", "admin"] as Permission[],
  deleteDocument: ["admin"] as Permission[],
  changeDocumentStatus: ["admin"] as Permission[],
  
  // Traduzioni
  accessTranslations: ["translate", "admin"] as Permission[],
  translateDocument: ["translate", "admin"] as Permission[],
  
  // Gestione utenti e impostazioni
  manageUsers: ["admin"] as Permission[],
  accessSettings: ["admin"] as Permission[],
  viewUsers: ["admin"] as Permission[],
  createUser: ["admin"] as Permission[],
  editUser: ["admin"] as Permission[],
  deleteUser: ["admin"] as Permission[],
  
  // Dashboard
  accessDashboard: ["read", "edit", "admin", "translate"] as Permission[],
  accessModulesLibrary: ["edit", "admin"] as Permission[],
  accessComponents: ["edit", "admin"] as Permission[],
  accessBom: ["edit", "admin"] as Permission[]
};

// Verifica se un utente ha un permesso specifico (globale)
export function hasGlobalPermission(user: User | null, requiredPermissions: Permission[]): boolean {
  if (!user || !user.isActive) return false;
  
  // Admin ha sempre tutti i permessi
  if (user.role === 'admin') return true;
  
  // Verifica permessi del ruolo
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
  return requiredPermissions.some(permission => rolePermissions.includes(permission));
}

// Verifica se un utente può eseguire una specifica azione
export function canPerformAction(user: User | null, action: keyof typeof ACTION_PERMISSIONS): boolean {
  if (!user || !user.isActive) return false;
  
  const requiredPermissions = ACTION_PERMISSIONS[action];
  return hasGlobalPermission(user, requiredPermissions);
}

// Verifica se un utente può modificare lo status di un documento
export function canChangeDocumentStatus(user: User | null, documentCreatorId?: number): boolean {
  if (!user || !user.isActive) return false;
  
  // Solo admin può modificare status
  return user.role === 'admin';
}

// Funzioni specifiche per ogni ruolo
export function isTranslatorOnly(user: User | null): boolean {
  return user?.role === 'translator' && user?.isActive === true;
}

export function isReaderOnly(user: User | null): boolean {
  return user?.role === 'reader' && user?.isActive === true;
}

// Verifica accesso alle diverse sezioni della dashboard
export function canAccessDashboardSection(user: User | null, section: string): boolean {
  if (!user || !user.isActive) return false;
  
  switch (section) {
    case 'documents':
      return canPerformAction(user, 'accessDashboard');
    case 'translations':
      return canPerformAction(user, 'accessTranslations');
    case 'users':
      return canPerformAction(user, 'manageUsers');
    case 'settings':
      return canPerformAction(user, 'accessSettings');
    case 'modules':
      return canPerformAction(user, 'accessModulesLibrary');
    case 'components':
      return canPerformAction(user, 'accessComponents');
    case 'bom':
      return canPerformAction(user, 'accessBom');
    default:
      return false;
  }
}

// Verifica se un utente può accedere a un documento
export function canAccessDocument(user: User | null): boolean {
  if (!user || !user.isActive) return false;
  return canPerformAction(user, 'viewDocument');
}

// Verifica se un utente può modificare un documento
export function canEditDocument(user: User | null, documentCreatorId?: number): boolean {
  if (!user || !user.isActive) return false;
  
  // Admin può sempre modificare
  if (user.role === 'admin') return true;
  
  // Editor può modificare se ha i permessi giusti
  if (user.role === 'editor') return true;
  
  // Il creatore può sempre modificare il proprio documento
  if (documentCreatorId && user.id === documentCreatorId) return true;
  
  return false;
}

// Filtra documenti basandosi sui permessi utente
export function filterDocumentsByPermissions<T extends { createdById: number }>(
  documents: T[], 
  user: User | null
): T[] {
  if (!user || !user.isActive) return [];
  
  // Admin vede tutti i documenti
  if (user.role === 'admin') return documents;
  
  // Gli altri vedono solo i documenti che possono leggere
  // Per ora manteniamo la logica semplice: tutti possono vedere tutti i documenti
  // ma con azioni limitate basate sui permessi
  return documents;
}

// Ottiene le azioni disponibili per un utente su un documento
export function getAvailableDocumentActions(user: User | null, documentCreatorId?: number) {
  const actions = {
    canView: canAccessDocument(user),
    canEdit: canEditDocument(user, documentCreatorId),
    canChangeStatus: canChangeDocumentStatus(user, documentCreatorId),
    canDelete: user?.role === 'admin',
    canTranslate: canPerformAction(user, 'translateDocument'),
    canManagePermissions: user?.role === 'admin'
  };
  
  return actions;
}

// Messaggio di errore per permessi insufficienti
export function getPermissionErrorMessage(action: string): string {
  return `Non hai i permessi necessari per ${action}. Contatta un amministratore se credi che sia un errore.`;
}

// Verifica se l'utente corrente è un amministratore
export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin' && user?.isActive === true;
}

// Verifica se l'utente corrente può gestire altri utenti
export function canManageUsers(user: User | null): boolean {
  return isAdmin(user);
}