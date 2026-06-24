import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout = ({ children }: PublicLayoutProps) => {
  const navigate = useNavigate();
  const { openSettings } = useCookieConsent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 font-sans">
      {/* Navigation Header */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <img src="/logo-full.svg" alt="Safe-Forward" className="h-8" />
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <a
                href="/#features"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Funktionen
              </a>
              <a
                href="/#benefits"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Vorteile
              </a>
              <a
                href="/#testimonials"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Bewertungen
              </a>
              <a
                href="/#pricing"
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

      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => navigate("/")}>
                <img src="/logo-full.svg" alt="Safe-Forward" className="h-8" />
              </div>
              <p className="text-gray-600 mb-4 leading-relaxed max-w-md">
                Wir unterstützen Unternehmen dabei, durch innovative Lösungen für das 
                Arbeitsschutzmanagement sicherere Arbeitsplätze zu schaffen.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t">
            <p className="text-sm text-gray-600">
              © 2025 Safe-Forward. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-gray-600">
              <a
                href="/impressum"
                className="hover:text-blue-600 transition-colors"
              >
                Impressum
              </a>
              <a
                href="/datenschutz"
                className="hover:text-blue-600 transition-colors"
              >
                Datenschutzerklärung
              </a>
              <a
                href="/avv"
                className="hover:text-blue-600 transition-colors"
              >
                AVV
              </a>
              <button
                onClick={openSettings}
                className="hover:text-blue-600 transition-colors"
              >
                Cookie-Einstellungen
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
