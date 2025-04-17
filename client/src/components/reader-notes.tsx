import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ReaderNotesProps {
  documentId: string;
  sectionId?: number;
  moduleId?: number;
  userId: number;
  userRole?: string;
}

export default function ReaderNotes({ documentId, sectionId, moduleId, userId, userRole }: ReaderNotesProps) {
  const [noteText, setNoteText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Carica le note esistenti per questo documento/sezione/modulo
  const { data: notes, isLoading } = useQuery({
    queryKey: [`/api/documents/${documentId}/comments`],
    enabled: !!documentId,
  });

  // Filtra le note per sezione e modulo se specificati
  const filteredNotes = notes && Array.isArray(notes) ? notes.filter((note: any) => {
    if (sectionId && note.sectionId !== sectionId) return false;
    if (moduleId && note.moduleId !== moduleId) return false;
    return true;
  }) : [];

  // Mutation per salvare una nuova nota
  const addNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      const res = await apiRequest('POST', '/api/comments', noteData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/comments`] });
      setNoteText('');
      setShowForm(false);
      toast({
        title: "Nota salvata",
        description: "La tua nota è stata salvata con successo",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error}`,
        variant: "destructive"
      });
    }
  });

  // Gestisce il salvataggio della nota
  const handleSaveNote = () => {
    if (!noteText.trim()) {
      toast({
        title: "Errore",
        description: "Il testo della nota non può essere vuoto",
        variant: "destructive"
      });
      return;
    }

    addNoteMutation.mutate({
      documentId: parseInt(documentId),
      userId,
      content: noteText,
      sectionId,
      moduleId
    });
  };

  return (
    <div className="reader-notes mt-4">
      {/* Lista delle note esistenti */}
      {filteredNotes.length > 0 && (
        <div className="existing-notes mb-4">
          <h4 className="text-sm font-medium mb-2">Note:</h4>
          <div className="space-y-2">
            {filteredNotes.map((note: any) => (
              <div 
                key={note.id} 
                className={`p-3 rounded-md ${userRole === 'reader' ? 'bg-pink-200 border-pink-300 shadow-sm' : 'bg-pink-100 border-pink-200'} border`}
              >
                <p className={`text-sm ${userRole === 'reader' ? 'text-pink-800 font-medium' : 'text-neutral-dark'}`}>
                  {note.content}
                </p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-neutral-medium">
                    {new Date(note.createdAt).toLocaleString()}
                  </span>
                  {userRole === 'reader' && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full">
                      Nota lettore
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pulsante per aggiungere una nuova nota */}
      {!showForm ? (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowForm(true)}
          className="text-pink-600 border-pink-300 hover:bg-pink-50"
        >
          <span className="material-icons text-sm mr-1">note_add</span>
          Aggiungi nota
        </Button>
      ) : (
        <div className="add-note-form bg-pink-50 p-3 rounded-md border border-pink-200">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Scrivi una nota..."
            className="min-h-[100px] bg-white border-pink-200 focus-visible:ring-pink-400"
          />
          <div className="flex justify-end space-x-2 mt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowForm(false)}
            >
              Annulla
            </Button>
            <Button 
              size="sm" 
              onClick={handleSaveNote}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              Salva nota
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}