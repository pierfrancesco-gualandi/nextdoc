import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BomManagerProps {
  documentId?: string;
}

export default function BomManager({ documentId }: BomManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentBomId, setCurrentBomId] = useState<string>("");
  const [compareBomId, setCompareBomId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [comparisonData, setComparisonData] = useState<any>(null);
  
  // Get BOMs
  const { data: boms, isLoading: bomsLoading } = useQuery({
    queryKey: ['/api/boms'],
  });
  
  // Comparison query
  const { data: comparisonResult, isLoading: comparisonLoading } = useQuery({
    queryKey: [`/api/boms/${currentBomId}/compare/${compareBomId}`],
    enabled: !!currentBomId && !!compareBomId && currentBomId !== compareBomId,
    onSuccess: (data) => {
      setComparisonData(data);
    }
  });
  
  // Add component to BOM mutation
  const addComponentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/bom-items', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/boms/${currentBomId}/items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/boms/${currentBomId}/compare/${compareBomId}`] });
      toast({
        title: "Componente aggiunto",
        description: "Il componente è stato aggiunto con successo alla distinta base"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  const handleAddComponent = (componentId: number, bomId: number) => {
    addComponentMutation.mutate({
      bomId,
      componentId,
      quantity: 1
    });
  };
  
  const compareDistinct = () => {
    if (!currentBomId || !compareBomId) {
      toast({
        title: "Selezione incompleta",
        description: "Seleziona entrambe le distinte da confrontare",
        variant: "destructive"
      });
      return;
    }
    
    // The comparison will be loaded via the useQuery hook when both BOM IDs are set
  };
  
  if (bomsLoading) {
    return <div className="p-4">Caricamento distinte...</div>;
  }
  
  return (
    <div className="p-6">
      <div className="flex mb-4 space-x-4">
        <div className="flex-1">
          <Label className="block text-sm font-medium text-neutral-darkest mb-1">Elenco componenti corrente</Label>
          <Select value={currentBomId} onValueChange={setCurrentBomId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona distinta base" />
            </SelectTrigger>
            <SelectContent>
              {boms && boms.map((bom: any) => (
                <SelectItem key={bom.id} value={bom.id.toString()}>
                  {bom.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="block text-sm font-medium text-neutral-darkest mb-1">Confronta con</Label>
          <Select value={compareBomId} onValueChange={setCompareBomId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona distinta base" />
            </SelectTrigger>
            <SelectContent>
              {boms && boms.map((bom: any) => (
                <SelectItem key={bom.id} value={bom.id.toString()}>
                  {bom.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Button 
        className="mb-4" 
        onClick={compareDistinct}
        disabled={!currentBomId || !compareBomId || currentBomId === compareBomId}
      >
        Confronta elenchi componenti
      </Button>
      
      {comparisonLoading && <div className="my-4">Caricamento confronto...</div>}
      
      {comparisonData && (
        <>
          <div className="border border-neutral-light rounded-md overflow-hidden mb-4">
            <div className="bg-neutral-lightest px-4 py-2 border-b border-neutral-light flex justify-between items-center">
              <span className="text-sm font-medium text-neutral-dark">Componenti Simili</span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex items-center text-xs">
                  <span className="material-icons text-xs mr-1">filter_list</span>
                  Filtra
                </Button>
                <div className="relative">
                  <Input
                    className="text-xs py-1 pl-7 h-8"
                    placeholder="Cerca"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span className="material-icons text-xs absolute left-2 top-1.5 text-neutral-medium">search</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-neutral-lightest border-b border-neutral-light">
                    <th className="py-2 px-3 text-left text-xs font-medium text-neutral-dark">Codice {comparisonData.bom1.title}</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-neutral-dark">Descrizione {comparisonData.bom1.title}</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-neutral-dark">Codice {comparisonData.bom2.title}</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-neutral-dark">Descrizione {comparisonData.bom2.title}</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-neutral-dark">Similitudine</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-neutral-dark">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.similarities
                    .filter((item: any) => {
                      if (!searchTerm) return true;
                      const term = searchTerm.toLowerCase();
                      const code1 = item.item1.component?.code.toLowerCase() || "";
                      const desc1 = item.item1.component?.description.toLowerCase() || "";
                      const code2 = item.item2.component?.code.toLowerCase() || "";
                      const desc2 = item.item2.component?.description.toLowerCase() || "";
                      return code1.includes(term) || desc1.includes(term) || code2.includes(term) || desc2.includes(term);
                    })
                    .map((item: any, index: number) => (
                      <tr key={index} className="border-b border-neutral-light hover:bg-neutral-lightest">
                        <td className="py-2 px-3 text-xs">{item.item1.component?.code}</td>
                        <td className="py-2 px-3 text-xs">{item.item1.component?.description}</td>
                        <td className="py-2 px-3 text-xs">{item.item2.component?.code}</td>
                        <td className="py-2 px-3 text-xs">{item.item2.component?.description}</td>
                        <td className="py-2 px-3 text-xs">
                          <div className="bg-gray-200 rounded-full h-2 w-24">
                            <div className="bg-primary rounded-full h-2" style={{ width: `${item.similarity}%` }}></div>
                          </div>
                          <span className="text-xs text-neutral-medium">{item.similarity}%</span>
                        </td>
                        <td className="py-2 px-3 text-xs">
                          <button className="text-primary hover:text-primary-dark text-xs">Dettagli</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="border border-neutral-light rounded-md overflow-hidden">
            <div className="bg-neutral-lightest px-4 py-2 border-b border-neutral-light">
              <span className="text-sm font-medium text-neutral-dark">Componenti Unici</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-neutral-lightest border-b border-neutral-light">
                    <th className="py-2 px-3 text-left text-xs font-medium text-neutral-dark">Elenco componenti</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-neutral-dark">Codice</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-neutral-dark">Descrizione</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-neutral-dark">Quantità</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-neutral-dark">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.uniqueItems1.map((item: any) => (
                    <tr key={`bom1-${item.id}`} className="border-b border-neutral-light hover:bg-neutral-lightest">
                      <td className="py-2 px-3 text-xs">{comparisonData.bom1.title}</td>
                      <td className="py-2 px-3 text-xs">{item.component?.code}</td>
                      <td className="py-2 px-3 text-xs">{item.component?.description}</td>
                      <td className="py-2 px-3 text-xs">{item.quantity}</td>
                      <td className="py-2 px-3 text-xs">
                        <button 
                          className="text-primary hover:text-primary-dark text-xs"
                          onClick={() => handleAddComponent(item.componentId, Number(compareBomId))}
                        >
                          Aggiungi
                        </button>
                      </td>
                    </tr>
                  ))}
                  {comparisonData.uniqueItems2.map((item: any) => (
                    <tr key={`bom2-${item.id}`} className="border-b border-neutral-light hover:bg-neutral-lightest">
                      <td className="py-2 px-3 text-xs">{comparisonData.bom2.title}</td>
                      <td className="py-2 px-3 text-xs">{item.component?.code}</td>
                      <td className="py-2 px-3 text-xs">{item.component?.description}</td>
                      <td className="py-2 px-3 text-xs">{item.quantity}</td>
                      <td className="py-2 px-3 text-xs">
                        <button 
                          className="text-primary hover:text-primary-dark text-xs"
                          onClick={() => handleAddComponent(item.componentId, Number(currentBomId))}
                        >
                          Aggiungi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
