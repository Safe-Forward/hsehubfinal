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
  { id: "zahlungen", number: "6", title: "Zahlungsabwicklung (Stripe)" },
  { id: "code", number: "7", title: "Quellcodeverwaltung (GitHub)" },
  { id: "cookies", number: "8", title: "Cookies & Tracking" },
  { id: "analyse", number: "9", title: "Analyse-Tools" },
  { id: "auftragsverarbeitung", number: "10", title: "Auftragsverarbeitung (AVV)" },
  { id: "drittlaender", number: "11", title: "Drittlandübermittlungen" },
  { id: "rechte", number: "12", title: "Ihre Rechte" },
  { id: "sicherheit", number: "13", title: "Datensicherheit" },
  { id: "aenderungen", number: "14", title: "Änderungen" },
];

const SectionHeading = ({ id, number, title, color = "blue" }: { id: string; number: string; title: string; color?: "blue" | "green" }) => (
  <h2 id={id} className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3 scroll-mt-8">
    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${color === "green" ? "bg-green-600" : "bg-blue-600"}`}>
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
                  <InfoCard label="E-Mail" value="info@tech-forward.de" />
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
                  safeguard="Art. 6 Abs. 1 lit. b DSGVO;
