import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { exportToHtml, exportToPdf, exportToWord } from "@/lib/document-utils";
import { useToast } from "@/hooks/use-toast";

interface ExportDropdownProps {
  documentId?: string;
}

export function ExportDropdown({ documentId }: ExportDropdownProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: 'html' | 'pdf' | 'word') => {
    if (!documentId || documentId === 'new') {
      toast({
        title: "Esportazione non disponibile",
        description: "Salva prima il documento per poterlo esportare",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    setIsOpen(false); // Chiudi il menu dopo una selezione
    
    try {
      switch(format) {
        case 'html':
          await exportToHtml(documentId);
          break;
        case 'pdf':
          await exportToPdf(documentId);
          break;
        case 'word':
          await exportToWord(documentId);
          toast({
            title: "Esportazione completata",
            description: "Il documento è stato esportato in formato Word"
          });
          break;
      }
    } catch (error) {
      toast({
        title: "Errore di esportazione",
        description: `Si è verificato un errore durante l'esportazione: ${error}`,
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Gestisce click all'esterno per chiudere il dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button 
        variant="outline" 
        disabled={isExporting}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-neutral-light hover:bg-neutral-light/80 px-3 py-1.5 rounded-md flex items-center text-sm"
      >
        <span className="material-icons text-sm mr-1">file_download</span>
        Esporta
        <span className="material-icons text-sm ml-1">arrow_drop_down</span>
      </Button>
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white rounded shadow-lg z-50 min-w-[160px]">
          <button 
            onClick={() => handleExport('html')}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-lightest"
          >
            <span className="material-icons text-sm mr-2">code</span>
            HTML
          </button>
          <button 
            onClick={() => handleExport('pdf')}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-lightest"
          >
            <span className="material-icons text-sm mr-2">picture_as_pdf</span>
            PDF
          </button>
          <button 
            onClick={() => handleExport('word')}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-lightest"
          >
            <span className="material-icons text-sm mr-2">description</span>
            Word
          </button>
        </div>
      )}
    </div>
  );
}
