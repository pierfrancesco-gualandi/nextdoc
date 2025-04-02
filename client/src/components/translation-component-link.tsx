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
  
  // Carica la traduzione e i componenti associati alla sezione originale
  const { data: translation, isLoading } = useQuery<SectionTranslation>({
    queryKey: [`/api/section-translations/${translationId}`],
    enabled: !!translationId,
  });
  
  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Componenti associati</CardTitle>
          <CardDescription>Caricamento dei componenti...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (!translation) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Componenti associati</CardTitle>
          <CardDescription>Nessuna traduzione trovata</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Se non ci sono componenti associati alla sezione originale
  if (!translation.components || translation.components.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Componenti associati</CardTitle>
          <CardDescription>Nessun componente associato alla sezione originale</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Componenti BOM associati</CardTitle>
        <CardDescription>
          Questi componenti sono associati alla sezione originale "{translation.section?.title}".
          Le associazioni vengono mantenute tra la sezione originale e le relative traduzioni.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {translation.components.map((link) => (
            <div key={link.id} className="border rounded-md p-3 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {link.component.code}
                    </Badge>
                    <span className="text-sm font-medium">
                      Quantità: {link.quantity}
                    </span>
                  </div>
                  <h4 className="font-medium mt-1">{link.component.description}</h4>
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