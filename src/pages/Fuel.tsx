import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FuelUpload } from "@/components/FuelUpload";
import { FuelReports } from "@/components/FuelReports";
import { Fuel as FuelIcon, Upload, BarChart3 } from "lucide-react";

export default function Fuel() {
  return (
    <Layout>
      <div className="min-h-screen pb-24">
        <div className="p-4 md:p-8">
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <FuelIcon className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-foreground">Fuel Consumption</h1>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              Upload monthly diesel reports and analyze fuel consumption across your fleet
            </p>
          </div>

          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Report
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <FuelUpload />
            </TabsContent>

            <TabsContent value="reports">
              <FuelReports />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
