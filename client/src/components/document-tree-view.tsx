import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Section {
  id: number;
  documentId: number;
  title: string;
  description: string | null;
  order: number;
  parentId: number | null;
  isModule: boolean;
}

interface DocumentTreeViewProps {
  documentId: string;
  onSectionSelect?: (section: Section) => void;
  selectedSectionId?: number;
}

export default function DocumentTreeView({ 
  documentId, 
  onSectionSelect, 
  selectedSectionId 
}: DocumentTreeViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: sections, isLoading } = useQuery<Section[]>({
    queryKey: [`/api/documents/${documentId}/sections`],
    enabled: !!documentId && documentId !== 'new',
  });
  
  const createSectionMutation = useMutation({
    mutationFn: async (sectionData: any) => {
      const res = await apiRequest('POST', '/api/sections', sectionData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/sections`] });
      toast({
        title: "Successo",
        description: "Sezione creata con successo"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante la creazione della sezione: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  const addNewSection = (parentId: number | null = null) => {
    if (!documentId || documentId === 'new') return;
    
    const numSections = sections?.filter(s => s.parentId === parentId).length || 0;
    
    createSectionMutation.mutate({
      documentId: parseInt(documentId),
      title: parentId ? "Nuovo passo" : "Nuova sezione",
      description: "",
      order: numSections,
      parentId,
      isModule: false
    });
  };
  
  if (isLoading || !sections) {
    return <div className="p-4 text-sm text-neutral-medium">Caricamento struttura...</div>;
  }
  
  // Organize sections into a hierarchical structure
  const rootSections = sections.filter(section => !section.parentId)
    .sort((a, b) => a.order - b.order);
    
  const childSections = sections.filter(section => section.parentId)
    .sort((a, b) => a.order - b.order);
  
  const renderSection = (section: Section) => {
    const children = childSections.filter(child => child.parentId === section.id);
    const isFolder = children.length > 0;
    const isActive = selectedSectionId === section.id;
    
    return (
      <div key={section.id}>
        <div 
          className={`tree-item ${isActive ? 'tree-item-active' : ''} px-2 py-1 rounded-sm my-1 flex items-center justify-between group cursor-pointer`}
          onClick={() => onSectionSelect && onSectionSelect(section)}
        >
          <div className="flex items-center">
            <span className={`material-icons text-sm mr-1 ${isActive ? 'text-primary' : 'text-neutral-medium'}`}>
              {isFolder ? 'folder' : 'article'}
            </span>
            <span>{section.title}</span>
          </div>
          
          <button 
            className="hidden group-hover:inline-flex text-neutral-medium hover:text-neutral-dark"
            onClick={(e) => {
              e.stopPropagation();
              addNewSection(section.id);
            }}
          >
            <span className="material-icons text-sm">add</span>
          </button>
        </div>
        
        {isFolder && (
          <div className="pl-4">
            {children.map(child => (
              <div 
                key={child.id} 
                className={`tree-item ${selectedSectionId === child.id ? 'tree-item-active' : ''} px-2 py-1 rounded-sm my-1 flex items-center cursor-pointer`}
                onClick={() => onSectionSelect && onSectionSelect(child)}
              >
                <span className={`material-icons text-sm mr-1 ${selectedSectionId === child.id ? 'text-primary' : 'text-neutral-medium'}`}>
                  label
                </span>
                <span>{child.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="tree-view pl-1 text-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm text-neutral-dark">STRUTTURA DOCUMENTO</h3>
        <button 
          className="text-primary hover:text-primary-dark"
          onClick={() => addNewSection()}
        >
          <span className="material-icons text-sm">add</span>
        </button>
      </div>
      
      {rootSections.map(section => renderSection(section))}
      
      {rootSections.length === 0 && (
        <div className="text-sm text-neutral-medium py-2">
          Nessuna sezione disponibile.
          <button 
            className="block mt-2 text-primary hover:text-primary-dark"
            onClick={() => addNewSection()}
          >
            + Aggiungi sezione
          </button>
        </div>
      )}
    </div>
  );
}
