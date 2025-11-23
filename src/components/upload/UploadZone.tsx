import React, { useCallback, useRef } from 'react';
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
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload(Array.from(files));
    }
  };

  const triggerCamera = (e: React.MouseEvent) => {
    e.stopPropagation();
    cameraInputRef.current?.click();
  };

  return (
    <Card className={cn(
      "border-2 border-dashed p-6 sm:p-8 md:p-12 text-center cursor-pointer transition-all w-full",
      isDragActive 
        ? "border-primary bg-primary/5" 
        : "border-border hover:border-primary/50",
      isUploading && "pointer-events-none opacity-50"
    )}>
      <div {...getRootProps()} className="space-y-4 sm:space-y-6">
        <input {...getInputProps()} />
        
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
            <Upload className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-semibold">
            {isDragActive ? "Rilascia qui" : "Carica la tua bolletta"}
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground">
            Trascina un file qui o clicca per selezionare
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <ImageIcon className="w-4 h-4" />
            JPG, PNG, HEIC
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            PDF
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3 justify-center flex-wrap">
          <Button 
            variant="default" 
            size="lg" 
            disabled={isUploading}
            className="text-sm sm:text-base"
          >
            Seleziona file
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            onClick={triggerCamera}
            disabled={isUploading}
            className="gap-2 text-sm sm:text-base"
          >
            <Camera className="w-4 h-4" />
            Scatta foto
          </Button>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraCapture}
          className="hidden"
        />
      </div>
    </Card>
  );
};

export default UploadZone;