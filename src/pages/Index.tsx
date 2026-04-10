import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Users,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Lock,
  Globe,
  Headphones,
  Award,
  BarChart3,
  Clock,
  CheckSquare,
  FileText,
  Bell,
  Database,
  ChevronRight,
  Play,
  Check,
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: "Personalmanagement",
      description:
        "Mitarbeiterdaten, Abteilungen, Stellenprofile und Risikogruppen auf einer einzigen sicheren Plattform zentralisieren.",
      color: "from-blue-500 to-blue-600",
      hoverColor: "hover:border-blue-500",
    },
    {
      icon: AlertTriangle,
      title: "Risikobewertungen",
      description:
        "Durchführung von umfassenden Risikobewertungen und Nachverfolgung von Risikominderungsmaßnahmen.",
      color: "from-amber-500 to-amber-600",
      hoverColor: "hover:border-amber-500",
    },
    {
      icon: FileCheck,
      title: "Sicherheitsaudits",
      description:
        "Sicherheitsaudits planen, durchführen und nachverfolgen - mit detaillierter Dokumentation für maximale Transparenz und Compliance.",
      color: "from-blue-500 to-blue-600",
      hoverColor: "hover:border-blue-500",
    },
    {
      icon: CheckCircle,
      title: "Schulungsmanagement",
      description:
        "Weisen Sie Sicherheitsschulungen zu und organisieren Sie sie einfach und effizient – alles zentral an einem Ort.",
      color: "from-green-500 to-green-600",
      hoverColor: "hover:border-green-500",
    },
    {
      icon: TrendingUp,
      title: "Analytik und Berichterstattung",
      description:
        "Umfassende Dashboards und Berichte zur Überwachung der Compliance und für datengestützte Entscheidungen.",
      color: "from-blue-500 to-blue-600",
      hoverColor: "hover:border-blue-500",
    },
    {
      icon: Shield,
      title: "Vorfall- und Gefahrenmeldung",
      description:
        "Melden Sie Vorfälle und Gefahren direkt im System und sorgen Sie für schnelle Reaktionen, transparente Dokumentation und lückenlose Nachverfolgung.",
      color: "from-green-500 to-green-600",
      hoverColor: "hover:border-green-500",
    },
  ];

  const benefits = [
    {
      icon: Zap,
      title: "Schneller Einstieg",
      desc: "In wenigen Minuten startklar, ohne lange Implementierungsprozesse",
    },
    {
      icon: Lock,
      title: "Maximale Sicherheit",
      desc: "Ihre Daten sind geschützt nach höchsten Sicherheitsstandards",
    },
    {
      icon: Globe,
      title: "Zugriff von überall",
      desc: "Arbeiten Sie flexibel, egal ob Büro, Baustelle oder unterwegs",
    },
    {
      icon: Headphones,
      title: "Rundum-Support",
      desc: "Unser Team unterstützt Sie jederzeit bei Fragen und Problemen",
    },
  ];

  const testimonials = [
    {
      quote:
        "SafetyHub transformed our HSE operations. We've reduced incident response time by 60% and improved compliance tracking significantly.",
      author: "Sarah Johnson",
      role: "HSE Manager",
      company: "Industrial Corp",
    },
    {
      quote:
        "The intuitive interface and powerful automation features saved our team countless hours. Best investment we've made in workplace safety.",
      author: "Michael Chen",
      role: "Safety Director",
      company: "Manufacturing Inc",
    },
    {
      quote:
        "Real-time dashboards and comprehensive reporting make audits effortless. Our compliance rate improved from 85% to 98% in 6 months.",
      author: "Emma Williams",
      role: "Operations Manager",
      company: "Energy Solutions",
    },
  ];

  const pricingPlans = [
    {
      name: "Package S",
      subtitle: "HSE Basic - The digital entry point",
      price: "29.99€",
      period: "month",
      description:
        "For small businesses that want to digitise HSE for the first time.",
      users: "5 users included (1 admin + 4 users)",
      features: [
        "Dashboard (examinations, due dates, documents)",
        "Employee management (master data, files)",
        "Examination management (G examinations, appointments, planning)",
        "Document management (PDF, images) (5 GB Storage)",
        "Standard reports (CSV/PDF export)",
        "GDPR export & account deletion",
        "Task list",
        "Roles & permissions (doctor, admin, company, employee)",
      ],
      color: "from-blue-500 to-blue-600",
      borderColor: "border-blue-200",
      popular: false,
    },
    {
      name: "Package M",
      subtitle: "HSE Pro - Structured teamwork",
      price: "79.99€",
      period: "month",
      description: "For SMEs that need processes, roles and traceability.",
      users: "10 users",
      features: [
        "Everything from Basic + Pro features",
        "Incident and near-miss reports",
        "Risk assessments (GBU module)",
        "Action tracking",
        "Advanced task management (assignments + status)",
        "Automatic reminders & email notifications",
        "Partner integrations via API token (e.g. laboratory / doctor / service provider)",
      ],
      color: "from-green-500 to-green-600",
      borderColor: "border-green-500",
      popular: true,
    },
    {
      name: "Package L",
      subtitle: "HSE Enterprise - For large SMEs & groups",
      price: "149€",
      period: "month",
      description: "All professional HSE functions at organisational level.",
      users: "unlimited",
      features: [
        "Everything from Basic + Pro + Enterprise",
        "Training management",
        "Courses (up to 20 courses)",
        "Progress tracking",
        "Certificates (PDF)",
        "Audit management",
        "Multi-client (multiple locations/companies)",
        "Cross-location reports",
        "Complete API suite",
        "Priority Support",
      ],
      color: "from-purple-500 to-purple-600",
      borderColor: "border-purple-200",
      popular: false,
    },
  ];

  const allFeatures = [
    { name: "User", basic: "5", pro: "10", enterprise: "unbegrenzt" },
    { name: "Dashboard", basic: true, pro: true, enterprise: true },
    { name: "Employee management", basic: true, pro: true, enterprise: true },
    { name: "Investigations", basic: true, pro: true, enterprise: true },
    { name: "incidents", basic: false, pro: true, enterprise: true },
    { name: "GBU", basic: false, pro: true, enterprise: true },
    { name: "Measures", basic: false, pro: true, enterprise: true },
    { name: "Training management", basic: false, pro: false, enterprise: true },
    { name: "Audit-Management", basic: false, pro: false, enterprise: true },
    { name: "Partner-API", basic: false, pro: true, enterprise: true },
    { name: "Priority Support", basic: false, pro: false, enterprise: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation Header */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl blur opacity-25"></div>
                <img
                  src="/logo.png"
                  alt="SafetyHub Logo"
                  className="h-12 w-12 relative z-10"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  SafetyHub
                </h1>
                <p className="text-xs text-gray-600">HSE Management Platform</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <a
                href="#features"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Funktionen
              </a>
              <a
                href="#benefits"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Vorteile
              </a>
              <a
                href="#testimonials"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Bewertungen
              </a>
              <a
                href="#pricing"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Preise
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="hidden sm:flex"
              >
                Login
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all"
              >
                Jetzt Starten <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <Badge className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-green-50 text-blue-700 border-blue-200 text-sm font-semibold">
              <Star className="h-4 w-4 fill-blue-600 text-blue-600" />
              <span>Ihr Partner für modernes HSE-Management</span>
            </Badge>

            <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
              Weniger Risiken.{" "}
              <span className="bg-gradient-to-r from-blue-600 via-green-600 to-blue-600 bg-clip-text text-transparent animate-gradient">
                Mehr Kontrolle. Maximale
              </span>{" "}
              Sicherheit.
            </h1>

            <p className="text-xl lg:text-2xl text-gray-600 leading-relaxed">
              Optimieren Sie Ihr HSE-Management zentral an einem Ort: Führen Sie Risikobewertungen durch, planen
              Sie Audits, verwalten Sie Schulungen und behalten Sie Compliance jederzeit im Blick. Arbeiten Sie
              effizienter, minimieren Sie Vorfälle und sorgen Sie für ein sicheres, gut organisiertes Unternehmen.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/register")}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg h-16 px-10 shadow-xl hover:shadow-2xl transition-all group"
              >
                Testversion starten
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg h-16 px-10 border-2 hover:border-blue-600 hover:bg-blue-50 transition-all group"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Check className="h-5 w-5 text-green-600" />
              <span>No credit card required</span>
              <span className="text-gray-300">•</span>
              <Check className="h-5 w-5 text-green-600" />
              <span>14-day free trial</span>
              <span className="text-gray-300">•</span>
              <Check className="h-5 w-5 text-green-600" />
              <span>Cancel anytime</span>
            </div>
          </div>

          <div className="relative">
            <div className="relative z-10 bg-gradient-to-br from-blue-500 via-blue-600 to-green-500 rounded-3xl p-1 shadow-2xl hover:shadow-3xl transition-shadow">
              <div className="bg-white rounded-2xl p-8 lg:p-12">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 border-2 border-blue-100 hover:border-blue-300 transition-colors">
                    <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
                    <div className="text-2xl font-bold text-gray-900">98%</div>
                    <div className="text-xs text-gray-600">Risk Mitigation</div>
                  </Card>
                  <Card className="p-4 border-2 border-green-100 hover:border-green-300 transition-colors">
                    <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                    <div className="text-2xl font-bold text-gray-900">100%</div>
                    <div className="text-xs text-gray-600">Compliance</div>
                  </Card>
                  <Card className="p-4 border-2 border-blue-100 hover:border-blue-300 transition-colors">
                    <Clock className="h-8 w-8 text-blue-500 mb-2" />
                    <div className="text-2xl font-bold text-gray-900">60%</div>
                    <div className="text-xs text-gray-600">Time Saved</div>
                  </Card>
                  <Card className="p-4 border-2 border-green-100 hover:border-green-300 transition-colors">
                    <TrendingUp className="h-8 w-8 text-green-500 mb-2" />
                    <div className="text-2xl font-bold text-gray-900">45%</div>
                    <div className="text-xs text-gray-600">Incident ↓</div>
                  </Card>
                </div>
              </div>
            </div>
            <div className="absolute -top-8 -right-8 w-80 h-80 bg-blue-200 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-8 -left-8 w-80 h-80 bg-green-200 rounded-full blur-3xl opacity-20 animate-pulse delay-700"></div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, idx) => (
            <Card
              key={idx}
              className="border-2 hover:shadow-lg transition-all group cursor-pointer"
            >
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-green-100 mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <benefit.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-600">{benefit.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section
        id="features"
        className="container mx-auto px-4 py-20 bg-gradient-to-b from-transparent via-gray-50 to-transparent"
      >
        <div className="text-center mb-16 space-y-4">
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            Leistungsstarke Funktionen
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold">
            Ihr Komplettpaket für{" "}
            <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Sicherheit, Schulung und Compliance
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Umfassende Tools zur Verwaltung aller Aspekte Ihres HSE-Betriebs auf
            einer integrierten Plattform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <Card
              key={idx}
              className={`border-2 ${feature.hoverColor} hover:shadow-2xl transition-all duration-300 group cursor-pointer`}
            >
              <CardContent className="pt-8 pb-6 px-6">
                <div
                  className={`flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  {feature.description}
                </p>
                <Button
                  variant="ghost"
                  className="p-0 h-auto text-blue-600 hover:text-blue-700 group/btn"
                >
                  Learn more
                  <ChevronRight className="ml-1 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16 space-y-4">
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <Award className="h-3 w-3 mr-1" />
            Customer Success Stories
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold">
            Loved by Safety Professionals Worldwide
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See how organizations transformed their HSE operations with
            SafetyHub
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, idx) => (
            <Card
              key={idx}
              className="border-2 hover:shadow-xl transition-all hover:-translate-y-2 duration-300"
            >
              <CardContent className="p-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-gray-700 italic mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">
                      {testimonial.author}
                    </div>
                    <div className="text-sm text-gray-600">
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="container mx-auto px-4 py-20 bg-gradient-to-b from-transparent via-blue-50 to-transparent"
      >
        <div className="text-center mb-16 space-y-4">
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            Simple Pricing
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold">
            One Plan,{" "}
            <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              All Features
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            No hidden fees. Cancel anytime. Scale as you grow.
          </p>
        </div>

        {/* Three Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {pricingPlans.map((plan, idx) => (
            <Card
              key={idx}
              className={`${
                plan.popular
                  ? "border-4 border-green-500 shadow-2xl scale-105"
                  : "border-2 " + plan.borderColor
              } relative overflow-hidden hover:shadow-xl transition-all`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 text-xs font-bold">
                  MOST POPULAR
                </div>
              )}
              <CardContent className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm font-semibold text-gray-700 mb-4">
                    {plan.subtitle}
                  </p>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-5xl font-bold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent">
                      {plan.price}
                    </span>
                    <span className="text-gray-600">/ {plan.period}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {plan.description}
                  </p>
                  <p className="text-sm font-semibold text-blue-600">
                    {plan.users}
                  </p>
                </div>

                <div className="space-y-3 mb-8">
                  <p className="font-bold text-sm mb-3">Features</p>
                  {plan.features.map((feature, fidx) => (
                    <div key={fidx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  size="lg"
                  onClick={() => navigate("/register")}
                  className={`w-full ${
                    plan.popular
                      ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                      : "bg-gradient-to-r " + plan.color
                  } text-white h-12 shadow-lg hover:shadow-xl transition-all`}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* All Features Comparison Table */}
        <div className="max-w-5xl mx-auto">
          <Card className="border-2">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2">
                    <tr>
                      <th className="text-left p-4 font-bold text-gray-900">
                        Function
                      </th>
                      <th className="text-center p-4 font-bold text-blue-700">
                        Basic
                      </th>
                      <th className="text-center p-4 font-bold text-green-700">
                        Pro
                      </th>
                      <th className="text-center p-4 font-bold text-purple-700">
                        Enterprise
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allFeatures.map((feature, idx) => (
                      <tr
                        key={idx}
                        className={`border-b ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="p-4 font-medium text-gray-900">
                          {feature.name}
                        </td>
                        <td className="p-4 text-center">
                          {typeof feature.basic === "boolean" ? (
                            feature.basic ? (
                              <Check className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <span className="text-gray-400">—</span>
                            )
                          ) : (
                            <span className="font-semibold text-blue-700">
                              {feature.basic}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {typeof feature.pro === "boolean" ? (
                            feature.pro ? (
                              <Check className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <span className="text-gray-400">—</span>
                            )
                          ) : (
                            <span className="font-semibold text-green-700">
                              {feature.pro}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {typeof feature.enterprise === "boolean" ? (
                            feature.enterprise ? (
                              <Check className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <span className="text-gray-400">—</span>
                            )
                          ) : (
                            <span className="font-semibold text-purple-700">
                              {feature.enterprise}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="mt-12">
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-center mb-6">
                  Available Add-ons
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">
                        Basic Safety Course Bundle
                      </h4>
                      <Badge variant="secondary">€149/year</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Essential safety training courses for your team
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">
                        QuickStart
                      </h4>
                      <Badge variant="secondary">€149 one-time</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Fast-track onboarding and setup assistance
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">
                        Priority Support
                      </h4>
                      <Badge variant="secondary">€49/month</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Dedicated support with faster response times
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">
                        Multi-site Basic
                      </h4>
                      <Badge variant="secondary">€99/month</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Up to 3 locations (€29/additional site)
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">
                        Custom Course Upload
                      </h4>
                      <Badge variant="secondary">€49/month</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Upload and manage your own training content
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="mb-3">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Storage+
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">50GB</span>
                          <Badge variant="outline">€19/month</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">200GB</span>
                          <Badge variant="outline">€59/month</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Unlimited</span>
                          <Badge variant="outline">€149/month</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                No credit card required • Cancel anytime • 24/7 support
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-blue-600 via-blue-700 to-green-600 border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:20px_20px]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          <CardContent className="p-12 lg:p-20 text-center relative z-10">
            <div className="max-w-4xl mx-auto space-y-8">
              <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-4 py-2">
                <Bell className="h-4 w-4 mr-2" />
                Join 500+ Organizations Today
              </Badge>

              <h2 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
                Ready to Transform Your Safety Management?
              </h2>

              <p className="text-xl lg:text-2xl text-blue-50 leading-relaxed">
                Join organizations worldwide who trust SafetyHub for their HSE
                compliance and safety operations. Start your free trial today—no
                credit card required.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  size="lg"
                  onClick={() => navigate("/register")}
                  className="bg-white text-blue-700 hover:text-black hover:bg-gray-100 text-lg h-16 px-12 shadow-2xl hover:shadow-3xl transition-all group"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white  hover:bg-white text-blue-700 text-lg h-16 px-12 transition-all"
                >
                 Contact us
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-white/90">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  <span>7-day free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  <span>No credit card needed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/logo.png"
                  
                  className="h-12 w-12"
                />
                <div>
                  <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                    SafetyHub
                  </p>
                  <p className="text-xs text-gray-600">
                    HSE Management Platform
                  </p>
                </div>
              </div>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Empowering organizations to create safer workplaces through
                innovative HSE management solutions.
              </p>
              <div className="flex gap-3">
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-blue-50"
                >
                  SOC 2 Certified
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-green-50"
                >
                  ISO 27001
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-3 text-gray-600">
                <li>
                  <a
                    href="#features"
                    className="hover:text-blue-600 transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="hover:text-blue-600 transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600 transition-colors">
                    Security
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600 transition-colors">
                    Integrations
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-3 text-gray-600">
                <li>
                  <a href="#" className="hover:text-blue-600 transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600 transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600 transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600 transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t">
            <p className="text-sm text-gray-600">
              © 2025 SafetyHub. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-gray-600">
              <a href="#" className="hover:text-blue-600 transition-colors">
                Status
              </a>
              <a href="#" className="hover:text-blue-600 transition-colors">
                Documentation
              </a>
              <a href="#" className="hover:text-blue-600 transition-colors">
                API
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
