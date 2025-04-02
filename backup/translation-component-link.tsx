import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface Component {
  id: number;
  code: string;
  description: string;
  details?: any;
}

interface SectionComponentLink {
  id: number;
  sectionId: number;
  componentId: number;
  quantity: number;
  notes: string | null;
  component: Component;
}

interface Section {
  id: number;
  documentId: number;
  title: string;
  description: string | null;
  order: number;
  parentId: number | null;
  isModule: boolean;
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

interface TranslationComponentLinkProps {
  translationId: number;
  languageId: number;
}

export default function TranslationComponentLink({ 
  translationId, 
  languageId 
}: TranslationComponentLinkProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  
  // Carica la traduzione e i componenti associati alla sezione originale
  const { data: translation, isLoading, isError } = useQuery<SectionTranslation>({
    queryKey: [`/api/section-translations/${translationId}`],
    enabled: !!translationId,
    onError: (err: any) => {
      console.error("Errore durante il caricamento della traduzione:", err);
      setError("Si è verificato un errore durante il caricamento dei dati della traduzione.");
    }
  });
  
  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Componenti BOM associati</CardTitle>
          <CardDescription>Caricamento dei componenti...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isError || !translation) {
    return (
      <Card className="shadow-sm border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Componenti BOM associati</CardTitle>
          <CardDescription className="text-red-500">
            {error || "Impossibile caricare la traduzione. Verifica la connessione e riprova."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            I dettagli dei componenti BOM non sono disponibili al momento. Salva la traduzione e riprova.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Se non ci sono componenti associati alla sezione originale
  if (!translation.components || !Array.isArray(translation.components) || translation.components.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Componenti BOM associati</CardTitle>
          <CardDescription>
            Nessun componente associato alla sezione originale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 italic">
            Per associare componenti, vai alla sezione originale nel documento e aggiungi dei componenti BOM.
            Le associazioni saranno automaticamente disponibili per questa traduzione.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Componenti BOM associati</CardTitle>
        <CardDescription>
          Questi componenti sono associati alla sezione originale 
          "{translation.section?.title || 'Sezione'}" e sono disponibili 
          per la traduzione.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.isArray(translation.components) && translation.components.map((link) => (
            <div key={link.id} className="border rounded-md p-3 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {link.component?.code || "N/D"}
                    </Badge>
                    <span className="text-sm font-medium">
                      Quantità: {link.quantity || 1}
                    </span>
                  </div>
                  <h4 className="font-medium mt-1">
                    {link.component?.description || "Componente senza descrizione"}
                  </h4>
                  {link.notes && (
                    <p className="text-sm text-neutral-medium mt-1">{link.notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}