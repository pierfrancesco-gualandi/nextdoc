import type { AuthenticatedUser } from '@/contexts/UserContext';

// Definizione dei ruoli disponibili
export type UserRole = 'admin' | 'editor' | 'translator' | 'reader';

// Interfaccia per la definizione dei permessi
export interface Permission {
  canViewDocuments: boolean;
  canEditDocuments: boolean;
  canCreateDocuments: boolean;
  canDeleteDocuments: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canTranslate: boolean;
  canReviewTranslations: boolean;
  canManageComponents: boolean;
  canViewModulesLibrary: boolean;
  canEditModulesLibrary: boolean;
  canExportDocuments: boolean;
}

// Configurazione dei permessi per ogni ruolo
const rolePermissions: Record<UserRole, Permission> = {
  admin: {
    canViewDocuments: true,
    canEditDocuments: true,
    canCreateDocuments: true,
    canDeleteDocuments: true,
    canManageUsers: true,
    canManageSettings: true,
    canTranslate: true,
    canReviewTranslations: true,
    canManageComponents: true,
    canViewModulesLibrary: true,
    canEditModulesLibrary: true,
    canExportDocuments: true,
  },
  editor: {
    canViewDocuments: true,
    canEditDocuments: true,
    canCreateDocuments: true,
    canDeleteDocuments: true,
    canManageUsers: false,
    canManageSettings: false,
    canTranslate: true,
    canReviewTranslations: true,
    canManageComponents: true,
    canViewModulesLibrary: true,
    canEditModulesLibrary: true,
    canExportDocuments: true,
  },
  translator: {
    canViewDocuments: true,
    canEditDocuments: false,
    canCreateDocuments: false,
    canDeleteDocuments: false,
    canManageUsers: false,
    canManageSettings: false,
    canTranslate: true,
    canReviewTranslations: false,
    canManageComponents: false,
    canViewModulesLibrary: false,
    canEditModulesLibrary: false,
    canExportDocuments: false,
  },
  reader: {
    canViewDocuments: true,
    canEditDocuments: false,
    canCreateDocuments: false,
    canDeleteDocuments: false,
    canManageUsers: false,
    canManageSettings: false,
    canTranslate: false,
    canReviewTranslations: false,
    canManageComponents: false,
    canViewModulesLibrary: false,
    canEditModulesLibrary: false,
    canExportDocuments: false,
  },
};

// Funzione per ottenere i permessi di un utente
export function getUserPermissions(user: AuthenticatedUser | null): Permission {
  if (!user) {
    return rolePermissions.reader; // Permessi minimi per utenti non autenticati
  }

  const role = user.role as UserRole;
  return rolePermissions[role] || rolePermissions.reader;
}

// Funzioni di utilità per verificare permessi specifici
export function canUserEditDocuments(user: AuthenticatedUser | null): boolean {
  return getUserPermissions(user).canEditDocuments;
}

export function canUserManageUsers(user: AuthenticatedUser | null): boolean {
  return getUserPermissions(user).canManageUsers;
}

export function canUserManageSettings(user: AuthenticatedUser | null): boolean {
  return getUserPermissions(user).canManageSettings;
}

export function canUserTranslate(user: AuthenticatedUser | null): boolean {
  return getUserPermissions(user).canTranslate;
}

export function canUserManageComponents(user: AuthenticatedUser | null): boolean {
  return getUserPermissions(user).canManageComponents;
}

export function canUserViewModulesLibrary(user: AuthenticatedUser | null): boolean {
  return getUserPermissions(user).canViewModulesLibrary;
}

export function canUserEditModulesLibrary(user: AuthenticatedUser | null): boolean {
  return getUserPermissions(user).canEditModulesLibrary;
}

// Funzione per verificare se un utente può accedere a una specifica rotta
export function canUserAccessRoute(user: AuthenticatedUser | null, route: string): boolean {
  const permissions = getUserPermissions(user);
  
  switch (route) {
    case '/users':
      return permissions.canManageUsers;
    case '/settings':
      return permissions.canManageSettings;
    case '/translations':
      return permissions.canTranslate;
    case '/modules':
      return permissions.canViewModulesLibrary;
    case '/components':
      return permissions.canManageComponents;
    case '/documents':
      return permissions.canViewDocuments;
    default:
      return true; // Route pubbliche (dashboard, etc.)
  }
}

// Funzione per ottenere le rotte accessibili per un utente
export function getAccessibleRoutes(user: AuthenticatedUser | null): string[] {
  const routes = ['/'];
  const permissions = getUserPermissions(user);
  
  if (permissions.canViewDocuments) routes.push('/documents');
  if (permissions.canViewModulesLibrary) routes.push('/modules');
  if (permissions.canManageComponents) routes.push('/components');
  if (permissions.canTranslate) routes.push('/translations');
  if (permissions.canManageUsers) routes.push('/users');
  if (permissions.canManageSettings) routes.push('/settings');
  
  return routes;
}

// Funzioni legacy per compatibilità con i componenti esistenti
export function canAccessDashboardSection(user: AuthenticatedUser | null, section: string): boolean {
  const permissions = getUserPermissions(user);
  
  switch (section) {
    case 'documents':
      return permissions.canViewDocuments;
    case 'modules':
      return permissions.canViewModulesLibrary;
    case 'components':
      return permissions.canManageComponents;
    case 'translations':
      return permissions.canTranslate;
    case 'users':
      return permissions.canManageUsers;
    case 'settings':
      return permissions.canManageSettings;
    default:
      return true;
  }
}

export function canPerformAction(user: AuthenticatedUser | null, action: string): boolean {
  const permissions = getUserPermissions(user);
  
  switch (action) {
    case 'view-documents':
      return permissions.canViewDocuments;
    case 'edit-documents':
      return permissions.canEditDocuments;
    case 'create-documents':
      return permissions.canCreateDocuments;
    case 'delete-documents':
      return permissions.canDeleteDocuments;
    case 'manage-users':
      return permissions.canManageUsers;
    case 'manage-settings':
      return permissions.canManageSettings;
    case 'translate':
      return permissions.canTranslate;
    case 'review-translations':
      return permissions.canReviewTranslations;
    case 'manage-components':
      return permissions.canManageComponents;
    case 'edit-modules':
      return permissions.canEditModulesLibrary;
    case 'export-documents':
      return permissions.canExportDocuments;
    default:
      return false;
  }
}

export function canChangeDocumentStatus(user: AuthenticatedUser | null): boolean {
  return getUserPermissions(user).canEditDocuments;
}

export function canEditDocument(user: AuthenticatedUser | null): boolean {
  return getUserPermissions(user).canEditDocuments;
}

export function getPermissionErrorMessage(action: string): string {
  switch (action) {
    case 'edit-documents':
      return 'Non hai i permessi per modificare i documenti';
    case 'create-documents':
      return 'Non hai i permessi per creare documenti';
    case 'delete-documents':
      return 'Non hai i permessi per eliminare documenti';
    case 'manage-users':
      return 'Non hai i permessi per gestire gli utenti';
    case 'manage-settings':
      return 'Non hai i permessi per gestire le impostazioni';
    case 'translate':
      return 'Non hai i permessi per tradurre';
    case 'manage-components':
      return 'Non hai i permessi per gestire i componenti';
    default:
      return 'Non hai i permessi per eseguire questa azione';
  }
}