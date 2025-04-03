import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface SectionBomSummaryProps {
  sectionId: number;
}

interface Component {
  id: number;
  code: string;
  description: string;
  details?: any;
}

interface SectionComponent {
  id: number;
  sectionId: number;
  componentId: number;
  quantity: number;
  notes: string | null;
  component?: Component;
}

export default function SectionBomSummary({ sectionId }: SectionBomSummaryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

  // Fetch existing section components
  const { data: sectionComponents, isLoading: sectionComponentsLoading } = useQuery({
    queryKey: [`/api/sections/${sectionId}/components`],
    enabled: !!sectionId,
  });

  // Remove component from section mutation
  const removeComponentMutation = useMutation({
    mutationFn: async (sectionComponentId: number) => {
      const res = await apiRequest("DELETE", `/api/section-components/${sectionComponentId}`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/components`] });
      toast({
        title: "Componente rimosso",
        description: "Il componente è stato rimosso con successo dalla sezione",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message || error}`,
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
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message || error}`,
        variant: "destructive",
      });
    },
  });

  const handleRemoveComponent = (sectionComponentId: number) => {
    removeComponentMutation.mutate(sectionComponentId);
  };

  const handleQuantityChange = (sectionComponentId: number, quantity: number) => {
    if (quantity < 1) quantity = 1;
    updateComponentMutation.mutate({ id: sectionComponentId, quantity });
  };

  return (
    <div className="mt-4 border-t border-neutral-light pt-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-medium text-neutral-darkest">Componenti BOM associati</h3>
        <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <span className="material-icons text-sm">settings</span>
              <span>Gestisci associazioni</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[650px]">
            <DialogHeader>
              <DialogTitle>Gestisci associazioni BOM</DialogTitle>
              <DialogDescription>
                Gestisci i componenti BOM associati a questa sezione
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto">
              <iframe
                src={`/document-editor/${sectionId}#bom-section`}
                className="w-full h-[60vh] border-0"
                title="Gestione BOM"
              />
            </div>
            <DialogFooter>
              <Button onClick={() => setIsManageDialogOpen(false)}>Chiudi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {sectionComponentsLoading ? (
        <div className="p-2 text-sm">Caricamento componenti...</div>
      ) : sectionComponents && sectionComponents.length > 0 ? (
        <div className="space-y-2">
          {sectionComponents.map((sc: SectionComponent) => (
            <Card key={sc.id} className="p-2 border-l-4 border-l-primary">
              <CardContent className="p-2 flex justify-between items-center">
                <div>
                  <div className="font-medium">{sc.component?.code}</div>
                  <div className="text-sm text-neutral-medium">{sc.component?.description}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-neutral-lightest">
                    Quantità: {sc.quantity}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => handleQuantityChange(sc.id, (sc.quantity || 1) - 1)}
                    >
                      <span className="material-icons text-sm">remove</span>
                    </Button>
                    <Input
                      className="w-12 h-7 text-center"
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
                      className="h-7 w-7 p-0"
                      onClick={() => handleQuantityChange(sc.id, (sc.quantity || 1) + 1)}
                    >
                      <span className="material-icons text-sm">add</span>
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 w-7 p-0"
                    onClick={() => handleRemoveComponent(sc.id)}
                  >
                    <span className="material-icons text-sm">close</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-4 border border-dashed border-neutral-light rounded-md text-center bg-neutral-lightest">
          <span className="material-icons text-2xl text-neutral-medium mb-1">link_off</span>
          <p className="text-sm text-neutral-medium">
            Nessun componente BOM associato a questa sezione.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => setIsManageDialogOpen(true)}
          >
            Associa componenti
          </Button>
        </div>
      )}
    </div>
  );
}