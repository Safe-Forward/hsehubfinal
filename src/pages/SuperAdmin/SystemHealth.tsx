import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Server,
    Activity,
    AlertTriangle,
    CheckCircle,
    XCircle,
    RotateCcw,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";

interface SystemMetric {
    active_connections: number;
    total_connections: number;
    idle_connections: number;
    db_size_bytes: number;
    cache_hit_ratio: number;
    server_version: string;
    uptime?: { days: number; hours: number; minutes: number; }; // Adjusted for interval
}

interface SystemAlert {
    id: string;
    title: string;
    message: string;
    severity: "low" | "medium" | "high" | "critical";
    status: "active" | "resolved" | "acknowledged";
    created_at: string;
}

interface MetricHistoryPoint {
    time: string;
    connections: number;
    cache_hit: number;
}

export default function SystemHealth() {
    const { user, userRole, loading } = useAuth();
    const navigate = useNavigate();

    const [systemMetrics, setSystemMetrics] = useState<SystemMetric | null>(null);
    const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
    const [metricHistory, setMetricHistory] = useState<MetricHistoryPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRealTimeMetrics = async () => {
        const { data, error } = await supabase.rpc("get_system_metrics");
        if (data && !error) {
            setSystemMetrics(data as SystemMetric);

            setMetricHistory(prev => {
                const newPoint = {
                    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                    connections: (data as SystemMetric).active_connections,
                    cache_hit: (data as SystemMetric).cache_hit_ratio
                };
                // Keep last 20 points
                const newHistory = [...prev, newPoint];
                return newHistory.slice(-20);
            });
        }
        setIsLoading(false);
    };

    const fetchSystemAlerts = async () => {
        const { data } = await supabase
            .from("system_alerts")
            .select("*")
            .eq("status", "active")
            .order("created_at", { ascending: false });

        if (data) setSystemAlerts(data as SystemAlert[]);
    };

    useEffect(() => {
        if (!loading && (!user || userRole !== "super_admin")) {
            navigate("/dashboard");
        }
    }, [user, userRole, loading, navigate]);

    useEffect(() => {
        fetchRealTimeMetrics();
        fetchSystemAlerts();

        const interval = setInterval(() => {
            fetchRealTimeMetrics();
            fetchSystemAlerts();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold mb-2">Systemzustand &amp; Leistung</h2>
                    <p className="text-muted-foreground">
                        Echtzeitüberwachung der Plattforminfrastruktur
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="h-8">
                        Live-Abfrage (5s)
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => { fetchRealTimeMetrics(); fetchSystemAlerts(); }}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Aktualisieren
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Real-time Status Cards */}
                <Card className="md:col-span-1 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Server className="h-5 w-5 text-blue-500" />
                            Systemstatus
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Serverstatus</span>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex gap-1 items-center px-3 py-1">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                    Betriebsbereit
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-xs text-muted-foreground block mb-1">Aktive Verbind.</span>
                                    <span className="font-mono font-bold text-2xl">{systemMetrics?.active_connections || "-"}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-xs text-muted-foreground block mb-1">Cache-Treffer</span>
                                    <span className={`font-mono font-bold text-2xl ${Number(systemMetrics?.cache_hit_ratio) > 90 ? 'text-green-600' : 'text-amber-600'}`}>
                                        {systemMetrics?.cache_hit_ratio ? `${systemMetrics.cache_hit_ratio}%` : "-"}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Datenbankgröße</span>
                                    <span>{formatBytes(systemMetrics?.db_size_bytes || 0)}</span>
                                </div>
                                <Progress value={45} className="h-2" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Real-time Live Chart */}
                <Card className="md:col-span-2 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="h-5 w-5 text-purple-500" />
                                Live-Leistungsmetriken
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[220px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metricHistory}>
                                    <defs>
                                        <linearGradient id="colorConn" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={4} />
                                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        labelStyle={{ color: '#64748b' }}
                                    />
                                    <Area type="monotone" dataKey="connections" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorConn)" name="Aktive Verbind." />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Critical Alerts */}
                <Card className="md:col-span-3 shadow-sm border-amber-200 bg-amber-50/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Aktive Systemwarnungen
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {systemAlerts.length > 0 ? (
                            <div className="space-y-3">
                                {systemAlerts.map((alert) => (
                                    <div key={alert.id} className={`flex items-start justify-between p-4 rounded-lg border shadow-sm bg-white ${alert.severity === 'critical' ? 'border-red-200' :
                                        alert.severity === 'high' ? 'border-amber-200' : 'border-slate-200'
                                        }`}>
                                        <div className="flex gap-4">
                                            {alert.severity === 'critical' ? <XCircle className="h-5 w-5 text-red-600 mt-1" /> :
                                                <AlertTriangle className="h-5 w-5 text-amber-600 mt-1" />}
                                            <div>
                                                <h4 className={`font-semibold ${alert.severity === 'critical' ? 'text-red-900' : 'text-slate-900'
                                                    }`}>{alert.title}</h4>
                                                <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'}>
                                                {alert.severity.toUpperCase()}
                                            </Badge>
                                            <p className="text-xs text-muted-foreground mt-2 font-mono">
                                                {new Date(alert.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-slate-50 rounded-lg dashed border-2 border-slate-200">
                                <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                                <p className="font-medium text-slate-900">Alle Systeme betriebsbereit</p>
                                <p className="text-sm">Keine aktiven Warnungen erkannt</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
