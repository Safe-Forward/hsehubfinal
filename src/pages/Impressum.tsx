import PublicLayout from "@/components/PublicLayout";

const Impressum = () => {
  return (
    <PublicLayout>
      <div className="min-h-[70vh] py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white/40 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-blue-600/10 to-green-600/10 p-8 border-b border-white/20">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Impressum
              </h1>
              <p className="text-gray-600 mt-2">Rechtliche Anbieterkennzeichnung</p>
            </div>
            
            <div className="p-8 lg:p-12 space-y-12 text-gray-700 leading-relaxed">
              {/* Company Info */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="h-6 w-1 bg-blue-600 rounded-full"></span>
                  Angaben gemäß § 5 TMG
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <p className="font-bold text-gray-900">Safe-Forward</p>
                    <p>Angfurtener Str. 1B</p>
                    <p>51674 Wiehl</p>
                    <p>Deutschland</p>
                  </div>
                  <div>
                    <p><span className="font-semibold">Telefon:</span> +49 163 760 5849</p>
                    <p><span className="font-semibold">E-Mail:</span> info@tech-forward.de</p>
                  </div>
                </div>
              </section>

              {/* Management */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="h-6 w-1 bg-green-600 rounded-full"></span>
                  Vertreten durch
                </h2>
                <p>Pavel Rohn</p>
              </section>

              {/* Registry */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="h-6 w-1 bg-blue-600 rounded-full"></span>
                  Registereintrag
                </h2>
                <p>Eintragung im Handelsregister.</p>
                <p>Registergericht: </p>
                <p>Registernummer: </p>
              </section>

              {/* VAT */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="h-6 w-1 bg-green-600 rounded-full"></span>
                  Umsatzsteuer-ID
                </h2>
                <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:</p>
                <p className="font-mono font-semibold"> </p>
              </section>

              {/* Disclaimer */}
              <section className="pt-8 border-t border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Rechtliche Hinweise</h2>
                <div className="space-y-4 text-sm text-gray-600">
                  <p>
                    Alle auf dieser Website veröffentlichten Inhalte (Texte, Grafiken, Bilder, Layout usw.) unterliegen dem Urheberrecht. Jede vom Urheberrechtsgesetz nicht zugelassene Verwertung bedarf vorheriger schriftlicher Zustimmung der jeweiligen Berechtigten.
                  </p>
                  <p>
                    Die Inhalte dieser Website werden mit größtmöglicher Sorgfalt recherchiert und implementiert. Eine Haftung für die Richtigkeit, Vollständigkeit und Aktualität dieser Website kann trotz sorgfältiger Prüfung nicht übernommen werden.
                  </p>
                  <p>
                    Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Impressum;
