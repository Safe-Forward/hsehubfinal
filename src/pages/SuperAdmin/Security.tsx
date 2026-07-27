import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import SecurityContent from "./SecurityContent";

export default function Security() {
    const { user, userRole, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && (!user || userRole !== "super_admin")) {
            navigate("/dashboard");
        }
    }, [user, userRole, loading, navigate]);

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
                <h2 className="text-3xl font-bold mb-2">Sicherheit & Compliance</h2>
                <p className="text-muted-foreground">
                    Sicherheitsereignisse, Anmeldeanomalien und DSGVO-Compliance überwachen
                </p>
            </div>
            <SecurityContent />
        </div>
    );
}
