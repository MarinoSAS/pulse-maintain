import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Check, AlertCircle, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";

interface ParsedFuelRecord {
  date: string;
  time: string | null;
  company: string;
  liters: number;
  assetId?: string;
  assetName?: string;
  status: "pending" | "matched" | "error";
  error?: string;
}

interface Asset {
  id: string;
  name: string;
  asset_id: string;
  company: string;
}

export function FuelUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRecords, setParsedRecords] = useState<ParsedFuelRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    const { data, error } = await supabase
      .from("assets")
      .select("id, name, asset_id, company")
      .order("name");
    
    if (error) {
      console.error("Error loading assets:", error);
      return;
    }
    setAssets(data || []);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      // Find header row
      const headerRow = jsonData.find(row => 
        row.some(cell => 
          String(cell).toLowerCase().includes("date") || 
          String(cell).toLowerCase().includes("quantity") ||
          String(cell).toLowerCase().includes("company")
        )
      );

      if (!headerRow) {
        toast.error("Could not find headers (Date, Company, Quantity) in the Excel file");
        setIsParsing(false);
        return;
      }

      const headerIndex = jsonData.indexOf(headerRow);
      const headers = headerRow.map(h => String(h).toLowerCase().trim());
      
      // Find column indices
      const dateIdx = headers.findIndex(h => h.includes("date"));
      const timeIdx = headers.findIndex(h => h.includes("time"));
      const companyIdx = headers.findIndex(h => h.includes("company"));
      const quantityIdx = headers.findIndex(h => h.includes("quantity") || h.includes("liters") || h.includes("litres"));

      if (dateIdx === -1 || quantityIdx === -1) {
        toast.error("Excel must have Date and Quantity columns");
        setIsParsing(false);
        return;
      }

      const records: ParsedFuelRecord[] = [];
      let firstValidDate: Date | null = null;

      for (let i = headerIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const rawDate = row[dateIdx];
        const rawTime = timeIdx !== -1 ? row[timeIdx] : null;
        const rawCompany = companyIdx !== -1 ? String(row[companyIdx] || "").trim() : "";
        const rawQuantity = row[quantityIdx];

        if (!rawDate || !rawQuantity) continue;

        // Parse date
        let parsedDate: Date;
        if (typeof rawDate === "number") {
          // Excel serial date
          parsedDate = new Date((rawDate - 25569) * 86400 * 1000);
        } else {
          parsedDate = new Date(rawDate);
        }

        if (isNaN(parsedDate.getTime())) continue;

        if (!firstValidDate) {
          firstValidDate = parsedDate;
        }

        // Parse time
        let timeStr: string | null = null;
        if (rawTime) {
          if (typeof rawTime === "number") {
            const totalMinutes = Math.round(rawTime * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
          } else {
            timeStr = String(rawTime);
          }
        }

        // Parse quantity
        const liters = parseFloat(String(rawQuantity).replace(",", "."));
        if (isNaN(liters) || liters <= 0) continue;

        // Normalize company name
        let company = rawCompany.toUpperCase();
        if (company.includes("LIMNIA")) company = "Limnia";
        else if (company.includes("UNIFRUIT")) company = "Unifruit";
        else if (company.includes("HRC")) company = "HRC";
        else company = "Other";

        // Try to auto-match asset by company
        const matchedAsset = assets.find(a => 
          a.company === company
        );

        records.push({
          date: parsedDate.toISOString().split("T")[0],
          time: timeStr,
          company,
          liters,
          assetId: matchedAsset?.id,
          assetName: matchedAsset?.name,
          status: matchedAsset ? "matched" : "pending",
        });
      }

      if (records.length === 0) {
        toast.error("No valid fuel records found in the Excel file");
        setIsParsing(false);
        return;
      }

      // Set month based on first date
      if (firstValidDate) {
        const monthStr = `${firstValidDate.getFullYear()}-${String(firstValidDate.getMonth() + 1).padStart(2, "0")}-01`;
        setSelectedMonth(monthStr);
      }

      setParsedRecords(records);
      toast.success(`Parsed ${records.length} fuel records from Excel`);
    } catch (error) {
      console.error("Error parsing Excel:", error);
      toast.error("Failed to parse Excel file");
    } finally {
      setIsParsing(false);
    }
  };

  const updateRecordAsset = (index: number, assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    setParsedRecords(prev => prev.map((record, i) => {
      if (i !== index) return record;
      return {
        ...record,
        assetId,
        assetName: asset?.name,
        status: "matched" as const,
      };
    }));
  };

  const removeRecord = (index: number) => {
    setParsedRecords(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    const validRecords = parsedRecords.filter(r => r.assetId && r.status === "matched");
    
    if (validRecords.length === 0) {
      toast.error("Please assign trucks to all fuel records before uploading");
      return;
    }

    if (!selectedMonth) {
      toast.error("Please confirm the month for these records");
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const recordsToInsert = validRecords.map(record => ({
        asset_id: record.assetId!,
        company: record.company,
        record_date: record.date,
        record_time: record.time,
        liters: record.liters,
        month_year: selectedMonth,
        created_by: user?.id,
      }));

      const { error } = await supabase
        .from("fuel_records")
        .upsert(recordsToInsert, { 
          onConflict: "asset_id,record_date,record_time",
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast.success(`Successfully uploaded ${validRecords.length} fuel records`);
      setParsedRecords([]);
      setFile(null);
      setSelectedMonth("");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload fuel records");
    } finally {
      setIsUploading(false);
    }
  };

  const matchedCount = parsedRecords.filter(r => r.status === "matched").length;
  const pendingCount = parsedRecords.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Upload Fuel Report
          </CardTitle>
          <CardDescription>
            Upload an Excel file with columns: Date, Time (optional), Company (Limnia/Unifruit/HRC), Quantity (liters)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="excel-file">Excel File</Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={isParsing}
                className="mt-1"
              />
            </div>
            {selectedMonth && (
              <div className="w-full md:w-48">
                <Label>Report Month</Label>
                <Input
                  type="month"
                  value={selectedMonth.substring(0, 7)}
                  onChange={(e) => setSelectedMonth(e.target.value + "-01")}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          {isParsing && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Parsing Excel file...
            </div>
          )}
        </CardContent>
      </Card>

      {parsedRecords.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Parsed Records</CardTitle>
                <CardDescription>
                  Assign trucks to each fuel record before uploading
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                    <Check className="w-3 h-3 mr-1" />
                    {matchedCount} matched
                  </Badge>
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {pendingCount} pending
                    </Badge>
                  )}
                </div>
                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading || matchedCount === 0}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? "Uploading..." : `Upload ${matchedCount} Records`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Liters</TableHead>
                    <TableHead>Truck</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRecords.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.time || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.company}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{record.liters.toFixed(1)} L</TableCell>
                      <TableCell>
                        <Select
                          value={record.assetId || ""}
                          onValueChange={(value) => updateRecordAsset(index, value)}
                        >
                          <SelectTrigger className={record.status === "matched" ? "border-green-500" : "border-yellow-500"}>
                            <SelectValue placeholder="Select truck" />
                          </SelectTrigger>
                          <SelectContent>
                            {assets
                              .filter(a => a.company === record.company || record.company === "Other")
                              .map(asset => (
                                <SelectItem key={asset.id} value={asset.id}>
                                  {asset.name} ({asset.asset_id})
                                </SelectItem>
                              ))}
                            {assets.length > 0 && (
                              <>
                                <div className="px-2 py-1 text-xs text-muted-foreground border-t">All trucks</div>
                                {assets.map(asset => (
                                  <SelectItem key={`all-${asset.id}`} value={asset.id}>
                                    {asset.name} ({asset.asset_id}) - {asset.company}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRecord(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
