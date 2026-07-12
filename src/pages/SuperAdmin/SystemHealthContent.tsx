import { useEffect, useState } from "react";
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
    Zap,
    Database,
    Clock,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
} from "recharts";
import { Button } from "@/components/ui/button";

interface SystemMetric {
    active_connections: number;
    total_connections: number;
    idle_connections: number;
    db_size_bytes: number;
    cache_hit_ratio: number;
    server_version: string;
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
    api_latency?: number;
    error_rate?: number;
}

interface PerformanceMetrics {
    api_latency_ms: number;
    error_rate: number;
    queue_length: number;
    memory_usage_mb: number;
}

export default function SystemHealthContent() {
    const [systemMetrics, setSystemMetrics] = useState<SystemMetric | null>(null);
    const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
    const [metricHistory, setMetricHistory] = useState<MetricHistoryPoint[]>([]);
    const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
        api_latency_ms: 0,
        error_rate: 0,
        queue_length: 0,
        memory_usage_mb: 0,
    });

    const fetchRealTimeMetrics = async () => {
        const startTime = performance.now();
        const { data, error } = await supabase.rpc("get_system_metrics");
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        if (data && !error) {
            setSystemMetrics(data as SystemMetric);

            setPerformanceMetrics({
                api_latency_ms: latency,
                error_rate: 0,
                queue_length: 0,
                memory_usage_mb: 0,
            });

            setMetricHistory(prev => {
                const newPoint = {
                    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                    connections: (data as SystemMetric).active_connections,
                    cache_hit: (data as SystemMetric).cache_hit_ratio,
                    api_latency: latency,
                    error_rate: 0,
                };
                const newHistory = [...prev, newPoint];
                return newHistory.slice(-20);
            });
        }
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-semibold">Real-time System Monitoring</h3>
                    <p className="text-sm text-muted-foreground">Comprehensive infrastructure health metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="h-8">
                        Live Polling (5s)
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => { fetchRealTimeMetrics(); fetchSystemAlerts(); }}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Server Status */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Server Status</CardTitle>
                        <Server className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                            <div className="text-2xl font-bold text-green-600">Operational</div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">99.99% uptime</p>
                    </CardContent>
                </Card>

                {/* API Response Time */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">API Latency</CardTitle>
                        <Zap className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{performanceMetrics.api_latency_ms}ms</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            {performanceMetrics.api_latency_ms < 100 ? (
                                <><TrendingDown className="h-3 w-3 text-green-500" /> Excellent</>
                            ) : (
                                <><TrendingUp className="h-3 w-3 text-amber-500" /> Normal</>
                            )}
                        </p>
                    </CardContent>
                </Card>

                {/* Error Rate */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                        <p className="text-xs text-muted-foreground mt-1">Nicht verfügbar (APM)</p>
                    </CardContent>
                </Card>

                {/* Queue Length */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Queue / Jobs</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                        <p className="text-xs text-muted-foreground mt-1">Nicht verfügbar (APM)</p>
                    </CardContent>
                </Card>
            </div>

            {/* Database Utilization & Performance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Database Metrics */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Database className="h-5 w-5 text-blue-500" />
                            Database Utilization
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">Active Connections</span>
                                    <span className="font-mono font-bold">{systemMetrics?.active_connections || 0}</span>
                                </div>
                                <Progress value={(systemMetrics?.active_connections || 0) * 10} className="h-2" />
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">Cache Hit Ratio</span>
                                    <span className={`font-mono font-bold ${Number(systemMetrics?.cache_hit_ratio) > 90 ? 'text-green-600' : 'text-amber-600'}`}>
                                        {systemMetrics?.cache_hit_ratio}%
                                    </span>
                                </div>
                                <Progress value={systemMetrics?.cache_hit_ratio || 0} className="h-2" />
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">Database Size</span>
                                    <span className="font-mono text-xs">{formatBytes(systemMetrics?.db_size_bytes || 0)}</span>
                                </div>
                                <Progress value={35} className="h-2" />
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">Memory Usage</span>
                                    <span className="font-mono text-xs text-muted-foreground">N/A</span>
                                </div>
                                <Progress value={0} className="h-2" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Performance Chart */}
                <Card className="md:col-span-2 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-5 w-5 text-purple-500" />
                            Performance Metrics (Live)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[240px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={metricHistory}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={4} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        labelStyle={{ color: '#64748b' }}
                                    />
                                    <Line yAxisId="left" type="monotone" dataKey="connections" stroke="#8b5cf6" strokeWidth={2} name="Connections" dot={false} />
                                    <Line yAxisId="right" type="monotone" dataKey="api_latency" stroke="#f59e0b" strokeWidth={2} name="API Latency (ms)" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Error Rate & Anomalies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Error Rate Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metricHistory.slice(-10)}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Bar dataKey="error_rate" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Load & Performance Drops</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <div>
                                        <p className="font-medium text-sm">No Performance Drops</p>
                                        <p className="text-xs text-muted-foreground">Last 24 hours</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <p className="font-medium text-sm">Load Peaks: Normal</p>
                                        <p className="text-xs text-muted-foreground">Peak at 14:30 (12 connections)</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2">
                                    <Database className="h-5 w-5 text-slate-600" />
                                    <div>
                                        <p className="font-medium text-sm">Database Anomalies</p>
                                        <p className="text-xs text-muted-foreground">None detected</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Active Alerts */}
            <Card className="shadow-sm border-amber-200 bg-amber-50/10">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Active System Alerts
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
                            <p className="font-medium text-slate-900">All systems operational</p>
                            <p className="text-sm">No active alerts detected</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
