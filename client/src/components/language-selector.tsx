import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LanguageSelectorProps {
  documentId: string | number;
  onLanguageChange: (languageId: string) => void;
  className?: string;
}

export default function LanguageSelector({ 
  documentId, 
  onLanguageChange,
  className = ""
}: LanguageSelectorProps) {
  // Ottiene tutte le lingue disponibili
  const { data: languages, isLoading } = useQuery<any[]>({
    queryKey: [`/api/languages`],
    staleTime: 60000, // Cache per 1 minuto
  });

  if (isLoading) {
    return <div className="text-sm text-neutral-medium">Caricamento lingue...</div>;
  }

  return (
    <div className={`flex items-center ${className}`}>
      <span className="text-sm text-neutral-medium mr-2">Lingua:</span>
      <Select defaultValue="0" onValueChange={onLanguageChange}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Seleziona lingua" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">Originale</SelectItem>
          {languages && languages.map((lang) => (
            <SelectItem key={lang.id} value={lang.id.toString()}>
              {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}