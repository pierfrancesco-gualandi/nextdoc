import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Upload, FileSpreadsheet, Check, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Progress } from '@/components/ui/progress';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

interface BomExcelImporterProps {
  onImportSuccess?: (bomId: number) => void;
}

const BomExcelImporter: React.FC<BomExcelImporterProps> = ({ onImportSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const importMutation = useMutation({
    mutationFn: async (data: FormData) => {
      setImporting(true);
      setError(null);
      
      try {
        const response = await apiRequest('POST', '/api/boms/import', data);
        return await response.json();
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Si è verificato un errore durante l\'importazione');
        }
        throw error;
      } finally {
        setImporting(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/boms'] });
      toast({
        title: 'Importazione completata',
        description: data.message || `BOM "${data.bom.title}" importata con successo.`,
      });
      
      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      
      // Notify parent component if callback is provided
      if (onImportSuccess && data.bom && data.bom.id) {
        onImportSuccess(data.bom.id);
      }
    },
    onError: (error) => {
      toast({
        title: 'Errore durante l\'importazione',
        description: error instanceof Error ? error.message : 'Si è verificato un errore.',
        variant: 'destructive'
      });
    }
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      // Verifica che sia un file Excel
      if (selectedFile.type === 'application/vnd.ms-excel' || 
          selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          selectedFile.name.endsWith('.xlsx') || 
          selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        
        // Set default title if empty
        if (!title) {
          setTitle(selectedFile.name.replace(/\.[^/.]+$/, "")); // Remove extension
        }
        
        setError(null);
      } else {
        setFile(null);
        setError('Selezionare un file Excel valido (.xlsx o .xls)');
      }
    }
  };
  
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Selezionare un file Excel da importare');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || `BOM importata il ${new Date().toLocaleString()}`);
    if (description) {
      formData.append('description', description);
    }
    
    importMutation.mutate(formData);
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importa BOM da Excel
        </CardTitle>
        <CardDescription>
          Carica un file Excel (.xlsx o .xls) contenente la distinta base completa.
          Il file deve contenere almeno le colonne: "Codice", "Descrizione", "Quantità" e opzionalmente "Livello".
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleImport}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Titolo della BOM</Label>
              <Input
                id="title"
                placeholder="Inserisci un titolo per la distinta base"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Descrizione (opzionale)</Label>
              <Textarea
                id="description"
                placeholder="Aggiungi una descrizione per questa distinta base"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>File Excel</Label>
              <div 
                className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors ${file ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
                onClick={triggerFileInput}
              >
                <input
                  type="file"
                  id="file-upload"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                />
                
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="text-sm font-medium">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB • Fare clic per modificare
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-sm font-medium">Fare clic per selezionare o trascinare un file</div>
                    <div className="text-xs text-muted-foreground">
                      Sono supportati i file Excel (.xlsx, .xls)
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errore</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {importing && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Importazione in corso...</div>
                <Progress value={50} className="h-2" />
              </div>
            )}
          </div>
          
          <div className="mt-4 flex justify-end gap-2">
            <Button 
              type="button"
              variant="outline"
              onClick={() => {
                setFile(null);
                setTitle('');
                setDescription('');
                setError(null);
              }}
              disabled={importMutation.isPending}
            >
              Annulla
            </Button>
            <Button 
              type="submit"
              disabled={!file || importMutation.isPending}
              className="gap-1"
            >
              {importMutation.isPending ? 'Importazione...' : 'Importa BOM'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BomExcelImporter;