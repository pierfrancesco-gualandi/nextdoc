import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import Header from '@/components/header';
import { TranslationExportImport } from '@/components/translation-export-import';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, FileTextIcon } from 'lucide-react';

export default function DocumentTranslationExport() {
  const { id } = useParams<{ id: string }>();
  
  // Recupera le informazioni sul documento
  const { data: document, isLoading: isLoadingDocument } = useQuery({
    queryKey: [`/api/documents/${id}`],
    enabled: !!id,
  });
  
  // Recupera le lingue disponibili
  const { data: languages, isLoading: isLoadingLanguages } = useQuery({
    queryKey: ['/api/languages'],
    select: (data) => data.filter((lang: any) => lang.isActive),
  });
  
  return (
    <>
      <Header 
        title={isLoadingDocument ? 'Caricamento...' : `Esportazione Traduzioni: ${document?.title}`} 
        documentId={id}
      />
      
      <main className="flex-1 overflow-y-auto bg-neutral-lightest p-6">
        <div className="container mx-auto space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center mb-6">
            <Button variant="ghost" asChild className="p-0 mr-2">
              <Link href={`/document/${id}`}>
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Torna al documento
              </Link>
            </Button>
          </div>
          
          {/* Explanation Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileTextIcon className="h-5 w-5 mr-2" />
                Gestione Esportazione e Importazione di Traduzioni
              </CardTitle>
              <CardDescription>
                Da qui è possibile esportare tutte le traduzioni del documento in un file CSV, 
                modificarle esternamente e successivamente importarle nuovamente nel sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <p><strong>Esportazione:</strong> Esporta tutte le traduzioni (sia esistenti che da tradurre) in un file CSV.</p>
                <p><strong>Importazione:</strong> Importa le traduzioni da un file CSV nel formato corretto.</p>
                <p className="text-neutral-medium">
                  <strong>Nota:</strong> Il file CSV deve mantenere lo stesso formato di quello esportato. Non modificare 
                  le colonne ID, Type, Field e SubID poiché sono necessarie per tracciare la relazione con i contenuti originali.
                </p>
              </div>
            </CardContent>
          </Card>
          
          {isLoadingDocument || isLoadingLanguages ? (
            <div className="text-center py-8">Caricamento in corso...</div>
          ) : (
            <TranslationExportImport 
              documentId={id} 
              languages={languages || []}
            />
          )}
        </div>
      </main>
    </>
  );
}