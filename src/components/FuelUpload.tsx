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

type MatchStatus = "matched" | "partial" | "not_found" | "no_company_assets";

interface ParsedFuelRecord {
  date: string;
  time: string | null;
  company: string;
  rawCompany: string;
  liters: number;
  rawTruck: string;
  assetId?: string;
  assetName?: string;
  matchStatus: MatchStatus;
  issueDetails?: string;
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

      // Debug: Log first few rows
      console.log("📊 Sheet names:", workbook.SheetNames);
      console.log("📊 First 5 rows:", jsonData.slice(0, 5));
      console.log("📊 Total rows:", jsonData.length);

      // Find header row with null checks
      const headerRow = jsonData.find(row => 
        row && Array.isArray(row) && row.some(cell => {
          if (cell === null || cell === undefined) return false;
          const cellStr = String(cell).toLowerCase();
          return cellStr.includes("date") || 
            cellStr.includes("quantity") ||
            cellStr.includes("company") ||
            cellStr.includes("department") ||
            cellStr.includes("truck") ||
            cellStr.includes("vehicle") ||
            cellStr.includes("liters");
        })
      );

      console.log("📊 Found header row:", headerRow);

      if (!headerRow) {
        toast.error("Could not find headers (Date, Company, Quantity) in the Excel file");
        console.error("❌ No header row found. First 5 rows:", jsonData.slice(0, 5));
        setIsParsing(false);
        return;
      }

      const headerIndex = jsonData.indexOf(headerRow);
      const headers = headerRow.map(h => h ? String(h).toLowerCase().trim() : "");
      
      console.log("📊 Header index:", headerIndex);
      console.log("📊 Normalized headers:", headers);

      // Find column indices
      const dateIdx = headers.findIndex(h => h.includes("date"));
      const timeIdx = headers.findIndex(h => h.includes("time"));
      const companyIdx = headers.findIndex(h => 
        h.includes("company") || 
        h.includes("department") || 
        h.includes("dept")
      );
      const quantityIdx = headers.findIndex(h => h.includes("quantity") || h.includes("liters") || h.includes("litres"));
      
      // Find truck/vehicle column - check for various possible headers
      const truckIdx = headers.findIndex(h => 
        h.includes("truck") || 
        h.includes("vehicle number") ||
        h.includes("vehicle no") ||
        h.includes("vehicle") || 
        h.includes("asset") || 
        h.includes("license") || 
        h.includes("plate") ||
        h.includes("registration") ||
        h.includes("reg no") ||
        h.includes("reg") ||
        h.includes("αριθμός") || // Greek
        h.includes("οχημα") || // Greek for vehicle
        h.includes("φορτηγό") // Greek for truck
      );

      // Debug: Show detected columns
      console.log("📊 Column indices - Date:", dateIdx, "Time:", timeIdx, "Company:", companyIdx, "Quantity:", quantityIdx, "Truck:", truckIdx);
      toast.info(`Columns found: Date[${dateIdx}], Company[${companyIdx}], Qty[${quantityIdx}], Vehicle[${truckIdx}]`);

      if (dateIdx === -1 || quantityIdx === -1) {
        toast.error("Excel must have Date and Quantity columns");
        console.error("❌ Missing required columns. Headers found:", headers);
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
        const rawTruck = truckIdx !== -1 ? String(row[truckIdx] || "").trim() : "";

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
        const rawCompanyUpper = rawCompany.toUpperCase();
        let company: string;
        if (rawCompanyUpper.includes("LIMNIA")) company = "Limnia";
        else if (rawCompanyUpper.includes("UNIFRUIT")) company = "Unifruit";
        else if (rawCompanyUpper.includes("HORECA") || rawCompanyUpper.includes("HRC")) company = "HRC";
        else company = "Other";

        // Try to match asset by truck name first, then by company
        let matchedAsset: Asset | undefined;
        let matchStatus: MatchStatus = "not_found";
        let issueDetails: string | undefined;
        let wasRSuffixStripped = false;
        
        if (rawTruck) {
          // Normalize truck name for matching (remove spaces, dashes, make uppercase)
          let normalizedTruck = rawTruck.replace(/[-\s.]/g, "").toUpperCase();
          
          // Try exact match first
          matchedAsset = assets.find(a => {
            const normalizedAssetName = a.name.replace(/[-\s.]/g, "").toUpperCase();
            const normalizedAssetId = a.asset_id.replace(/[-\s.]/g, "").toUpperCase();
            return normalizedAssetName === normalizedTruck || normalizedAssetId === normalizedTruck;
          });
          
          // If no match and truck ends with 'R', try without the R suffix
          if (!matchedAsset && normalizedTruck.endsWith("R") && normalizedTruck.length > 1) {
            const withoutR = normalizedTruck.slice(0, -1);
            matchedAsset = assets.find(a => {
              const normalizedAssetName = a.name.replace(/[-\s.]/g, "").toUpperCase();
              const normalizedAssetId = a.asset_id.replace(/[-\s.]/g, "").toUpperCase();
              return normalizedAssetName === withoutR || normalizedAssetId === withoutR;
            });
            if (matchedAsset) {
              wasRSuffixStripped = true;
            }
          }
          
          // Try partial match if still no match
          if (!matchedAsset) {
            matchedAsset = assets.find(a => {
              const normalizedAssetName = a.name.replace(/[-\s.]/g, "").toUpperCase();
              const normalizedAssetId = a.asset_id.replace(/[-\s.]/g, "").toUpperCase();
              return normalizedAssetName.includes(normalizedTruck) || normalizedTruck.includes(normalizedAssetName) ||
                     normalizedAssetId.includes(normalizedTruck) || normalizedTruck.includes(normalizedAssetId);
            });
          }
          
          // Handle forklift matching
          if (!matchedAsset && normalizedTruck.includes("FORKLIFT")) {
            matchedAsset = assets.find(a => 
              a.name.toLowerCase().includes("forklift") || 
              a.name.toLowerCase().includes("clark")
            );
            if (matchedAsset) {
              issueDetails = `Matched to ${matchedAsset.name}`;
            }
          }
        }
        
        // Check if company has any assets
        const companyHasAssets = assets.some(a => a.company === company);
        
        // Determine match status and issue details
        if (matchedAsset) {
          matchStatus = wasRSuffixStripped ? "partial" : "matched";
          if (wasRSuffixStripped) {
            issueDetails = `"${rawTruck}" → matched to "${matchedAsset.name}" (R suffix stripped)`;
          }
        } else if (!rawTruck) {
          issueDetails = "No vehicle number in Excel";
          matchStatus = "not_found";
        } else if (!companyHasAssets && company !== "Other") {
          matchStatus = "no_company_assets";
          issueDetails = `No ${company} assets in database`;
        } else {
          matchStatus = "not_found";
          issueDetails = `"${rawTruck}" not found in assets`;
        }

        records.push({
          date: parsedDate.toISOString().split("T")[0],
          time: timeStr,
          company,
          rawCompany,
          rawTruck,
          liters,
          assetId: matchedAsset?.id,
          assetName: matchedAsset?.name,
          matchStatus,
          issueDetails,
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
        matchStatus: "matched" as const,
        issueDetails: undefined,
      };
    }));
  };

  const removeRecord = (index: number) => {
    setParsedRecords(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllRecords = () => {
    setParsedRecords([]);
    setFile(null);
    setSelectedMonth("");
    toast.info("Upload cleared");
  };

  const handleUpload = async () => {
    const validRecords = parsedRecords.filter(r => r.assetId && (r.matchStatus === "matched" || r.matchStatus === "partial"));
    
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

  const matchedCount = parsedRecords.filter(r => r.matchStatus === "matched").length;
  const partialCount = parsedRecords.filter(r => r.matchStatus === "partial").length;
  const notFoundCount = parsedRecords.filter(r => r.matchStatus === "not_found").length;
  const noCompanyCount = parsedRecords.filter(r => r.matchStatus === "no_company_assets").length;
  const uploadableCount = matchedCount + partialCount;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Upload Fuel Report
          </CardTitle>
          <CardDescription>
            Upload an Excel file with columns: Date, Truck/Vehicle (license plate), Company (Limnia/Unifruit/HRC), Quantity (liters)
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
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                    <Check className="w-3 h-3 mr-1" />
                    {matchedCount} matched
                  </Badge>
                  {partialCount > 0 && (
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                      ⚠️ {partialCount} partial
                    </Badge>
                  )}
                  {notFoundCount > 0 && (
                    <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                      ❌ {notFoundCount} not found
                    </Badge>
                  )}
                  {noCompanyCount > 0 && (
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                      🏢 {noCompanyCount} no company assets
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="outline"
                  onClick={clearAllRecords}
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading || uploadableCount === 0}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? "Uploading..." : `Upload ${uploadableCount} Records`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vehicle (Excel)</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Liters</TableHead>
                    <TableHead>Assign Truck</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRecords.map((record, index) => (
                    <TableRow key={index} className={
                      record.matchStatus === "matched" ? "bg-green-500/5" :
                      record.matchStatus === "partial" ? "bg-amber-500/5" :
                      record.matchStatus === "no_company_assets" ? "bg-orange-500/5" :
                      "bg-red-500/5"
                    }>
                      <TableCell>
                        {record.matchStatus === "matched" && (
                          <Badge className="bg-green-500/20 text-green-700 border-green-500/30">✅ Matched</Badge>
                        )}
                        {record.matchStatus === "partial" && (
                          <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">⚠️ Partial</Badge>
                        )}
                        {record.matchStatus === "not_found" && (
                          <Badge className="bg-red-500/20 text-red-700 border-red-500/30">❌ Not Found</Badge>
                        )}
                        {record.matchStatus === "no_company_assets" && (
                          <Badge className="bg-orange-500/20 text-orange-700 border-orange-500/30">🏢 No Assets</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{record.date}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
                          {record.rawTruck || "-"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.company}</Badge>
                        {record.rawCompany && record.rawCompany.toUpperCase() !== record.company.toUpperCase() && (
                          <span className="text-xs text-muted-foreground ml-1">({record.rawCompany})</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{record.liters.toFixed(1)} L</TableCell>
                      <TableCell>
                        <Select
                          value={record.assetId || ""}
                          onValueChange={(value) => updateRecordAsset(index, value)}
                        >
                          <SelectTrigger className={
                            record.matchStatus === "matched" ? "border-green-500" : 
                            record.matchStatus === "partial" ? "border-amber-500" :
                            "border-red-500"
                          }>
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
                      <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                        {record.issueDetails || (record.matchStatus === "matched" ? "-" : "")}
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
