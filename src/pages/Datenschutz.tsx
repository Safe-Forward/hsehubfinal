import PublicLayout from "@/components/PublicLayout";

// ─────────────────────────────────────────────────────────────────────────────
// DATENSCHUTZERKLÄRUNG – HSE Hub
// Stand: Juni 2025
//
// ANBIETER AKTIV:
//   ✅ Hostinger (Domain)
//   ✅ Vercel (Hosting)
//   ✅ GitHub (Quellcode)
//   ✅ Supabase (Datenbank)
//   ✅ Stripe (Zahlungen)
//   ✅ Brevo (E-Mail-Versand)
//
// ANBIETER VORBEREITET (auskommentiert – aktivieren wenn live):
//   🔲 Google Analytics 4
//   🔲 Facebook Pixel
//   🔲 Hubspot
//
// TODO: Ersetze alle [PLATZHALTER] mit deinen echten Unternehmensdaten
// ─────────────────────────────────────────────────────────────────────────────

const LAST_UPDATED = "Juni 2026";

const TOC_SECTIONS = [
  { id: "verantwortlicher", number: "1", title: "Verantwortlicher" },
  { id: "grundsaetze", number: "2", title: "Grundsätze der Verarbeitung" },
  { id: "erhobene-daten", number: "3", title: "Erhobene Daten & Zwecke" },
  { id: "hosting", number: "4", title: "Hosting & Infrastruktur" },
  { id: "datenbank", number: "5", title: "Datenbank & Speicherung" },
  { id: "email-versand", number: "6", title: "E-Mail-Versand (Brevo)" },
  { id: "zahlungen", number: "7", title: "Zahlungsabwicklung (Stripe)" },
  { id: "code", number: "8", title: "Quellcodeverwaltung (GitHub)" },
  { id: "cookies", number: "9", title: "Cookies & Tracking" },
  { id: "analyse", number: "10", title: "Analyse-Tools" },
  { id: "auftragsverarbeitung", number: "11", title: "Auftragsverarbeitung (AVV)" },
  { id: "drittlaender", number: "12", title: "Drittlandübermittlungen" },
  { id: "rechte", number: "13", title: "Ihre Rechte" },
  { id: "sicherheit", number: "14", title: "Datensicherheit" },
];

const SectionHeading = ({ id, number, title, color = "blue" }: { id: string; number: string; title: string; color?: "blue" | "green" }) => (
  <h2 id={id} className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3 scroll-mt-8">
    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${color === "green" ? "bg-green-700" : "bg-blue-600"}`}>
      {number}
    </span>
    {title}
  </h2>
);

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">{children}</h3>
);

const InfoCard = ({ label, value, href }: { label: string; value: string; href?: string }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2 border-b border-gray-100 last:border-0">
    <span className="text-sm font-semibold text-gray-500 sm:w-44 flex-shrink-0">{label}</span>
    {href
      ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">{value}</a>
      : <span className="text-sm text-gray-700">{value}</span>
    }
  </div>
);

const ProviderBox = ({ name, address, country, privacyUrl, safeguard, note }: { name: string; address: string; country: string; privacyUrl: string; safeguard?: string; note?: string }) => (
  <div className="mt-4 p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
    <p className="font-semibold text-gray-800">{name}</p>
    <InfoCard label="Adresse" value={address} />
    <InfoCard label="Land" value={country} />
    <InfoCard label="Datenschutz" value={privacyUrl} href={privacyUrl} />
    {safeguard && <InfoCard label="Rechtsgrundlage" value={safeguard} />}
    {note && <p className="text-xs text-gray-500 pt-2 italic">{note}</p>}
  </div>
);

const RightItem = ({ article, title, description }: { article: string; title: string; description: string }) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0 mt-0.5">
      <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-md">{article}</span>
    </div>
    <div>
      <p className="font-semibold text-gray-800">{title}</p>
      <p className="text-sm text-gray-600 mt-0.5">{description}</p>
    </div>
  </div>
);

const LegalBasis = ({ basis, description }: { basis: string; description: string }) => (
  <li className="flex gap-3 items-start">
    <span className="flex-shrink-0 inline-block bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded mt-0.5">{basis}</span>
    <span className="text-sm text-gray-700">{description}</span>
  </li>
);

const Datenschutz = () => {
  return (
    <PublicLayout>
      <div className="min-h-[70vh] py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="bg-white/40 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden animate-fade-in">

            <div className="bg-gradient-to-r from-blue-600/10 to-green-600/10 p-8 lg:p-12 border-b border-white/20">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Datenschutzerklärung
              </h1>
              <p className="text-gray-600 mt-2">HSE Hub – Arbeitsschutz- & ERP-Software als SaaS</p>
              <p className="text-gray-400 text-sm mt-1">Stand: {LAST_UPDATED}</p>
            </div>

            <div className="px-8 lg:px-12 pt-8 pb-4">
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-6">
                <p className="text-sm font-semibold text-blue-700 mb-3 uppercase tracking-wide">Inhaltsverzeichnis</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {TOC_SECTIONS.map((s) => (
                    <a key={s.id} href={"#" + s.id} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline py-0.5">
                      <span className="text-blue-300 text-xs">{s.number}.</span>
                      {s.title}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-8 lg:px-12 pb-12 space-y-14 text-gray-700 leading-relaxed">

              <section>
                <SectionHeading id="verantwortlicher" number="1" title="Verantwortlicher (Art. 13 Abs. 1 lit. a DSGVO)" />
                <p className="mb-4">Verantwortlicher im Sinne der DSGVO und des BDSG ist:</p>
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                  <InfoCard label="Unternehmen" value="Safe-Forward" />
                  <InfoCard label="Anschrift" value="Angfurtener Str. 1B, 51674 Wiehl" />
                  <InfoCard label="Vertreten durch" value="Pavel Rohn" />
                  <InfoCard label="E-Mail" value="info@safe-forward.de" />
                  <InfoCard label="Telefon" value="+49 163 760 5849" />
                </div>
                <p className="mt-4 text-sm text-gray-500">
                  Einen gesetzlich verpflichtenden Datenschutzbeauftragten (§ 38 BDSG) bestellen wir, sofern die gesetzlichen Schwellenwerte erreicht werden.
                </p>
              </section>

              <section>
                <SectionHeading id="grundsaetze" number="2" title="Grundsätze der Datenverarbeitung" color="green" />
                <p>Wir verarbeiten personenbezogene Daten ausschließlich auf Grundlage der DSGVO. Maßgebliche Rechtsgrundlagen sind:</p>
                <ul className="mt-4 space-y-3">
                  <LegalBasis basis="Art. 6 I lit. a" description="Einwilligung der betroffenen Person (z. B. optionale Cookies, Newsletter)" />
                  <LegalBasis basis="Art. 6 I lit. b" description="Erfüllung eines Vertrages oder vorvertragliche Maßnahmen (z. B. Bereitstellung des SaaS-Dienstes)" />
                  <LegalBasis basis="Art. 6 I lit. c" description="Erfüllung einer rechtlichen Verpflichtung (z. B. Aufbewahrungspflichten nach HGB/AO)" />
                  <LegalBasis basis="Art. 6 I lit. f" description="Berechtigte Interessen (z. B. IT-Sicherheit, Missbrauchsprävention, Systemstabilität)" />
                </ul>
                <SubHeading>Speicherdauer</SubHeading>
                <p>Personenbezogene Daten werden gelöscht, sobald der Verarbeitungszweck entfällt und keine Aufbewahrungspflichten (6–10 Jahre nach § 257 HGB / § 147 AO) entgegenstehen.</p>
              </section>

              <section>
                <SectionHeading id="erhobene-daten" number="3" title="Erhobene Daten & Verarbeitungszwecke" />
                <SubHeading>3.1 Technische Zugriffsdaten (Serverlogs)</SubHeading>
                <p>Bei jedem Aufruf werden technische Daten automatisch erfasst:</p>
                <ul className="list-disc pl-6 mt-3 space-y-1 text-sm">
                  <li>IP-Adresse des zugreifenden Endgeräts</li>
                  <li>Datum, Uhrzeit und Dauer des Zugriffs</li>
                  <li>Aufgerufene URL / API-Endpunkt und HTTP-Methode</li>
                  <li>HTTP-Statuscode und übertragene Datenmenge</li>
                  <li>Referrer-URL (vorher besuchte Seite)</li>
                  <li>Browser- und Betriebssystem-Informationen (User-Agent)</li>
                  <li>Session-Token und Authentifizierungsmerkmale</li>
                </ul>
                <p className="text-sm text-gray-500 mt-2">Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Speicherdauer: max. 30 Tage.</p>

                <SubHeading>3.2 Registrierungs- und Kontodaten</SubHeading>
                <p>Bei der Erstellung eines Nutzerkontos verarbeiten wir:</p>
                <ul className="list-disc pl-6 mt-3 space-y-1 text-sm">
                  <li>Vorname, Nachname</li>
                  <li>Geschäftliche E-Mail-Adresse</li>
                  <li>Passwort (gehashed, bcrypt)</li>
                  <li>Rolle und Berechtigungsstufe (Admin, Mitarbeiter, Auditor etc.)</li>
                  <li>Organisations- und Standortzuordnung</li>
                  <li>Zeitpunkt der Kontoerstellung und letzte Anmeldung</li>
                </ul>
                <p className="text-sm text-gray-500 mt-2">Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).</p>

                <SubHeading>3.3 HSE-Prozessdaten (im Auftrag des Kunden)</SubHeading>
                <p>Im Rahmen der HSE-Software können weitere Daten der Mitarbeiter des Kunden verarbeitet werden:</p>
                <ul className="list-disc pl-6 mt-3 space-y-1 text-sm">
                  <li>Berufsbezeichnung, Abteilung, Kostenstelle</li>
                  <li>Qualifikationen, Zertifikate und Schulungsnachweise</li>
                  <li>Untersuchungen, Unfallberichte und Gefährdungsbeurteilungen</li>
                  <li>Auditprotokolle und Prüfergebnisse</li>
                  <li>Digitale Unterschriften bei genehmigungspflichtigen Vorgängen</li>
                  <li>Risikobewertungen</li>
                </ul>
                <p className="text-sm text-gray-500 mt-2">Diese Daten werden als Auftragsverarbeiter gemäß Art. 28 DSGVO im Auftrag des Kunden verarbeitet.</p>

                <SubHeading>3.4 Kontaktanfragen</SubHeading>
                <p>Bei Kontaktaufnahme per E-Mail speichern wir Name, E-Mail und Nachrichteninhalt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b/f DSGVO. Löschung nach 3 Jahren.</p>
              </section>

              <section>
                <SectionHeading id="hosting" number="4" title="Hosting & Infrastruktur" color="green" />
                <SubHeading>4.1 Vercel (Website-Hosting)</SubHeading>
                <p>Die Plattform wird über Vercel bereitgestellt. Dabei werden Serverlogs erhoben.</p>
                <ProviderBox
                  name="Vercel Inc."
                  address="440 N Barranca Ave #4133, Covina, CA 91723, USA"
                  country="USA"
                  privacyUrl="https://vercel.com/legal/privacy-policy"
                  safeguard="EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO)"
                  note="Vercel verarbeitet Daten in EU-Rechenzentren (Frankfurt) und den USA. Es besteht ein AVV mit Vercel."
                />
               <SubHeading>4.2 Hostinger (Domain & DNS)</SubHeading>
                <p>Die Domain ist bei Hostinger registriert. Hostinger verarbeitet Inhaberdaten des Domainregistranten.</p>
                <ProviderBox
                  name="Hostinger International Ltd."
                  address="61 Lordou Vironos Street, Larnaca 6023, Zypern"
                  country="Zypern (EU)"
                  privacyUrl="https://www.hostinger.com/privacy-policy"
                  safeguard="Art. 6 Abs. 1 lit. b DSGVO; Serverstandorte innerhalb der EU"
                />
              </section>

              <section>
                <SectionHeading id="datenbank" number="5" title="Datenbank & Speicherung (Supabase)" />
                <p>Für die Speicherung aller Anwendungsdaten setzen wir Supabase ein (PostgreSQL-basiert).</p>
                <ProviderBox
                  name="Supabase, Inc."
                  address="970 Toa Payoh North #07-04, Singapore 318992"
                  country="USA / EU-Rechenzentren wählbar"
                  privacyUrl="https://supabase.com/privacy"
                  safeguard="EU-Standardvertragsklauseln; Datenbankregion EU (Frankfurt) konfiguriert"
                  note="Alle Produktionsdaten werden in der EU-Region gespeichert. Es besteht ein AVV mit Supabase."
                />
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                  <strong>Hinweis für Kunden:</strong> Alle kundenbezogenen Daten werden verschlüsselt (AES-256 at rest, TLS in transit) in der EU gespeichert.
                </div>
              </section>

              <section>
                <SectionHeading id="email-versand" number="6" title="E-Mail-Versand (Brevo)" />
                <p>Für den Versand transaktionaler E-Mails (Registrierungsbestätigung, Passwort-Reset, Team-Einladungen, Aufgaben- und Fristen-Benachrichtigungen) setzen wir Brevo ein. Dabei werden Name, E-Mail-Adresse und der jeweilige E-Mail-Inhalt an Brevo übermittelt.</p>
                <ProviderBox
                  name="Brevo GmbH"
                  address="Köpenicker Str. 126, 10179 Berlin, Deutschland"
                  country="Deutschland"
                  privacyUrl="https://www.brevo.com/legal/privacypolicy/"
                  safeguard="Art. 6 Abs. 1 lit. b/f DSGVO; Verarbeitung innerhalb Deutschlands/der EU"
                  note="Brevo GmbH ist eine Tochtergesellschaft der Sendinblue SAS (Paris, Frankreich). Es besteht ein Auftragsverarbeitungsvertrag mit Brevo (https://www.brevo.com/legal/termsofuse/)."
                />
              </section>

              <section>
                <SectionHeading id="zahlungen" number="7" title="Zahlungsabwicklung (Stripe)" color="green" />
                <p>Für Zahlungen verwenden wir Stripe. Zahlungsdaten werden direkt an Stripe übermittelt. Wir speichern keine vollständigen Zahlungsmitteldaten.</p>
                <ProviderBox
                  name="Stripe Payments Europe, Ltd."
                  address="1 Grand Canal Street Lower, Grand Canal Dock, Dublin, D02 H210, Irland"
                  country="Irland (EU)"
                  privacyUrl="https://stripe.com/de/privacy"
                  safeguard="Art. 6 Abs. 1 lit. b DSGVO; PCI-DSS Level 1 zertifiziert"
                  note="Kreditkartendaten verlassen Ihren Browser nur verschlüsselt direkt zu Stripe."
                />
              </section>

              <section>
                <SectionHeading id="code" number="8" title="Quellcodeverwaltung (GitHub)" color="green" />
                <p>Der Quellcode wird in einem privaten Repository auf GitHub verwaltet. Produktionsdaten der Nutzer werden nicht auf GitHub gespeichert.</p>
                <ProviderBox
                  name="GitHub, Inc. (Microsoft Corporation)"
                  address="88 Colin P Kelly Jr St, San Francisco, CA 94107, USA"
                  country="USA"
                  privacyUrl="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement"
                  safeguard="EU-Standardvertragsklauseln (SCC)"
                  note="Nur Entwickler des HSE Hub haben Zugriff auf das Repository."
                />
              </section>

              <section>
                <SectionHeading id="cookies" number="9" title="Cookies & lokale Speicherung" />
                <p>Diese Website verwendet Cookies und vergleichbare Technologien.</p>
                <SubHeading>8.1 Technisch notwendige Cookies</SubHeading>
                <p className="text-sm mb-3">Diese Cookies sind für den sicheren Betrieb unerlässlich und erfordern keine Einwilligung (§ 25 Abs. 2 TDDDG):</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left p-3 font-semibold text-gray-700 border border-gray-200">Name</th>
                        <th className="text-left p-3 font-semibold text-gray-700 border border-gray-200">Zweck</th>
                        <th className="text-left p-3 font-semibold text-gray-700 border border-gray-200">Dauer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: "sb-*-auth-token", purpose: "Supabase Authentifizierungs-Session", duration: "7 Tage" },
                        { name: "sb-*-auth-token-code-verifier", purpose: "PKCE-Sicherheit bei OAuth-Login", duration: "Session" },
                        { name: "cookie-consent", purpose: "Speichert Ihre Cookie-Präferenzen", duration: "1 Jahr" },
                        { name: "__vercel_live_token", purpose: "Vercel Deployment-Vorschau (nur Entwickler)", duration: "Session" },
                        { name: "__hs_opt_out", purpose: "HubSpot Cookie-Opt-out Präferenz", duration: "13 Monate" },
                      ].map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="p-3 border border-gray-200 font-mono text-xs">{row.name}</td>
                          <td className="p-3 border border-gray-200">{row.purpose}</td>
                          <td className="p-3 border border-gray-200">{row.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <SubHeading>8.2 Analyse- und Marketing-Cookies (nur mit Einwilligung)</SubHeading>
                <p className="text-sm">Für Analyse- und Marketing-Zwecke setzen wir folgende Tools nur mit Ihrer ausdrücklichen Einwilligung ein (§ 25 Abs. 1 TDDDG i. V. m. Art. 6 Abs. 1 lit. a DSGVO). Sie können Ihre Einwilligung jederzeit über unsere Cookie-Einstellungen widerrufen.</p>
              </section>

              <section>
                <SectionHeading id="analyse" number="10" title="Analyse-Tools & Marketing" color="green" />
                <SubHeading>9.1 Google Analytics 4</SubHeading>
                <p>Mit Ihrer Einwilligung setzen wir Google Analytics 4 (GA4) ein. GA4 verwendet Cookies, um Nutzerverhalten zu analysieren (Seitenaufrufe, Verweildauer, Absprungrate). IP-Adressen werden vor der Übertragung an Google anonymisiert.</p>
                <ProviderBox
                  name="Google Ireland Ltd."
                  address="Gordon House, Barrow Street, Dublin 4, Irland"
                  country="USA / Irland"
                  privacyUrl="https://policies.google.com/privacy"
                  safeguard="EU-Standardvertragsklauseln; Data Processing Amendment abgeschlossen"
                  note="Measurement-ID: [G-XXXXXXXXXX]. Datenaufbewahrung: 14 Monate. Opt-out: https://tools.google.com/dlpage/gaoptout"
                />
                <SubHeading>9.2 Facebook Pixel (Meta)</SubHeading>
                <p>Mit Ihrer Einwilligung verwenden wir den Facebook Pixel. Der Pixel ermöglicht Remarketing auf Facebook und Instagram sowie die Messung der Wirksamkeit unserer Anzeigen.</p>
                <ProviderBox
                  name="Meta Platforms Ireland Ltd."
                  address="4 Grand Canal Square, Grand Canal Harbour, Dublin 2, Irland"
                  country="Irland / USA"
                  privacyUrl="https://www.facebook.com/privacy/policy/"
                  safeguard="EU-Standardvertragsklauseln"
                  note="Pixel-ID: [XXXXXXXXXXXXXXXXXX]. Widerspruch: https://www.facebook.com/ads/preferences/"
                />
                <SubHeading>9.3 HubSpot</SubHeading>
                <p>Mit Ihrer Einwilligung setzen wir HubSpot ein, eine CRM- und Marketing-Plattform. HubSpot erfasst das Verhalten von Website-Besuchern (aufgerufene Seiten, Verweildauer, Formularausfüllungen) und ermöglicht die Analyse von Marketing-Kampagnen sowie die Pflege von Kundenbeziehungen.</p>
                <ProviderBox
                  name="HubSpot, Inc."
                  address="25 First Street, 2nd Floor, Cambridge, MA 02141, USA"
                  country="USA"
                  privacyUrl="https://legal.hubspot.com/de/privacy-policy"
                  safeguard="EU-Standardvertragsklauseln (SCC); HubSpot EU-Infrastruktur verfügbar"
                  note="Portal-ID: [XXXXXXXX]. Opt-out: https://legal.hubspot.com/de/privacy-policy"
                />
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                  <strong>Hinweis:</strong> Alle drei Tools werden nur nach Ihrer aktiven Einwilligung über unser Cookie-Banner aktiviert. Ohne Einwilligung werden keine Daten an Google, Meta oder HubSpot übermittelt.
                </div>
              </section>

              <section>
                <SectionHeading id="auftragsverarbeitung" number="11" title="Auftragsverarbeitung (Art. 28 DSGVO)" />
                <p>Da der HSE Hub Daten der Mitarbeiter unserer Kunden verarbeitet, agieren wir als <strong>Auftragsverarbeiter</strong>. Mit jedem Kunden wird bei der Registrierung automatisch ein <a href="/avv" className="text-blue-600 hover:underline">Auftragsverarbeitungsvertrag (AVV)</a> abgeschlossen, der regelt:</p>
                <ul className="list-disc pl-6 mt-4 space-y-2 text-sm">
                  <li>Gegenstand, Dauer und Zweck der Verarbeitung</li>
                  <li>Art der Daten und Kategorien betroffener Personen</li>
                  <li>Pflichten und Rechte des Verantwortlichen (Kunden)</li>
                  <li>Technische und organisatorische Maßnahmen (TOM) gem. Art. 32 DSGVO</li>
                  <li>Einsatz und Genehmigung von Unterauftragsverarbeitern</li>
                  <li>Verfahren bei Datenpannen (Art. 33/34 DSGVO)</li>
                </ul>
              </section>

              <section>
                <SectionHeading id="drittlaender" number="12" title="Drittlandübermittlungen (Art. 44 ff. DSGVO)" color="green" />
                <p className="mb-4">Soweit Daten in Drittländer übermittelt werden, erfolgt dies auf Grundlage geeigneter Garantien gemäß Art. 46 DSGVO:</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left p-3 font-semibold text-gray-700 border border-gray-200">Anbieter</th>
                        <th className="text-left p-3 font-semibold text-gray-700 border border-gray-200">Land</th>
                        <th className="text-left p-3 font-semibold text-gray-700 border border-gray-200">Garantie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { provider: "Vercel", country: "USA", guarantee: "EU-SCC" },
                        { provider: "Supabase", country: "USA / EU-Region", guarantee: "EU-SCC + EU-Region konfiguriert" },
                        { provider: "GitHub", country: "USA", guarantee: "EU-SCC" },
                        { provider: "Google Analytics", country: "USA", guarantee: "EU-SCC" },
                        { provider: "Meta (Facebook Pixel)", country: "USA", guarantee: "EU-SCC" },
                        { provider: "HubSpot", country: "USA", guarantee: "EU-SCC" },
                        { provider: "Stripe", country: "Irland (EU)", guarantee: "Innerhalb EU" },
                        { provider: "Hostinger", country: "Zypern (EU)", guarantee: "Innerhalb EU" },
                        { provider: "Brevo", country: "Deutschland", guarantee: "Innerhalb Deutschlands" },
                      ].map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="p-3 border border-gray-200 font-medium">{row.provider}</td>
                          <td className="p-3 border border-gray-200">{row.country}</td>
                          <td className="p-3 border border-gray-200">{row.guarantee}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-gray-500 mt-3">SCC = EU-Standardvertragsklauseln gemäß Durchführungsbeschluss (EU) 2021/914.</p>
              </section>

              <section>
                <SectionHeading id="rechte" number="13" title="Ihre Rechte als betroffene Person" />
                <p className="mb-6">
                  Zur Geltendmachung Ihrer Rechte wenden Sie sich an: <a href="mailto:info@safe-forward.de" className="text-blue-600 hover:underline">info@safe-forward.de</a>. Wir antworten innerhalb von 30 Tagen (Art. 12 Abs. 3 DSGVO).
                </p>
                <div className="space-y-4">
                  <RightItem article="Art. 15" title="Auskunftsrecht" description="Sie können Auskunft über alle verarbeiteten Daten verlangen, einschließlich Zweck, Empfänger und Speicherdauer." />
                  <RightItem article="Art. 16" title="Recht auf Berichtigung" description="Sie können die Berichtigung unrichtiger oder Vervollständigung unvollständiger Daten verlangen." />
                  <RightItem article="Art. 17" title="Recht auf Löschung" description="Sie können die Löschung Ihrer Daten verlangen, sofern keine Aufbewahrungspflichten entgegenstehen." />
                  <RightItem article="Art. 18" title="Recht auf Einschränkung" description="Sie können die Einschränkung der Verarbeitung verlangen, z. B. wenn Sie die Richtigkeit bestreiten." />
                  <RightItem article="Art. 20" title="Recht auf Datenübertragbarkeit" description="Sie haben das Recht, Ihre Daten in einem maschinenlesbaren Format zu erhalten." />
                  <RightItem article="Art. 21" title="Widerspruchsrecht" description="Sie können der Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO jederzeit widersprechen." />
                  <RightItem article="Art. 7 Abs. 3" title="Widerruf der Einwilligung" description="Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen." />
                  <RightItem article="Art. 77" title="Beschwerderecht" description="Sie haben das Recht, sich bei der zuständigen Datenschutz-Aufsichtsbehörde zu beschweren. Liste: bfdi.bund.de" />
                </div>
              </section>

              <section>
                <SectionHeading id="sicherheit" number="14" title="Datensicherheit (Art. 32 DSGVO)" color="green" />
                <p className="mb-4">Wir setzen technische und organisatorische Maßnahmen ein:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: "🔒", title: "Transport-Verschlüsselung", desc: "TLS 1.2 / 1.3 für alle Datenübertragungen (HTTPS)" },
                    { icon: "🗄️", title: "Verschlüsselung at Rest", desc: "AES-256 für alle gespeicherten Datenbankdaten" },
                    { icon: "👤", title: "Zugriffskontrolle (RBAC)", desc: "Rollenbasierte Berechtigungen; 2FA verfügbar" },
                    { icon: "📋", title: "Audit-Logging", desc: "Protokollierung sicherheitsrelevanter Ereignisse" },
                    { icon: "🔄", title: "Regelmäßige Backups", desc: "Automatische tägliche Backups" },
                    { icon: "🛡️", title: "Penetrationstests", desc: "Regelmäßige Sicherheitsüberprüfungen" },
                    { icon: "🔑", title: "Passwort-Hashing", desc: "Passwörter nur als bcrypt-Hash gespeichert" },
                    { icon: "📧", title: "Mitarbeiterschulung", desc: "Regelmäßige Datenschutzschulungen" },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-2xl flex-shrink-0">{item.icon}</span>
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{item.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  Diese Seite nutzt SSL-/TLS-Verschlüsselung erkennbar am "https://" und dem Schloss-Symbol in der Adresszeile.
                </p>
              </section>

            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Datenschutz;
