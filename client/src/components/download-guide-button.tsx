import React from 'react';
import { Button } from "@/components/ui/button";
import { downloadBomComparisonGuide } from "@/lib/document-utils";
import { Download } from "lucide-react";

interface DownloadGuideButtonProps {
  className?: string;
}

export function DownloadGuideButton({ className }: DownloadGuideButtonProps) {
  return (
    <Button 
      variant="outline" 
      className={className} 
      onClick={() => downloadBomComparisonGuide()}
    >
      <Download className="mr-2 h-4 w-4" />
      Scarica Guida
    </Button>
  );
}