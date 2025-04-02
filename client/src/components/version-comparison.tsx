import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface VersionComparisonProps {
  documentId: string;
}

export default function VersionComparison({ documentId }: VersionComparisonProps) {
  const { toast } = useToast();
  const [previousVersion, setPreviousVersion] = useState<string>("");
  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [diffData, setDiffData] = useState<any>(null);
  
  const { data: versions, isLoading } = useQuery({
    queryKey: [`/api/documents/${documentId}/versions`],
    enabled: !!documentId && documentId !== 'new',
  });
  
  // Set default versions when data loads
  useEffect(() => {
    if (versions && versions.length >= 2) {
      setCurrentVersion(versions[0].id.toString());
      setPreviousVersion(versions[1].id.toString());
    } else if (versions && versions.length === 1) {
      setCurrentVersion(versions[0].id.toString());
    }
  }, [versions]);
  
  // Get version object from ID
  const getVersionById = (id: string) => {
    if (!versions) return null;
    return versions.find((v: any) => v.id.toString() === id);
  };
  
  // Compare versions
  const compareVersions = () => {
    if (!previousVersion || !currentVersion) {
      toast({
        title: "Selezione incompleta",
        description: "Seleziona entrambe le versioni da confrontare",
        variant: "destructive"
      });
      return;
    }
    
    const prev = getVersionById(previousVersion);
    const curr = getVersionById(currentVersion);
    
    if (!prev || !curr) {
      toast({
        title: "Errore",
        description: "Versioni non valide",
        variant: "destructive"
      });
      return;
    }
    
    // In a real implementation, we'd compare the content objects
    // For now, we'll use mock comparison data
    setDiffData({
      sections: [
        {
          title: "Testo (Introduzione)",
          differences: [
            {
              type: "text",
              added: "Prima di iniziare, assicurarsi di disporre di tutti i componenti elencati nella distinta base e degli strumenti necessari indicati nella sezione \"Preparazione\".",
              removed: "Consultare la documentazione tecnica in caso di dubbi."
            }
          ]
        },
        {
          title: "Componenti",
          differences: [
            {
              type: "component",
              added: "RC100-CVR - Copertura in plexiglass (Quantità: 1)",
              removed: "RC100-STS - Set viti di assemblaggio (Quantità: 8)"
            }
          ]
        },
        {
          title: "Avviso",
          differences: [
            {
              type: "warning",
              added: "Utilizzare guanti antistatici durante la manipolazione dei componenti elettronici per evitare danni da scariche elettrostatiche.",
              removed: "Indossare protezioni per gli occhi durante l'assemblaggio."
            }
          ]
        }
      ]
    });
  };
  
  // Export comparison
  const exportComparison = () => {
    toast({
      title: "Funzionalità in arrivo",
      description: "L'esportazione del confronto sarà disponibile a breve"
    });
  };
  
  if (isLoading) {
    return <div className="p-4">Caricamento versioni...</div>;
  }
  
  if (!versions || versions.length === 0) {
    return (
      <div className="p-4 text-neutral-dark">
        Nessuna versione disponibile per questo documento.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex mb-4 space-x-4">
        <div className="flex-1">
          <Label className="block text-sm font-medium text-neutral-darkest mb-1">Versione precedente</Label>
          <Select value={previousVersion} onValueChange={setPreviousVersion}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona versione" />
            </SelectTrigger>
            <SelectContent>
              {versions && versions.slice(1).map((version: any) => (
                <SelectItem key={version.id} value={version.id.toString()}>
                  v{version.version} ({new Date(version.createdAt).toLocaleDateString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="block text-sm font-medium text-neutral-darkest mb-1">Versione corrente</Label>
          <Select value={currentVersion} onValueChange={setCurrentVersion}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona versione" />
            </SelectTrigger>
            <SelectContent>
              {versions && versions.map((version: any) => (
                <SelectItem key={version.id} value={version.id.toString()}>
                  v{version.version} ({new Date(version.createdAt).toLocaleDateString()})
                  {version.id === versions[0].id ? " - Attuale" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Button className="mb-4" onClick={compareVersions}>
        Confronta versioni
      </Button>
      
      {diffData && (
        <>
          <div className="border border-neutral-light rounded-md overflow-hidden mb-4">
            <div className="bg-neutral-lightest px-4 py-2 border-b border-neutral-light">
              <span className="text-sm font-medium text-neutral-dark">Differenze</span>
            </div>
            <div className="p-4">
              {diffData.sections.map((section: any, index: number) => (
                <div key={index} className="diff-section mb-4">
                  <p className="text-sm font-medium text-neutral-dark mb-2">{section.title}</p>
                  <div className="border border-neutral-light rounded-md p-3 text-sm">
                    {section.differences.map((diff: any, i: number) => (
                      <p key={i}>
                        {diff.added && <span className="diff-added">{diff.added}</span>}
                        {diff.removed && <span className="diff-removed">{diff.removed}</span>}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={exportComparison}>
              <span className="material-icons text-sm mr-1">file_download</span>
              Esporta confronto
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
