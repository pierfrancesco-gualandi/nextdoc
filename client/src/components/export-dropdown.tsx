import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { exportToHtml, exportToPdf, exportToWord } from "@/lib/document-utils";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { FileTextIcon } from "lucide-react";

interface ExportDropdownProps {
  documentId?: string;
  selectedLanguage?: string;
}

export function ExportDropdown({ documentId, selectedLanguage }: ExportDropdownProps) {
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
      // Usa la lingua selezionata per l'esportazione se è diversa dall'originale
      const languageToUse = selectedLanguage && selectedLanguage !== '0' ? selectedLanguage : undefined;
      console.log(`Esportazione in formato ${format} con lingua: ${languageToUse || 'originale'}`);
      
      switch(format) {
        case 'html':
          await exportToHtml(documentId, languageToUse);
          break;
        case 'pdf':
          await exportToPdf(documentId, languageToUse);
          break;
        case 'word':
          await exportToWord(documentId, languageToUse);
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
        <div className="absolute right-0 mt-2 bg-white rounded shadow-lg z-50 min-w-[200px]">
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
            <span className="material-icons text-sm mr-2">file_download</span>
            PDF
          </button>
          <button 
            onClick={() => handleExport('word')}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-lightest"
          >
            <span className="material-icons text-sm mr-2">description</span>
            Word
          </button>
          
          <div className="border-t border-neutral-light my-1"></div>
          
          {documentId && (
            <>
              <Link 
                href={`/document/${documentId}/translate`}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-lightest"
              >
                <FileTextIcon className="inline-block h-4 w-4 mr-2" />
                Traduci documento
              </Link>
              <Link 
                href={`/document/${documentId}/export-translations`}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-lightest"
              >
                <span className="material-icons text-sm mr-2">translate</span>
                Esporta/Importa Traduzioni
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
