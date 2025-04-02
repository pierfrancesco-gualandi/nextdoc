import { apiRequest } from "./queryClient";

export interface CreateDocumentVersionParams {
  documentId: number;
  version: string;
  content: any;
  createdById: number;
  notes?: string;
}

/**
 * Creates a new version of a document
 */
export async function createDocumentVersion(params: CreateDocumentVersionParams) {
  const res = await apiRequest('POST', '/api/versions', params);
  return await res.json();
}

/**
 * Fetches the entire document with all sections and content modules
 */
export async function getFullDocument(documentId: string) {
  const document = await fetchDocumentData(documentId);
  const sections = await fetchSectionsData(documentId);
  
  // For each section, fetch its content modules
  const sectionsWithContent = await Promise.all(sections.map(async (section) => {
    const modules = await fetchContentModules(section.id);
    return {
      ...section,
      modules
    };
  }));
  
  return {
    ...document,
    sections: sectionsWithContent
  };
}

/**
 * Fetches document data
 */
async function fetchDocumentData(documentId: string) {
  const res = await fetch(`/api/documents/${documentId}`, {
    credentials: 'include'
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch document: ${res.status} ${res.statusText}`);
  }
  
  return await res.json();
}

/**
 * Fetches sections for a document
 */
async function fetchSectionsData(documentId: string) {
  const res = await fetch(`/api/documents/${documentId}/sections`, {
    credentials: 'include'
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch sections: ${res.status} ${res.statusText}`);
  }
  
  return await res.json();
}

/**
 * Fetches content modules for a section
 */
async function fetchContentModules(sectionId: number) {
  const res = await fetch(`/api/sections/${sectionId}/modules`, {
    credentials: 'include'
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch content modules: ${res.status} ${res.statusText}`);
  }
  
  return await res.json();
}

/**
 * Compare two document versions
 */
export function compareDocumentVersions(versionA: any, versionB: any) {
  // This would be a more complex implementation
  // For now, we'll just return a basic comparison
  const differences = [];
  
  // Compare basic document properties
  if (versionA.content.title !== versionB.content.title) {
    differences.push({
      type: 'title',
      before: versionA.content.title,
      after: versionB.content.title
    });
  }
  
  if (versionA.content.description !== versionB.content.description) {
    differences.push({
      type: 'description',
      before: versionA.content.description,
      after: versionB.content.description
    });
  }
  
  // In a real implementation, we would recursively compare sections and modules
  
  return differences;
}

/**
 * Format document status for display
 */
export function formatDocumentStatus(status: string) {
  switch(status) {
    case "draft": return { label: "Bozza", bgClass: "bg-info bg-opacity-10 text-info" };
    case "in_review": return { label: "In Revisione", bgClass: "bg-info bg-opacity-10 text-info" };
    case "approved": return { label: "Approvato", bgClass: "bg-success bg-opacity-10 text-success" };
    case "obsolete": return { label: "Obsoleto", bgClass: "bg-error bg-opacity-10 text-error" };
    default: return { label: status, bgClass: "bg-info bg-opacity-10 text-info" };
  }
}
