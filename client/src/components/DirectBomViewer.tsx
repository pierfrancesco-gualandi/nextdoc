import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DirectBomViewerProps {
  bomId: number;
  filteredCodes?: string[];
  title?: string;
  headers?: {
    number?: string;
    level?: string;
    code?: string;
    description?: string;
    quantity?: string;
  };
  codeFilter?: string;
  levelFilter?: number;
}

// Componente BOM a basso livello per mostrare componenti filtrati nella sezione 3.1 Sicurezza
export default function DirectBomViewer({
  bomId,
  filteredCodes = ["A8B25040509", "A8C614-31", "A8C624-54", "A8C624-55", "A8C815-45", "A8C815-48", "A8C815-61", "A8C910-7", "A8C942-67"],
  title = "Elenco Componenti",
  headers = {
    number: "N°",
    level: "Livello",
    code: "Codice",
    description: "Descrizione",
    quantity: "Quantità"
  },
  codeFilter = "A5B03532",
  levelFilter = 3
}: DirectBomViewerProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Carica i dati direttamente all'avvio
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Carica gli elementi della BOM direttamente
        const response = await fetch(`/api/boms/${bomId}/items`);
        if (!response.ok) {
          throw new Error(`Errore nel caricamento degli elementi BOM: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`DirectBomViewer - Caricati ${data.length} elementi BOM`);
        setItems(data);
      } catch (error) {
        console.error("Errore nel caricamento dei dati BOM:", error);
        toast({
          title: "Errore",
          description: "Impossibile caricare i dati della distinta base",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [bomId, toast]);
  
  // Filtra gli elementi in base ai codici specificati
  const filteredItems = React.useMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    
    // Se abbiamo una lista esplicita di codici, usa quella per filtrare
    if (filteredCodes && filteredCodes.length > 0) {
      console.log("DirectBomViewer - Uso filtro esplicito con", filteredCodes.length, "codici");
      return items.filter(item => 
        item.component && filteredCodes.includes(item.component.code)
      );
    }
    
    // Altrimenti filtra per livello e codice
    console.log("DirectBomViewer - Uso filtro di livello", levelFilter, "e codice", codeFilter);
    return items.filter(item => 
      item.component && 
      item.level === levelFilter && 
      (item.parentCode === codeFilter || 
       items.some(parent => 
         parent.component && 
         parent.component.code === codeFilter && 
         parent.level < item.level
       ))
    );
  }, [items, filteredCodes, levelFilter, codeFilter]);
  
  // Se sta caricando
  if (isLoading) {
    return <div className="p-4 text-center">Caricamento elenco componenti...</div>;
  }
  
  // Se non ci sono elementi
  if (!filteredItems || filteredItems.length === 0) {
    return (
      <div className="p-4">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <div className="text-center py-4">Nessun componente trovato</div>
      </div>
    );
  }
  
  // Altrimenti mostra la tabella
  return (
    <div className="p-4">
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <Table className="w-full border-collapse">
        <TableHeader>
          <TableRow className="bg-neutral-lightest">
            <TableHead className="font-medium p-2 border border-neutral-light text-left w-12">
              {headers.number}
            </TableHead>
            <TableHead className="font-medium p-2 border border-neutral-light text-left w-20">
              {headers.level}
            </TableHead>
            <TableHead className="font-medium p-2 border border-neutral-light text-left">
              {headers.code}
            </TableHead>
            <TableHead className="font-medium p-2 border border-neutral-light text-left">
              {headers.description}
            </TableHead>
            <TableHead className="font-medium p-2 border border-neutral-light text-right w-24">
              {headers.quantity}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredItems.map((item, index) => (
            <TableRow key={`${item.id}-${index}`} className="hover:bg-neutral-lightest">
              <TableCell className="p-2 border border-neutral-light">
                {index + 1}
              </TableCell>
              <TableCell className="p-2 border border-neutral-light">
                {item.level}
              </TableCell>
              <TableCell className="p-2 border border-neutral-light font-medium">
                {item.component?.code}
              </TableCell>
              <TableCell className="p-2 border border-neutral-light">
                {item.component?.description}
              </TableCell>
              <TableCell className="p-2 border border-neutral-light text-right">
                {item.quantity}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}