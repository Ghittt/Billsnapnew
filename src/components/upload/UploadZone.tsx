import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Camera, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
  onFileUpload: (files: File[]) => void;
  isUploading?: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFileUpload, isUploading = false }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFileUpload(acceptedFiles);
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.heic'],
      'application/pdf': ['.pdf']
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: true,
    maxFiles: 10
  });

  return (
    <Card className={cn(
      "border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-300",
      isDragActive 
        ? "border-primary bg-primary/10 shadow-medium" 
        : "border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10",
      isUploading && "pointer-events-none opacity-50"
    )}>
      <div {...getRootProps()} className="space-y-4">
        <input {...getInputProps()} />
        
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {isDragActive ? "Rilascia le bollette qui" : "Carica le tue bollette"}
          </h3>
          <p className="text-muted-foreground">
            Trascina i file qui o clicca per selezionare
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <ImageIcon className="w-4 h-4" />
            JPG/PNG/HEIC
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            PDF
          </div>
          <div className="text-primary font-medium">
            Max 20MB per file
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            variant="default" 
            size="lg" 
            disabled={isUploading}
            className="min-h-[44px] text-base font-semibold"
          >
            <Upload className="w-5 h-5" />
            Carica bolletta
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default UploadZone;