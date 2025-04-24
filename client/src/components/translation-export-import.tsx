import React, { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from '@/components/ui/progress';
import { exportDocumentTranslationsToCSV, importTranslationsFromCSV } from '@/lib/translation-export-import';

interface TranslationExportImportProps {
  documentId: string;
  languages: Array<{ id: number; name: string; code: string; }>;
}

export function TranslationExportImport({ documentId, languages }: TranslationExportImportProps) {
  const { toast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gestione esportazione
  const handleExport = async () => {
    if (!selectedLanguage || !documentId) {
      toast({
        title: "Errore",
        description: "Seleziona una lingua per esportare le traduzioni",
        variant: "destructive"
      });
      return;
    }

    try {
      setExporting(true);
      setProgress(10);
      
      const languageName = languages.find(l => l.id.toString() === selectedLanguage)?.name || '';
      const fileName = `traduzioni_${languageName.toLowerCase()}_doc_${documentId}_${new Date().toISOString().split('T')[0]}.csv`;
      
      setProgress(30);
      await exportDocumentTranslationsToCSV(documentId, selectedLanguage, fileName);
      setProgress(100);
      
      toast({
        title: "Esportazione completata",
        description: `Le traduzioni sono state esportate con successo nel file ${fileName}`,
      });
    } catch (error) {
      console.error("Errore durante l'esportazione:", error);
      toast({
        title: "Errore di esportazione",
        description: "Si è verificato un errore durante l'esportazione delle traduzioni",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setExporting(false);
        setProgress(0);
      }, 1000);
    }
  };

  // Gestione selezione file
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  // Gestione importazione
  const handleImport = async () => {
    if (!selectedLanguage || !documentId || !selectedFile) {
      toast({
        title: "Errore",
        description: "Seleziona una lingua e un file CSV per importare le traduzioni",
        variant: "destructive"
      });
      return;
    }

    try {
      setImporting(true);
      setProgress(10);
      
      // Leggi il contenuto del file
      const fileContent = await readFileContent(selectedFile);
      setProgress(30);
      
      // Importa le traduzioni
      const result = await importTranslationsFromCSV(documentId, selectedLanguage, fileContent);
      setProgress(100);
      
      if (result.success) {
        toast({
          title: "Importazione completata",
          description: `Traduzioni importate con successo: ${result.inserted} inserite, ${result.updated} aggiornate.`,
        });
      } else {
        toast({
          title: "Importazione completata con errori",
          description: `Alcune traduzioni potrebbero non essere state importate. ${result.inserted} inserite, ${result.updated} aggiornate, ${result.errors.length} errori.`,
          variant: "destructive"
        });
      }
      
      // Resetta l'input del file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    } catch (error) {
      console.error("Errore durante l'importazione:", error);
      toast({
        title: "Errore di importazione",
        description: "Si è verificato un errore durante l'importazione delle traduzioni",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setImporting(false);
        setProgress(0);
      }, 1000);
    }
  };

  // Funzione per leggere il contenuto del file
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          resolve(event.target.result);
        } else {
          reject(new Error('Errore nella lettura del file'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Esportazione e Importazione Traduzioni</CardTitle>
        <CardDescription>
          Esporta tutte le traduzioni del documento in un file CSV o importa traduzioni da un file CSV.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="language-select">Lingua di traduzione</Label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger id="language-select">
              <SelectValue placeholder="Seleziona una lingua" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((language) => (
                <SelectItem key={language.id} value={language.id.toString()}>
                  {language.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(exporting || importing) && (
          <div className="space-y-2">
            <Label>{exporting ? 'Esportazione in corso...' : 'Importazione in corso...'}</Label>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Esportazione</Label>
            <Button 
              className="w-full" 
              onClick={handleExport} 
              disabled={!selectedLanguage || exporting || importing}
            >
              Esporta Traduzioni in CSV
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-file">File CSV da importare</Label>
            <Input
              ref={fileInputRef}
              id="import-file"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={importing || exporting}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => {
            setSelectedLanguage('');
            setSelectedFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          disabled={importing || exporting}
        >
          Reimposta
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              disabled={!selectedLanguage || !selectedFile || importing || exporting}
            >
              Importa Traduzioni
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma importazione</AlertDialogTitle>
              <AlertDialogDescription>
                Stai per importare traduzioni dal file {selectedFile?.name}. Questa operazione potrebbe sovrascrivere 
                le traduzioni esistenti. Vuoi continuare?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleImport}>Conferma</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}