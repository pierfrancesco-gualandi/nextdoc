import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useDrag, useDrop } from "react-dnd";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trash2 } from "lucide-react";

interface Section {
  id: number;
  documentId: number;
  title: string;
  description: string | null;
  order: number;
  parentId: number | null;
  isModule: boolean;
}

interface SectionComponentLink {
  id: number;
  sectionId: number;
  componentId: number;
  quantity: number;
  notes: string | null;
  component?: {
    id: number;
    code: string;
    description: string;
  };
}

interface SectionTranslation {
  id: number;
  sectionId: number;
  languageId: number;
  title: string;
  description: string | null;
  status: string;
  translatedById: number | null;
  reviewedById: number | null;
  updatedAt: string;
  components?: SectionComponentLink[];
  section?: Section;
}

interface DocumentTreeViewProps {
  documentId: string;
  onSectionSelect?: (section: Section) => void;
  selectedSectionId?: number;
}

type DragItem = {
  type: string;
  id: number;
  originalParentId: number | null;
  originalIndex: number;
};

// TrashBin component to be used inside DndProvider context
interface TrashBinProps {
  showTrashBin: boolean;
  onDeleteRequest: (id: number) => void;
}

function TrashBin({ showTrashBin, onDeleteRequest }: TrashBinProps) {
  const [draggedOverTrash, setDraggedOverTrash] = useState(false);

  // Handle trash drop
  const [{ isOverTrash }, trashDrop] = useDrop({
    accept: 'SECTION',
    drop(item: DragItem) {
      onDeleteRequest(item.id);
    },
    hover() {
      setDraggedOverTrash(true);
    },
    collect: (monitor) => ({
      isOverTrash: monitor.isOver()
    })
  });

  if (!showTrashBin) return null;

  return (
    <div 
      ref={trashDrop}
      className={`
        fixed bottom-4 right-4 z-50
        w-14 h-14 flex items-center justify-center 
        rounded-full shadow-lg
        transition-all duration-200
        ${draggedOverTrash || isOverTrash 
          ? 'bg-red-600 scale-110' 
          : 'bg-neutral-800'}
      `}
    >
      <Trash2 
        className={`
          w-6 h-6
          ${draggedOverTrash || isOverTrash ? 'text-white' : 'text-white opacity-80'}
        `}
      />
    </div>
  );
}

export default function DocumentTreeView({ 
  documentId, 
  onSectionSelect, 
  selectedSectionId 
}: DocumentTreeViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTrashBin, setShowTrashBin] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<number | null>(null);
  
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
  
  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await apiRequest('PUT', `/api/sections/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/sections`] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'aggiornamento della sezione: ${error}`,
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
  
  const moveSection = (sectionId: number, newParentId: number | null, newOrder: number) => {
    if (!sections) return;
    
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    console.log(`Spostando sezione ${sectionId} (${section.title}) verso parentId=${newParentId}, order=${newOrder}`);
    
    // Verifica se stiamo spostando una sezione all'interno dello stesso livello
    // o se stiamo cambiando il parent
    const isChangingParent = section.parentId !== newParentId;
    
    // Se stiamo cambiando il parent, dobbiamo ricalcolare correttamente l'ordine
    if (isChangingParent) {
      // Troviamo tutte le sezioni che sono allo stesso livello della destinazione
      const destinationSiblings = sections.filter(s => s.parentId === newParentId);
      
      // Verifica se c'è già una sezione con lo stesso order a quel livello
      const hasSameOrder = destinationSiblings.some(s => s.order === newOrder && s.id !== sectionId);
      
      if (hasSameOrder) {
        // Se c'è un conflitto di ordine, imposta l'ordine alla fine
        newOrder = destinationSiblings.length;
        console.log(`Rilevato conflitto di ordine, nuovo ordine: ${newOrder}`);
      }
      
      // Aggiorniamo gli ordini di tutte le sezioni che verranno dopo la sezione spostata
      if (destinationSiblings.length > 0) {
        console.log(`Destinazione ha ${destinationSiblings.length} fratelli. Ricalcolo ordini.`);
      }
    }
    
    // Verifica se stiamo tentando di rendere una sezione figlio di se stessa (ciclo)
    if (sectionId === newParentId) {
      console.error("Non è possibile rendere una sezione figlio di se stessa");
      toast({
        title: "Operazione non consentita",
        description: "Non è possibile rendere una sezione figlio di se stessa",
        variant: "destructive"
      });
      return;
    }
    
    // Caso speciale: qualsiasi sezione che diventa figlio di una sezione con lo stesso order
    const targetSection = sections.find(s => s.id === newParentId);
    if (targetSection && section.order === targetSection.order) {
      console.log(`Caso speciale: spostamento tra sezioni con stesso ordine (${section.order})`);
      
      // In questo caso forziamo un ordine più specifico
      updateSectionMutation.mutate({
        id: sectionId,
        data: {
          parentId: newParentId,
          order: 0, // Diventa il primo figlio
          title: section.title // Mantiene lo stesso titolo
        }
      });
      return;
    }
    
    // Esecuzione normale
    updateSectionMutation.mutate({
      id: sectionId,
      data: {
        parentId: newParentId,
        order: newOrder
      }
    });
  };
  
  // Delete section mutation
  const deleteSectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/sections/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/sections`] });
      toast({
        title: "Successo",
        description: "Sezione eliminata con successo"
      });
      setSectionToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'eliminazione della sezione: ${error}`,
        variant: "destructive"
      });
    }
  });

  // Monitor drag events to show trash bin
  useEffect(() => {
    const handleDragStart = () => setShowTrashBin(true);
    const handleDragEnd = () => {
      setShowTrashBin(false);
    };

    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  const handleDeleteSection = () => {
    if (sectionToDelete) {
      deleteSectionMutation.mutate(sectionToDelete);
    }
  };

  if (isLoading || !sections) {
    return <div className="p-4 text-sm text-neutral-medium">Caricamento struttura...</div>;
  }

  return (
    <div className="tree-view pl-1 text-sm w-full">
      <div className="flex items-center justify-between mb-2 sticky top-0 bg-white z-10 pr-1">
        <h3 className="font-medium text-sm text-neutral-dark whitespace-nowrap">STRUTTURA DOCUMENTO</h3>
        <button 
          className="text-primary hover:text-primary-dark"
          onClick={() => addNewSection()}
        >
          <span className="material-icons text-sm">add</span>
        </button>
      </div>
      
      <div className="overflow-y-auto max-h-[calc(100vh-200px)] pr-2 scrollbar-thin always-show-scrollbar-x">
        <SectionTree 
          sections={sections} 
          parentId={null} 
          level={0} 
          selectedSectionId={selectedSectionId}
          onSectionSelect={onSectionSelect}
          onAddSection={addNewSection}
          onMoveSection={moveSection}
          documentId={documentId}
        />
        
        {sections.filter(s => !s.parentId).length === 0 && (
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

      {/* Trash bin component for deleting sections via drag & drop */}
      <TrashBin 
        showTrashBin={showTrashBin} 
        onDeleteRequest={setSectionToDelete} 
      />

      {/* Confirmation dialog before deleting */}
      <AlertDialog open={sectionToDelete !== null} onOpenChange={(open) => !open && setSectionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa sezione?
              {sections.find(s => s.id === sectionToDelete)?.title && (
                <strong className="block mt-2">
                  "{sections.find(s => s.id === sectionToDelete)?.title}"
                </strong>
              )}
              {sections.some(s => s.parentId === sectionToDelete) && (
                <span className="block mt-1 text-red-500">
                  Attenzione: eliminando questa sezione verranno eliminate anche tutte le sue sottosezioni!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteSection}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface SectionTreeProps {
  sections: Section[];
  parentId: number | null;
  level: number;
  selectedSectionId?: number;
  onSectionSelect?: (section: Section) => void;
  onAddSection: (parentId: number | null) => void;
  onMoveSection: (sectionId: number, newParentId: number | null, newOrder: number) => void;
  documentId: string;
}

function SectionTree({ 
  sections, 
  parentId, 
  level, 
  selectedSectionId, 
  onSectionSelect, 
  onAddSection,
  onMoveSection,
  documentId
}: SectionTreeProps) {
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const dropAreaRef = useRef<HTMLDivElement>(null);
  
  // Handle component links
  const { data: sectionComponents } = useQuery<SectionComponentLink[]>({
    queryKey: [`/api/sections/${parentId}/components`],
    enabled: !!parentId && level > 0,
  });

  const currentLevelSections = sections
    .filter(section => section.parentId === parentId)
    .sort((a, b) => a.order - b.order);

  const toggleExpand = (sectionId: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const hasSectionChildren = (sectionId: number) => {
    return sections.some(section => section.parentId === sectionId);
  };

  const getSectionComponentsLabel = (sectionId: number) => {
    if (!sectionComponents) return null;
    
    const links = sectionComponents.filter(link => link.sectionId === sectionId);
    if (links.length === 0) return null;
    
    return (
      <div className="mt-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full inline-flex items-center">
        <span className="material-icons text-xs mr-1">link</span>
        {links.length} componenti
      </div>
    );
  };

  // Add a drop area for root level in empty areas
  const [{ isOverEmptyArea }, dropEmptyArea] = useDrop({
    accept: 'SECTION',
    drop(item: DragItem) {
      // Calcola quante sezioni ci sono a questo livello per inserire alla fine
      const numSectionsAtThisLevel = sections.filter(s => s.parentId === parentId).length;
      // Usa l'ultimo ordine disponibile (lunghezza totale delle sezioni a questo livello)
      const newOrder = numSectionsAtThisLevel;
      console.log(`Drop in area vuota: inserimento alla fine con order=${newOrder}, parentId=${parentId}`);
      onMoveSection(item.id, parentId, newOrder);
    },
    collect: (monitor) => ({
      isOverEmptyArea: monitor.isOver(),
    }),
  });

  return (
    <div className={level > 0 ? "pl-4" : ""}>
      {currentLevelSections.map((section, index) => (
        <SectionItem
          key={section.id}
          section={section}
          index={index}
          level={level}
          isSelected={selectedSectionId === section.id}
          isExpanded={expandedSections[section.id] || false}
          hasChildren={hasSectionChildren(section.id)}
          onToggleExpand={() => toggleExpand(section.id)}
          onSelect={() => onSectionSelect && onSectionSelect(section)}
          onAddChild={() => onAddSection(section.id)}
          onMove={onMoveSection}
          parentId={parentId}
          componentsLabel={getSectionComponentsLabel(section.id)}
          sections={sections}
        >
          {(expandedSections[section.id] || level < 1) && hasSectionChildren(section.id) && (
            <SectionTree
              sections={sections}
              parentId={section.id}
              level={level + 1}
              selectedSectionId={selectedSectionId}
              onSectionSelect={onSectionSelect}
              onAddSection={onAddSection}
              onMoveSection={onMoveSection}
              documentId={documentId}
            />
          )}
        </SectionItem>
      ))}
      
      {/* Aggiungi un'area di drop vuota dopo tutte le sezioni */}
      {level === 0 && (
        <div 
          ref={dropEmptyArea}
          className={`
            min-h-20 mt-2 rounded-md border-2
            ${isOverEmptyArea 
              ? 'border-primary border-dashed bg-primary/10' 
              : 'border-transparent'}
            ${currentLevelSections.length === 0 ? 'h-32' : 'h-20'}
            transition-colors duration-200 flex items-center justify-center
          `}
        >
          {isOverEmptyArea && (
            <div className="text-sm text-neutral-dark flex flex-col items-center">
              <span className="material-icons mb-1">arrow_downward</span>
              Trascina qui per portare la sezione al primo livello
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SectionItemProps {
  section: Section;
  index: number;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  onAddChild: () => void;
  onMove: (sectionId: number, newParentId: number | null, newOrder: number) => void;
  parentId: number | null;
  children?: React.ReactNode;
  componentsLabel: React.ReactNode;
  sections: Section[]; // Aggiunta dell'array delle sezioni per l'analisi gerarchica
}

function SectionItem({
  section,
  index,
  level,
  isSelected,
  isExpanded,
  hasChildren,
  onToggleExpand,
  onSelect,
  onAddChild,
  onMove,
  parentId,
  children,
  componentsLabel,
  sections
}: SectionItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  // Set up drag and drop
  const [{ isDragging }, drag] = useDrag({
    type: 'SECTION',
    item: { 
      type: 'SECTION',
      id: section.id,
      originalParentId: section.parentId,
      originalIndex: index
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });
  
  const [{ isOver }, drop] = useDrop({
    accept: 'SECTION',
    hover(item: DragItem, monitor) {
      if (!ref.current) return;
      
      const draggedId = item.id;
      const hoveredId = section.id;
      
      // Don't replace items with themselves
      if (draggedId === hoveredId) return;
      
      // Don't allow a section to become its own child
      // This would be needed if we were to allow drop on the section rather than between sections
    },
    drop(item: DragItem) {
      if (item.id === section.id) return;
      
      // When dropping on a section, place it as the next sibling
      const newOrder = index;
      onMove(item.id, parentId, newOrder);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });
  
  const [{ isOverTop }, dropTop] = useDrop({
    accept: 'SECTION',
    hover(item: DragItem, monitor) {
      if (!ref.current) return;
      
      // Check if hovering near the top of the item
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset?.y || 0) - hoverBoundingRect.top;
      
      if (hoverClientY > hoverMiddleY) return;
    },
    drop(item: DragItem) {
      if (item.id === section.id) return;
      
      // When dropping above a section, place it as the previous sibling
      onMove(item.id, parentId, index);
    },
    collect: (monitor) => ({
      isOverTop: monitor.isOver(),
    }),
  });
  
  const [{ isOverBottom }, dropBottom] = useDrop({
    accept: 'SECTION',
    hover(item: DragItem, monitor) {
      if (!ref.current) return;
      
      // Check if hovering near the bottom of the item
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset?.y || 0) - hoverBoundingRect.top;
      
      if (hoverClientY < hoverMiddleY) return;
    },
    drop(item: DragItem) {
      if (item.id === section.id) return;
      
      // When dropping below a section, place it as the next sibling
      onMove(item.id, parentId, index + 1);
    },
    collect: (monitor) => ({
      isOverBottom: monitor.isOver(),
    }),
  });
  
  const [{ isOverChild }, dropChild] = useDrop({
    accept: 'SECTION',
    hover() {
      // Se la sezione non è espansa ma stiamo trascinando su di essa,
      // la espandiamo automaticamente per facilitare il drop
      if (!isExpanded) {
        onToggleExpand();
      }
    },
    drop(item: DragItem, monitor) {
      if (item.id === section.id) return;
      
      // Verifica che non stiamo cercando di spostare un padre come figlio di un suo figlio
      // che creerebbe un ciclo nella gerarchia
      const isParentOf = (parentId: number | null, childId: number): boolean => {
        if (!parentId) return false;
        const child = sections.find(s => s.id === childId);
        if (!child) return false;
        return child.id === parentId || isParentOf(child.parentId, parentId);
      };
      
      if (isParentOf(item.id, section.id)) {
        console.error("Non puoi spostare una sezione come figlio di una sua sottosezione");
        return;
      }
      
      // When dropping ON a section, make the dragged section a CHILD of this section
      // Find how many children this section already has to calculate the order
      const childrenCount = sections.filter(s => s.parentId === section.id).length;
      
      // For this specific section, make sure to do a direct database update
      console.log(`Sezione ${item.id} trascinata su sezione ${section.id} (${section.title}): diventa un figlio con ordine ${childrenCount}`);
      
      // Usa semplicemente il metodo onMove che è stato passato dal componente parent
      onMove(item.id, section.id, childrenCount); 
      
      // Forza l'espansione
      if (!isExpanded) {
        onToggleExpand();
      }
    },
    collect: (monitor) => ({
      isOverChild: monitor.isOver(),
    }),
  });
  
  // Connect the drop ref with the drag ref
  drag(drop(ref));

  // Calculate padding based on level
  const levelPadding = level > 0 ? `${Math.min(level * 0.5, 5)}rem` : '0';
  
  return (
    <div
      className={`relative ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      ref={ref}
    >
      {/* Drop zone indicator for top */}
      {isOverTop && (
        <div 
          ref={dropTop}
          className="absolute top-0 left-0 w-full h-1 bg-primary z-10"
        />
      )}
      
      <div 
        className={`
          tree-item 
          ${isSelected ? 'tree-item-active bg-gray-100' : ''} 
          px-2 py-1 my-1 
          flex flex-col 
          rounded-sm 
          transition-colors 
          duration-100
          ${isOver ? 'bg-gray-200' : ''}
        `}
        style={{ paddingLeft: levelPadding }}
      >
        <div 
          className={`flex items-center justify-between group cursor-pointer min-w-[280px] gap-0 ${isSelected ? 'bg-gray-100' : ''}`}
          onClick={onSelect}
        >
          <div className={`flex items-center flex-grow min-w-[180px] relative ${isOverChild ? 'bg-primary-light/10 rounded-sm px-1' : ''}`}>
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className="text-neutral-medium focus:outline-none"
              >
                <span className="material-icons text-sm">
                  {isExpanded ? 'expand_more' : 'chevron_right'}
                </span>
              </button>
            )}
            
            <span 
              className={`
                material-icons text-sm 
                ${isSelected ? 'text-primary' : 'text-neutral-medium'}
                ${isOverChild ? 'text-primary' : ''}
              `}
            >
              {hasChildren ? 'folder' : 'article'}
            </span>
            
            <span className={`truncate max-w-[150px] min-w-0 ${isOverChild ? 'text-primary font-medium' : ''}`}>
              {section.title}
              {isOverChild && 
                <span className="ml-1 text-xs bg-primary text-white px-1 py-0.5 rounded-sm whitespace-nowrap">
                  Trascina qui
                </span>
              }
            </span>
            
            {componentsLabel}
          </div>
          
          <div className="flex items-center min-w-[90px] justify-end" onClick={e => e.stopPropagation()}>
            <button 
              className="text-neutral-medium hover:text-neutral-dark p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                // Sposta la sezione verso l'alto (diminuisci order)
                if (index > 0) {
                  onMove(section.id, parentId, index - 1);
                }
              }}
              title="Sposta in alto"
              disabled={index === 0}
            >
              <span className="material-icons text-sm">keyboard_arrow_up</span>
            </button>
            <button 
              className="text-neutral-medium hover:text-neutral-dark p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                // Sposta la sezione verso il basso (aumenta order)
                onMove(section.id, parentId, index + 1);
              }}
              title="Sposta in basso"
            >
              <span className="material-icons text-sm">keyboard_arrow_down</span>
            </button>
            <button 
              className="text-neutral-medium hover:text-neutral-dark p-0.5"
              onClick={onAddChild}
              title="Aggiungi sottosezione"
            >
              <span className="material-icons text-sm">add</span>
            </button>
            
            {/* Menu contestuale per lo spostamento delle sezioni */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="text-neutral-medium hover:text-neutral-dark p-0.5 focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                  title="Opzioni di spostamento"
                >
                  <span className="material-icons text-sm">more_vert</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Sposta sezione</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Opzione speciale per lo spostamento sotto la Sezione 3 */}
                <DropdownMenuItem 
                  onClick={() => {
                    const sezione3 = sections.find(s => s.id === 12); // Sezione 3 ha ID 12
                    if (sezione3) {
                      // Conteggio sezioni figlie esistenti
                      const figliSezione3 = sections.filter(s => s.parentId === 12);
                      onMove(section.id, 12, figliSezione3.length);
                    }
                  }}
                  className="cursor-pointer flex items-center"
                >
                  <span className="material-icons text-sm mr-2">input</span>
                  Sposta sotto "Sezione 3"
                </DropdownMenuItem>
                
                {level > 0 && (
                  <DropdownMenuItem 
                    onClick={() => {
                      // Sposta fuori dalla gerarchia attuale (livello superiore)
                      const sezioniPrincipali = sections.filter(s => !s.parentId);
                      onMove(section.id, null, sezioniPrincipali.length);
                    }}
                    className="cursor-pointer flex items-center"
                  >
                    <span className="material-icons text-sm mr-2">output</span>
                    Sposta al livello principale
                  </DropdownMenuItem>
                )}
                
                {/* Opzioni per spostare sotto altre sezioni principali */}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Sposta sotto...</DropdownMenuLabel>
                {sections
                  .filter(s => !s.parentId && s.id !== section.id)
                  .sort((a, b) => a.order - b.order)
                  .map(targetSection => (
                    <DropdownMenuItem 
                      key={targetSection.id}
                      onClick={() => {
                        const figliTargetSection = sections.filter(s => s.parentId === targetSection.id);
                        onMove(section.id, targetSection.id, figliTargetSection.length);
                      }}
                      className="cursor-pointer flex items-center"
                    >
                      <span className="material-icons text-sm mr-2">subdirectory_arrow_right</span>
                      {targetSection.title}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <button 
              className="text-neutral-medium hover:text-neutral-dark p-0.5 cursor-move"
              onClick={(e) => e.stopPropagation()}
              title="Trascina per spostare"
            >
              <span className="material-icons text-sm">drag_indicator</span>
            </button>
          </div>
        </div>
        
        {/* Child drop zone - shown in two ways:
            1. Fully displayed when expanded 
            2. Hidden but still droppable when collapsed */}
        <div 
          ref={dropChild}
          className={`
            ${isExpanded ? 'mt-1 pl-6 border-l-2 min-h-[20px]' : 'h-0 overflow-hidden'}
            ${isOverChild ? 'border-primary bg-primary-light/20' : 'border-gray-200'}
            ${!isExpanded && isOverChild ? 'border-primary bg-primary-light/20 h-4 overflow-visible' : ''}
          `}
        >
          {isExpanded && children}
          {!isExpanded && isOverChild && (
            <div className="p-1 text-xs text-primary font-medium">
              Diventerà figlio di questa sezione
            </div>
          )}
        </div>
      </div>
      
      {/* Drop zone indicator for bottom */}
      {isOverBottom && (
        <div 
          ref={dropBottom}
          className="absolute bottom-0 left-0 w-full h-1 bg-primary z-10"
        />
      )}
    </div>
  );
}
