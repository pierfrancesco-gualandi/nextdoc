import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { exportToHtml, exportToPdf } from "@/lib/file-export";
import { useToast } from "@/hooks/use-toast";

interface ExportDropdownProps {
  documentId?: string;
}

export function ExportDropdown({ documentId }: ExportDropdownProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

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
    
    try {
      switch(format) {
        case 'html':
          await exportToHtml(documentId);
          break;
        case 'pdf':
          await exportToPdf(documentId);
          break;
        case 'word':
          // Not implemented yet
          toast({
            title: "Funzionalità in arrivo",
            description: "L'esportazione in formato Word sarà disponibile a breve"
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

  return (
    <div className="dropdown relative">
      <Button 
        variant="outline" 
        disabled={isExporting}
        className="bg-neutral-light hover:bg-neutral-light/80 px-3 py-1.5 rounded-md flex items-center text-sm"
      >
        <span className="material-icons text-sm mr-1">file_download</span>
        Esporta
        <span className="material-icons text-sm ml-1">arrow_drop_down</span>
      </Button>
      <div className="dropdown-content bg-white mt-2 rounded shadow-lg">
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
    </div>
  );
}
