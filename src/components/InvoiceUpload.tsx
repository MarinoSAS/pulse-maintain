import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, X, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ExtractedInvoiceData {
  amount: number;
  vat_amount?: number;
  total_amount?: number;
  date: string;
  vendor_name?: string;
  invoice_number?: string;
  description?: string;
  service_type: string;
  asset_identifier?: string;
  asset_description?: string;
}

interface InvoiceUploadProps {
  onDataExtracted: (data: ExtractedInvoiceData, filePath: string) => void;
  onCancel: () => void;
}

export function InvoiceUpload({ onDataExtracted, onCancel }: InvoiceUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPG, PNG, WEBP, or PDF files.');
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null); // PDF files don't get preview
    }
  };

  const renderPdfFirstPageToBlob = async (file: File): Promise<Blob> => {
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 }); // 2x scale for better OCR quality
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({ canvasContext: ctx, viewport, background: 'white' } as any).promise;
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Failed to convert canvas to blob')),
        'image/png',
        0.92
      );
    });
  };

  const uploadAndProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    let tempPngPath: string | null = null;

    try {
      const timestamp = Date.now();
      let filePathToProcess: string;
      let invoiceFilePath: string;

      if (selectedFile.type === 'application/pdf') {
        // Upload original PDF
        const pdfPath = `${timestamp}.pdf`;
        console.log('Uploading PDF to storage...');
        const { error: pdfUploadError } = await supabase.storage
          .from('invoices')
          .upload(pdfPath, selectedFile);

        if (pdfUploadError) {
          console.error('PDF upload error:', pdfUploadError);
          throw new Error('Failed to upload PDF file');
        }

        invoiceFilePath = pdfPath;

        // Convert first page to PNG
        console.log('Converting PDF first page to PNG...');
        const pngBlob = await renderPdfFirstPageToBlob(selectedFile);
        
        // Upload PNG for AI processing
        tempPngPath = `${timestamp}_page1.png`;
        const { error: pngUploadError } = await supabase.storage
          .from('invoices')
          .upload(tempPngPath, pngBlob);

        if (pngUploadError) {
          console.error('PNG upload error:', pngUploadError);
          // Clean up PDF
          await supabase.storage.from('invoices').remove([pdfPath]);
          throw new Error('Failed to upload converted PNG');
        }

        filePathToProcess = tempPngPath;
      } else {
        // Image file - upload directly
        const fileExt = selectedFile.name.split('.').pop();
        const imagePath = `${timestamp}.${fileExt}`;
        
        console.log('Uploading image to storage...');
        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(imagePath, selectedFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Failed to upload invoice file');
        }

        invoiceFilePath = imagePath;
        filePathToProcess = imagePath;
      }

      console.log('File uploaded successfully, parsing invoice...');

      // Call edge function to parse invoice
      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-invoice', {
        body: { filePath: filePathToProcess }
      });

      if (parseError) {
        console.error('Parse error:', parseError);
        // Clean up uploaded files
        await supabase.storage.from('invoices').remove([invoiceFilePath]);
        if (tempPngPath) await supabase.storage.from('invoices').remove([tempPngPath]);
        throw new Error(parseError.message || 'Failed to parse invoice');
      }

      if (!parseData || parseData.error) {
        // Clean up uploaded files
        await supabase.storage.from('invoices').remove([invoiceFilePath]);
        if (tempPngPath) await supabase.storage.from('invoices').remove([tempPngPath]);
        throw new Error(parseData?.error || 'Failed to extract invoice data');
      }

      // Clean up temporary PNG if it was created
      if (tempPngPath) {
        await supabase.storage.from('invoices').remove([tempPngPath]);
      }

      console.log('Invoice parsed successfully:', parseData);
      toast.success('Invoice scanned successfully!');
      
      onDataExtracted(parseData, invoiceFilePath);
      
    } catch (error: any) {
      console.error('Error processing invoice:', error);
      toast.error(error.message || 'Failed to process invoice');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Scan Invoice</h3>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {!selectedFile ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Take a photo or upload an invoice to automatically extract expense details.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-6 h-6" />
                <span className="text-sm">Take Photo</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6" />
                <span className="text-sm">Upload File</span>
              </Button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
            />

            <p className="text-xs text-muted-foreground text-center">
              Supported: JPG, PNG, WEBP, PDF (max 10MB). PDFs are auto-converted on your device.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {preview ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img 
                  src={preview} 
                  alt="Invoice preview" 
                  className="w-full h-auto max-h-96 object-contain bg-muted"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 border border-border rounded-lg bg-muted">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={clearFile}
                disabled={isProcessing}
                className="flex-1"
              >
                Choose Different File
              </Button>
              <Button
                onClick={uploadAndProcess}
                disabled={isProcessing}
                className="flex-1 bg-gradient-accent"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Process Invoice'
                )}
              </Button>
            </div>

            {isProcessing && (
              <div className="text-center space-y-2">
                <Badge variant="secondary" className="animate-pulse">
                  {selectedFile?.type === 'application/pdf' 
                    ? 'Processing PDF and analyzing...' 
                    : 'AI is analyzing your invoice...'}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {selectedFile?.type === 'application/pdf'
                    ? 'PDF files may take a bit longer'
                    : 'This may take a few seconds'}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
