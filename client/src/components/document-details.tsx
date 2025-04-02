import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface DocumentDetailsProps {
  document: any;
  onUpdate?: (data: any) => void;
  userId: number;
}

export default function DocumentDetails({ document, onUpdate, userId }: DocumentDetailsProps) {
  const [title, setTitle] = useState(document?.title || "");
  const [description, setDescription] = useState(document?.description || "");
  const [status, setStatus] = useState(document?.status || "draft");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const createDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/documents', data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      navigate(`/documents/${data.id}`);
      toast({
        title: "Documento creato",
        description: "Il documento è stato creato con successo"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante la creazione del documento: ${error}`,
        variant: "destructive"
      });
    }
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('PUT', `/api/documents/${document.id}`, data);
      return await res.json();
    },
    onSuccess: (data) => {
      if (onUpdate) onUpdate(data);
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Documento aggiornato",
        description: "Il documento è stato aggiornato con successo"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'aggiornamento del documento: ${error}`,
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    const documentData = {
      title,
      description,
      status,
      createdById: userId,
      updatedById: userId
    };

    if (document?.id) {
      updateDocumentMutation.mutate(documentData);
    } else {
      createDocumentMutation.mutate(documentData);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="document-title">Titolo</Label>
        <Input
          id="document-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Inserisci il titolo del documento"
        />
      </div>

      <div>
        <Label htmlFor="document-description">Descrizione</Label>
        <Textarea
          id="document-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Inserisci una descrizione"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="document-status">Stato</Label>
        <Select
          value={status}
          onValueChange={setStatus}
        >
          <SelectTrigger id="document-status">
            <SelectValue placeholder="Seleziona uno stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Bozza</SelectItem>
            <SelectItem value="in_review">In Revisione</SelectItem>
            <SelectItem value="approved">Approvato</SelectItem>
            <SelectItem value="obsolete">Obsoleto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button 
        onClick={handleSave}
        disabled={!title}
        className="mt-4"
      >
        <span className="material-icons text-sm mr-1">save</span>
        {document?.id ? "Aggiorna" : "Crea documento"}
      </Button>
    </div>
  );
}
