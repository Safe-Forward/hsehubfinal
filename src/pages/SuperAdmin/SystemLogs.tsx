import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, FileCheck, Bug } from "lucide-react";

// Import the content components
import SystemHealthContent from "./SystemHealthContent";
import AuditLogsContent from "./AuditLogsContent";
import CrashReportsContent from "./CrashReportsContent";

export default function SystemLogs() {
    const { user, userRole, loading } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("health");

    if (!loading && (!user || userRole !== "super_admin")) {
        navigate("/dashboard");
        return null;
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-6">
                <h2 className="text-3xl font-bold mb-2">System &amp; Protokolle</h2>
                <p className="text-muted-foreground">
                    Systemzustand, Plattformaktivität und Absturzberichte überwachen
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full max-w-lg grid-cols-3">
                    <TabsTrigger value="health" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Systemzustand
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4" />
                        Prüfprotokolle
                    </TabsTrigger>
                    <TabsTrigger value="crashes" className="flex items-center gap-2">
                        <Bug className="h-4 w-4" />
                        Absturzberichte
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="health" className="space-y-6">
                    <SystemHealthContent />
                </TabsContent>

                <TabsContent value="logs" className="space-y-6">
                    <AuditLogsContent />
                </TabsContent>

                <TabsContent value="crashes" className="space-y-6">
                    <CrashReportsContent />
                </TabsContent>
            </Tabs>
        </div>
    );
}
