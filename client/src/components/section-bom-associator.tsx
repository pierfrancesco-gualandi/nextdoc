import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface SectionBomAssociatorProps {
  sectionId: number;
}

interface Component {
  id: number;
  code: string;
  description: string;
  details?: any;
}

interface BomItem {
  id: number;
  bomId: number;
  componentId: number;
  quantity: number;
  component?: Component;
}

interface Bom {
  id: number;
  title: string;
  description: string | null;
}

interface SectionComponent {
  id: number;
  sectionId: number;
  componentId: number;
  quantity: number;
  notes: string | null;
  component?: Component;
}

export default function SectionBomAssociator({ sectionId }: SectionBomAssociatorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBomId, setSelectedBomId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedComponents, setSelectedComponents] = useState<Record<number, number>>({});

  // Fetch all available BOMs
  const { data: boms, isLoading: bomsLoading } = useQuery({
    queryKey: ["/api/boms"],
  });

  // Fetch BOM items when a BOM is selected
  const { data: bomItems, isLoading: bomItemsLoading } = useQuery({
    queryKey: [`/api/boms/${selectedBomId}/items`],
    enabled: !!selectedBomId,
  });

  // Fetch existing section components
  const { data: sectionComponents, isLoading: sectionComponentsLoading } = useQuery({
    queryKey: [`/api/sections/${sectionId}/components`],
    enabled: !!sectionId,
  });

  // Initialize selectedComponents with existing associations
  useEffect(() => {
    if (sectionComponents && sectionComponents.length > 0) {
      const componentMap: Record<number, number> = {};
      sectionComponents.forEach((sc: SectionComponent) => {
        if (sc.component) {
          componentMap[sc.componentId] = sc.quantity;
        }
      });
      setSelectedComponents(componentMap);
    }
  }, [sectionComponents]);

  // Add component to section mutation
  const addComponentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/section-components", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/components`] });
      toast({
        title: "Componente aggiunto",
        description: "Il componente è stato associato con successo alla sezione",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Remove component from section mutation
  const removeComponentMutation = useMutation({
    mutationFn: async (sectionComponentId: number) => {
      await apiRequest("DELETE", `/api/section-components/${sectionComponentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/components`] });
      toast({
        title: "Componente rimosso",
        description: "Il componente è stato rimosso con successo dalla sezione",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Update component quantity mutation
  const updateComponentMutation = useMutation({
    mutationFn: async (data: { id: number; quantity: number }) => {
      const res = await apiRequest("PUT", `/api/section-components/${data.id}`, { quantity: data.quantity });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/components`] });
      toast({
        title: "Quantità aggiornata",
        description: "La quantità del componente è stata aggiornata con successo",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleAddComponent = (componentId: number) => {
    addComponentMutation.mutate({
      sectionId,
      componentId,
      quantity: 1,
    });
  };

  const handleRemoveComponent = (sectionComponentId: number) => {
    removeComponentMutation.mutate(sectionComponentId);
  };

  const handleQuantityChange = (sectionComponentId: number, quantity: number) => {
    if (quantity < 1) quantity = 1;
    updateComponentMutation.mutate({ id: sectionComponentId, quantity });
  };

  // Filter the BOM items based on search term
  const filteredBomItems = bomItems
    ? bomItems.filter((item: BomItem) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const code = item.component?.code?.toLowerCase() || "";
        const description = item.component?.description?.toLowerCase() || "";
        return code.includes(term) || description.includes(term);
      })
    : [];

  // Check if component is already associated with section
  const isComponentAssociated = (componentId: number): boolean => {
    if (!sectionComponents) return false;
    return sectionComponents.some((sc: SectionComponent) => sc.componentId === componentId);
  };

  // Find section component id by component id
  const findSectionComponentId = (componentId: number): number | undefined => {
    if (!sectionComponents) return undefined;
    const sc = sectionComponents.find((sc: SectionComponent) => sc.componentId === componentId);
    return sc?.id;
  };

  // Get component quantity in the section
  const getComponentQuantity = (componentId: number): number => {
    if (!sectionComponents) return 0;
    const sc = sectionComponents.find((sc: SectionComponent) => sc.componentId === componentId);
    return sc?.quantity || 0;
  };

  if (!sectionId) {
    return (
      <div className="p-4 text-center text-neutral-medium">
        Seleziona una sezione per gestire i componenti associati.
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <Label htmlFor="bom-select" className="block text-sm font-medium text-neutral-darkest mb-1">
          Seleziona Distinta Base (BOM)
        </Label>
        <Select value={selectedBomId} onValueChange={setSelectedBomId}>
          <SelectTrigger id="bom-select" className="w-full">
            <SelectValue placeholder="Seleziona una distinta base" />
          </SelectTrigger>
          <SelectContent>
            {bomsLoading ? (
              <div className="p-2">Caricamento...</div>
            ) : boms && boms.length > 0 ? (
              boms.map((bom: Bom) => (
                <SelectItem key={bom.id} value={bom.id.toString()}>
                  {bom.title}
                </SelectItem>
              ))
            ) : (
              <div className="p-2">Nessuna distinta base disponibile</div>
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedBomId && (
        <>
          <div className="mb-4">
            <Label htmlFor="search-components" className="block text-sm font-medium text-neutral-darkest mb-1">
              Cerca componenti
            </Label>
            <div className="relative">
              <Input
                id="search-components"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca per codice o descrizione"
                className="pl-9"
              />
              <span className="material-icons absolute left-2.5 top-2.5 text-neutral-medium">search</span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-neutral-darkest mb-2">Componenti associati alla sezione:</h3>
            {sectionComponentsLoading ? (
              <div className="p-2">Caricamento componenti associati...</div>
            ) : sectionComponents && sectionComponents.length > 0 ? (
              <div className="space-y-2">
                {sectionComponents.map((sc: SectionComponent) => (
                  <Card key={sc.id} className="p-2 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{sc.component?.code}</div>
                      <div className="text-sm text-neutral-medium">{sc.component?.description}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => handleQuantityChange(sc.id, (sc.quantity || 1) - 1)}
                        >
                          <span className="material-icons text-sm">remove</span>
                        </Button>
                        <Input
                          className="w-14 h-8 text-center"
                          value={sc.quantity || 1}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value)) {
                              handleQuantityChange(sc.id, value);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => handleQuantityChange(sc.id, (sc.quantity || 1) + 1)}
                        >
                          <span className="material-icons text-sm">add</span>
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8"
                        onClick={() => handleRemoveComponent(sc.id)}
                      >
                        <span className="material-icons text-sm">delete</span>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="p-2 text-center text-neutral-medium">
                Nessun componente associato a questa sezione
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <h3 className="text-sm font-medium text-neutral-darkest mb-2">Componenti disponibili nella distinta base:</h3>
          {bomItemsLoading ? (
            <div className="p-2">Caricamento componenti...</div>
          ) : filteredBomItems.length > 0 ? (
            <div className="space-y-2">
              {filteredBomItems.map((item: BomItem) => {
                const isAssociated = isComponentAssociated(item.componentId);
                return (
                  <Card key={item.id} className="p-2 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{item.component?.code}</div>
                      <div className="text-sm text-neutral-medium">{item.component?.description}</div>
                    </div>
                    <div>
                      {isAssociated ? (
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                            Associato (Q: {getComponentQuantity(item.componentId)})
                          </Badge>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const scId = findSectionComponentId(item.componentId);
                              if (scId) handleRemoveComponent(scId);
                            }}
                          >
                            Rimuovi
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => handleAddComponent(item.componentId)}>
                          Associa
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="p-2 text-center text-neutral-medium">
              {searchTerm ? "Nessun componente trovato con questi criteri di ricerca" : "Nessun componente disponibile"}
            </div>
          )}
        </>
      )}
    </div>
  );
}