import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Funzione speciale per mantenere il focus quando perso
   */
  keepFocus?: boolean;
}

// COMPONENTE TEXTAREA SEMPLIFICATO CHE MANTIENE SEMPRE IL FOCUS
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, keepFocus = false, onBlur, onFocus, ...props }, ref) => {
    // Ref interno
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    
    // Flag per indicare se è in corso l'editing (INIZIAMO CON true)
    const [isEditing, setIsEditing] = React.useState(false);
    
    // Combina refs
    const handleRef = (element: HTMLTextAreaElement) => {
      textareaRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };
    
    // Mantiene il focus sul componente
    const retainFocus = React.useCallback(() => {
      if (textareaRef.current && 
          keepFocus && 
          isEditing && 
          document.body.contains(textareaRef.current)) {
        // Forza il focus sul textarea senza ritardi o condizioni
        textareaRef.current.focus();
      }
    }, [keepFocus, isEditing]);
    
    // Gestisce l'evento onFocus
    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsEditing(true);
      if (onFocus) {
        onFocus(e);
      }
    };
    
    // Gestisce l'evento onBlur - METODO CHIAVE
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Chiama l'event handler originale se fornito
      if (onBlur) {
        onBlur(e);
      }
      
      // Se non dobbiamo mantenere il focus, non facciamo nulla
      if (!keepFocus) {
        return;
      }
      
      // Ottieni il relatedTarget (elemento che riceverà il focus)
      const relatedTarget = e.relatedTarget as HTMLElement;
      
      // Se stiamo perdendo il focus verso un bottone o un link, permetti l'azione
      if (relatedTarget && 
         (relatedTarget.tagName === 'BUTTON' || 
          relatedTarget.tagName === 'A' || 
          relatedTarget.getAttribute('role') === 'button')) {
        setIsEditing(false);
        return;
      }
      
      // Per ogni altro caso, mantieni il focus
      // Usiamo un setTimeout con priorità estrema per evitare conflitti
      e.preventDefault();
      setTimeout(retainFocus, 1);
    };
    
    // Imposta isEditing su true quando l'utente digita
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      setIsEditing(true);
      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
    };
    
    // Imposta isEditing su true quando l'utente cambia il valore
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setIsEditing(true);
      if (props.onChange) {
        props.onChange(e);
      }
    };
    
    // Effetto per forzare il focus iniziale quando keepFocus è true
    React.useEffect(() => {
      if (keepFocus && textareaRef.current) {
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            setIsEditing(true);
          }
        }, 50);
      }
    }, [keepFocus]);
    
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={handleRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
