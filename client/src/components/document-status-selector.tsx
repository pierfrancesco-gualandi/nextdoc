import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDocumentStatus, getDocumentStatuses } from "@/lib/document-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";

interface DocumentStatusSelectorProps {
  documentId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

export default function DocumentStatusSelector({ 
  documentId, 
  currentStatus, 
  onStatusChange 
}: DocumentStatusSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const statusInfo = formatDocumentStatus(currentStatus);
  const availableStatuses = getDocumentStatuses();

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Errore nell\'aggiornamento dello stato del documento');
      }

      return response.json();
    },
    onSuccess: (data, newStatus) => {
      // Invalida la cache per aggiornare i dati
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      // Notifica il componente padre del cambio di stato
      if (onStatusChange) {
        onStatusChange(newStatus);
      }

      const newStatusInfo = formatDocumentStatus(newStatus);
      toast({
        title: "Stato aggiornato",
        description: `Lo stato del documento è stato cambiato in: ${newStatusInfo.label}`,
        variant: "default",
      });

      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleStatusChange = (newStatus: string) => {
    if (newStatus !== currentStatus) {
      updateStatusMutation.mutate(newStatus);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-auto p-0 hover:bg-transparent"
          disabled={updateStatusMutation.isPending}
        >
          <Badge className={`${statusInfo.bgClass} cursor-pointer hover:opacity-80 transition-opacity`}>
            {statusInfo.label}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-48">
        {availableStatuses.map((status) => (
          <DropdownMenuItem
            key={status.value}
            onClick={() => handleStatusChange(status.value)}
            className="flex items-center justify-between cursor-pointer"
            disabled={updateStatusMutation.isPending}
          >
            <div className="flex items-center">
              <Badge className={`${status.bgClass} mr-2`} variant="secondary">
                {status.label}
              </Badge>
            </div>
            {currentStatus === status.value && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}