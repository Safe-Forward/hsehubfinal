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
//   ✅ Cloudinary (Bildverwaltung)
//   ✅ Stripe (Zahlungen)
//
// ANBIETER VORBEREITET (auskommentiert – aktivieren wenn live):
//   🔲 Google Analytics 4
//   🔲 Facebook Pixel
//   🔲 Hotjar
//
// TODO: Ersetze alle [PLATZHALTER] mit deinen echten Unternehmensdaten
// ─────────────────────────────────────────────────────────────────────────────

const LAST_UPDATED = "Juni 2025";

interface Section {
  id: string;
  number: string;
  title: string;
}

const TOC_SECTIONS: Section[] = [
  { id: "verantwortlicher", number: "1", title: "Verantwortlicher" },
  { id: "grundsaetze", number: "2", title: "Grundsätze der Verarbeitung" },
  { id: "erhobene-daten", number: "3", title: "Erhobene Daten & Zwecke" },
  { id: "hosting", number: "4", title: "Hosting & Infrastruktur" },
  { id: "datenbank", number: "5", title: "Datenbank & Speicherung" },
  { id: "zahlungen", number: "6", title: "Zahlungsabwicklung (Stripe)" },
  { id: "medien", number: "7", title: "Medien & Bilder (Cloudinary)" },
  { id: "code", number: "8", title: "Quellcodeverwaltung (GitHub)" },
  { id: "cookies", number: "9", title: "Cookies & Tracking" },
  { id: "analyse", number: "10", title: "Analyse-Tools" },
  { id: "auftragsverarbeitung", number: "11", title: "Auftragsverarbeitung (AVV)" },
  { id: "drittlaender", number: "12", title: "Drittlandübermittlungen" },
  { id: "rechte", number: "13", title: "Ihre Rechte" },
  { id: "sicherheit", number: "14", title: "Datensicherheit" },
  { id: "aenderungen", number: "15", title: "Änderungen" },
];

const SectionHeading = ({
  id,
  number,
  title,
  color = "blue",
}: {
  id: string;
  number: string;
  title: string;
  color?: "blue" | "green";
}) => (
  <h2
    id={id}
    className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3 scroll-mt-8"
  >
    <span
      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
        color === "green" ? "bg-green-600" : "bg-blue-600"
      }`}
    >
      {number}
    </span>
    {title}
  </h2>
);

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">{children}</h3>
);

const InfoCard = ({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2 border-b border-gray-100 last:border-0">
    <span className="text-sm font-semibold text-gray-500 sm:w-44 flex-shrink-0">
      {label}
    </span>
    {href ? (
      
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline"
      >
        {value}
      </a>
    ) : (
      <span className="text-sm text-gray-700">{value}</span>
    )}
  </div>
); {
  label: string;
  value: string;
  href?: string;
}) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2 border-b border-gray-100 last:border-0">
    <span className="text-sm font-semibold text-gray-500 sm:w-44 flex-shrink-0">
      {label}
    </span>
    {href ? (
      
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline"
      >
        {value}
      </a>
    ) : (
      <span className="text-sm text-gray-700">{value}</span>
    )}
  </div>
);

const ProviderBox = ({
  name,
  address,
  country,
  privacyUrl,
  safeguard,
  note,
}: {
  name: string;
  address: string;
  country: string;
  privacyUrl: string;
  safeguard?: string;
  note?: string;
}) => (
  <div className="mt-4 p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
    <p className="font-semibold text-gray-800">{name}</p>
    <InfoCard label="Adresse" value={address} />
    <InfoCard label="Land" value={country} />
    <InfoCard label="Datenschutz" value={privacyUrl} href={privacyUrl} />
    {safeguard && <InfoCard label="Rechtsgrundlage" value={safeguard} />}
    {note && <p className="text-xs text-gray-500 pt-2 italic">{note}</p>}
  </div>
);

const RightItem = ({
  article,
  title,
  description,
}: {
  article: string;
  title: string;
  description: string;
}) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0 mt-0.5">
      <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-md">
        {article}
      </span>
    </div>
    <div>
      <p className="font-semibold text-gray-800">{title}</p>
      <p className="text-sm text-gray-600 mt-0.5">{description}</p>
    </div>
  </div>
);

const LegalBasis = ({
  basis,
  description,
}: {
  basis: string;
  description: string;
}) => (
  <li className="flex gap-3 items-start">
    <span className="flex-shrink-0 inline-block bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded mt-0.5">
      {basis}
    </span>
    <span className="text-sm text-gray-700">{description}</span>
  </li>
);

const Datenschutz = () => {
  return (
    <PublicLayout>
      <div className="min-h-[70vh] py-20 px-4">
        <div className="container mx-auto max-w-5xl">

          <div className="bg-white/40 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden animate-fade-in">

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600/10 to-green-600/10 p-8 lg:p-12 border-b border-white/20">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Datenschutzerklärung
              </h1>
              <p className="text-gray-600 mt-2">HSE Hub – Arbeitsschutz- & ERP-Software als SaaS</p>
              <p className="text-gray-400 text-sm mt-1">Stand: {LAST_UPDATED}</p>
            </div>

            {/* Inhaltsverzeichnis */}
            <div className="px-8 lg:px-12 pt-8 pb-4">
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-6">
                <p className="text-sm font-semibold text-blue-700 mb-3 uppercase tracking-wide">
                  Inhaltsverzeichnis
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {TOC_SECTIONS.map((s) => (
                    
                      key={s.id}
                      href={`#${s.id}`}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline py-0.5"
                    >
                      <span className="text-blue-300 text-xs">{s.number}.</span>
                      {s.title}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Inhalt */}
            <div className="px-8 lg:px-12 pb-12 space-y-14 text-gray-700 leading-relaxed">

              {/* 1. Verantwortlicher */}
              <section>
                <SectionHeading id="verantwortlicher" number="1" title="Verantwortlicher (Art. 13 Abs. 1 lit. a DSGVO)" />
                <p className="mb-4">
                  Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) und des
                  Bundesdatenschutzgesetzes (BDSG) ist:
                </p>
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                  <InfoCard label="Unternehmen" value="[Firmenname]" />
                  <InfoCard label="Anschrift" value="[Straße, PLZ, Ort]" />
                  <InfoCard label="Vertreten durch" value="[Geschäftsführer]" />
                  <InfoCard label="E-Mail" value="[datenschutz@ihredomain.de]" />
                  <InfoCard label="Telefon" value="[+49 ...]" />
                  <InfoCard label="Handelsregister" value="[HRB ... / Amtsgericht ...]" />
                </div>
                <p className="mt-4 text-sm text-gray-500">
                  Einen gesetzlich verpflichtenden Datenschutzbeauftragten (§ 38 BDSG) bestellen
                  wir, sofern die gesetzlichen Schwellenwerte erreicht werden. Kontakt dann
                  ebenfalls über die o.g. E-Mail-Adresse.
                </p>
              </section>

              {/* 2. Grundsätze */}
              <section>
                <SectionHeading id="grundsaetze" number="2" title="Grundsätze der Datenverarbeitung" color="green" />
                <p>
                  Wir verarbeiten personenbezogene Daten ausschließlich auf Grundlage der DSGVO
                  sowie ergänzender nationaler Vorschriften. Maßgebliche Rechtsgrundlagen sind:
                </p>
                <ul className="mt-4 space-y-3">
                  <LegalBasis basis="Art. 6 I lit. a" description="Einwilligung der betroffenen Person (z. B. optionale Cookies, Newsletter)" />
                  <LegalBasis basis="Art. 6 I lit. b" description="Erfüllung eines Vertrages oder vorvertragliche Maßnahmen (z. B. Bereitstellung des SaaS-Dienstes, Registrierung)" />
                  <LegalBasis basis="Art. 6 I lit. c" description="Erfüllung einer rechtlichen Verpflichtung (z. B. Aufbewahrungspflichten nach HGB/AO, Meldepflichten)" />
                  <LegalBasis basis="Art. 6 I lit. f" description="Berechtigte Interessen (z. B. IT-Sicherheit, Missbrauchsprävention, Systemstabilität)" />
                </ul>
                <SubHeading>Speicherdauer</SubHeading>
                <p>
                  Personenbezogene Daten werden gelöscht oder gesperrt, sobald der Verarbeitungszweck
                  entfällt und keine gesetzlichen Aufbewahrungspflichten (regelmäßig 6–10 Jahre
                  nach § 257 HGB / § 147 AO) entgegenstehen.
                </p>
              </section>

              {/* 3. Erhobene Daten */}
              <section>
                <SectionHeading id="erhobene-daten" number="3" title="Erhobene Daten & Verarbeitungszwecke" />

                <SubHeading>3.1 Technische Zugriffsdaten (Serverlogs)</SubHeading>
                <p>
                  Bei jedem Aufruf der Plattform werden technische Daten automatisch erfasst, die
                  für den sicheren Betrieb erforderlich sind:
                </p>
                <ul className="list-disc pl-6 mt-3 space-y-1 text-sm">
                  <li>IP-Adresse des zugreifenden Endgeräts</li>
                  <li>Datum, Uhrzeit und Dauer des Zugriffs</li>
                  <li>Aufgerufene URL / API-Endpunkt und HTTP-Methode</li>
                  <li>HTTP-Statuscode und übertragene Datenmenge</li>
                  <li>Referrer-URL (vorher besuchte Seite)</li>
                  <li>Browser- und Betriebssystem-Informationen (User-Agent)</li>
                  <li>Session-Token und Authentifizierungsmerkmale</li>
                </ul>
                <p className="text-sm text-gray-500 mt-2">
                  Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Speicherdauer: max. 30 Tage in Logs.
                </p>

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
                <p className="text-sm text-gray-500 mt-2">
                  Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
                </p>

                <SubHeading>3.3 HSE-Prozessdaten (Nutzungsdaten im Auftrag)</SubHeading>
                <p>
                  Im Rahmen der HSE-Software werden je nach Konfiguration durch den Kunden
                  weitere personenbezogene Daten seiner Mitarbeiter verarbeitet:
                </p>
                <ul className="list-disc pl-6 mt-3 space-y-1 text-sm">
                  <li>Berufsbezeichnung, Abteilung, Kostenstelle</li>
                  <li>Qualifikationen, Zertifikate und Schulungsnachweise</li>
                  <li>Unfallberichte, Gefährdungsbeurteilungen (inkl. beteiligte Personen)</li>
                  <li>Auditprotokolle und Prüfergebnisse</li>
                  <li>Digitale Unterschriften bei genehmigungspflichtigen Vorgängen</li>
                  <li>Profilfoto (optional)</li>
                </ul>
                <p className="text-sm text-gray-500 mt-2">
                  Diese Daten werden ausschließlich als Auftragsverarbeiter gemäß Art. 28 DSGVO
                  im Auftrag und nach Weisung des Kunden verarbeitet.
                </p>

                <SubHeading>3.4 Kontaktanfragen</SubHeading>
                <p>
                  Wenn Sie uns per E-Mail oder Kontaktformular kontaktieren, speichern wir Ihre
                  Angaben (Name, E-Mail, Nachrichteninhalt) zur Bearbeitung Ihrer Anfrage.
                  Rechtsgrundlage: Art. 6 Abs. 1 lit. b/f DSGVO. Löschung nach abschließender
                  Bearbeitung, spätestens nach 3 Jahren.
                </p>
              </section>

              {/* 4. Hosting */}
              <section>
                <SectionHeading id="hosting" number="4" title="Hosting & Infrastruktur" color="green" />

                <SubHeading>4.1 Vercel (Website-Hosting)</SubHeading>
                <p>
                  Die Plattform wird über Vercel bereitgestellt. Dabei werden Serverlogs
                  (IP-Adresse, Zeitstempel, aufgerufene URL, HTTP-Statuscode) erhoben.
                </p>
                <ProviderBox
                  name="Vercel Inc."
                  address="440 N Barranca Ave #4133, Covina, CA 91723, USA"
                  country="USA"
                  privacyUrl="https://vercel.com/legal/privacy-policy"
                  safeguard="EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO)"
                  note="Vercel verarbeitet Daten in Rechenzentren in der EU (Frankfurt) und den USA. Es besteht ein AVV mit Vercel."
                />

                <SubHeading>4.2 Hostinger (Domain & DNS)</SubHeading>
                <p>
                  Die Domain ist bei Hostinger registriert. Im Rahmen der Domain-Verwaltung
                  verarbeitet Hostinger Inhaberdaten (Name, Adresse, E-Mail) des Domainregistranten.
                </p>
                <ProviderBox
                  name="Hostinger International Ltd."
                  address="61 Lordou Vironos Street, Larnaca 6023, Zypern"
                  country="Zypern (EU)"
                  privacyUrl="https://www.hostinger.com/privacy-policy"
                  safeguard="Art. 6 Abs. 1 lit. b DSGVO; Serverstandorte innerhalb der EU"
                />
              </section>

              {/* 5. Datenbank */}
              <section>
                <SectionHeading id="datenbank" number="5" title="Datenbank & Speicherung (Supabase)" />
                <p>
                  Für die Speicherung sämtlicher Anwendungsdaten setzen wir Supabase ein –
                  eine Open-Source-Datenbankplattform auf Basis von PostgreSQL.
                </p>
                <ProviderBox
                  name="Supabase, Inc."
                  address="970 Toa Payoh North #07-04, Singapore 318992"
                  country="USA / EU-Rechenzentren wählbar"
                  privacyUrl="https://supabase.com/privacy"
                  safeguard="EU-Standardvertragsklauseln (SCC); Datenbankregion auf EU (Frankfurt) konfiguriert"
                  note="Alle Produktionsdaten werden in der EU-Region (eu-central-1, Frankfurt) gespeichert. Es besteht ein AVV mit Supabase."
                />
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                  <strong>Hinweis für Kunden (AVV):</strong> Im Rahmen des Auftragsverarbeitungsvertrags
                  werden alle kundenbezogenen Daten in verschlüsselter Form (AES-256 at rest,
                  TLS in transit) in der EU gespeichert.
                </div>
              </section>

              {/* 6. Zahlungen */}
              <section>
                <SectionHeading id="zahlungen" number="6" title="Zahlungsabwicklung (Stripe)" color="green" />
                <p>
                  Für die Abwicklung von Abonnementzahlungen verwenden wir Stripe. Bei
                  Zahlungsvorgängen werden Zahlungsdaten direkt an Stripe übermittelt.
                  Wir selbst speichern keine vollständigen Zahlungsmitteldaten.
                </p>
                <ProviderBox
                  name="Stripe Payments Europe, Ltd."
                  address="1 Grand Canal Street Lower, Grand Canal Dock, Dublin, D02 H210, Irland"
                  country="Irland (EU)"
                  privacyUrl="https://stripe.com/de/privacy"
                  safeguard="Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung); PCI-DSS-zertifiziert"
                  note="Stripe ist PCI-DSS Level 1-zertifiziert. Kreditkartendaten verlassen Ihren Browser nur verschlüsselt direkt zu Stripe."
                />
              </section>

              {/* 7. Cloudinary */}
              <section>
                <SectionHeading id="medien" number="7" title="Medien & Bildverwaltung (Cloudinary)" />
                <p>
                  Für die Speicherung und Auslieferung von Bildern und Mediendateien
                  (z. B. Profilfotos, Dokumentenanhänge) setzen wir Cloudinary ein.
                </p>
                <ProviderBox
                  name="Cloudinary Ltd."
                  address="3400 Central Expressway, Suite 110, Santa Clara, CA 95051, USA"
                  country="USA"
                  privacyUrl="https://cloudinary.com/privacy"
                  safeguard="EU-Standardvertragsklauseln (SCC)"
                  note="Bilder mit personenbezogenen Daten werden pseudonymisiert über zufällige IDs referenziert. Es besteht ein AVV mit Cloudinary."
                />
              </section>

              {/* 8. GitHub */}
              <section>
                <SectionHeading id="code" number="8" title="Quellcodeverwaltung (GitHub)" color="green" />
                <p>
                  Der Quellcode wird in einem privaten Repository auf GitHub verwaltet.
                  Personenbezogene Nutzerdaten der App-Nutzer werden nicht auf GitHub gespeichert.
                </p>
                <ProviderBox
                  name="GitHub, Inc. (Microsoft Corporation)"
                  address="88 Colin P Kelly Jr St, San Francisco, CA 94107, USA"
                  country="USA"
                  privacyUrl="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement"
                  safeguard="EU-Standardvertragsklauseln (SCC)"
                  note="Nur Entwickler des HSE Hub haben Zugriff auf das Repository. Produktionsdaten der Nutzer sind nicht im Quellcode enthalten."
                />
              </section>

              {/* 9. Cookies */}
              <section>
                <SectionHeading id="cookies" number="9" title="Cookies & lokale Speicherung" />
                <p>
                  Diese Website verwendet Cookies und vergleichbare Technologien. Cookies sind
                  kleine Textdateien, die Ihr Browser auf Ihrem Endgerät speichert.
                </p>

                <SubHeading>9.1 Technisch notwendige Cookies</SubHeading>
                <p className="text-sm mb-3">
                  Diese Cookies sind für den sicheren Betrieb unerlässlich und erfordern keine
                  Einwilligung (§ 25 Abs. 2 TDDDG):
                </p>
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

                <SubHeading>9.2 Analyse- und Marketing-Cookies (nur mit Einwilligung)</SubHeading>
                <p className="text-sm">
                  Wir setzen keine Tracking- oder Marketing-Cookies ohne Ihre ausdrückliche
                  Einwilligung (§ 25 Abs. 1 TDDDG i. V. m. Art. 6 Abs. 1 lit. a DSGVO).
                </p>
              </section>

              {/* 10. Analyse */}
              <section>
                <SectionHeading id="analyse" number="10" title="Analyse-Tools & Marketing" color="green" />

                {/*
                  ══════════════════════════════════════════════════════════
                  GOOGLE ANALYTICS 4 – Kommentar entfernen wenn aktiv
                  Measurement-ID eintragen: G-XXXXXXXXXX
                  ══════════════════════════════════════════════════════════

                <SubHeading>10.1 Google Analytics 4</SubHeading>
                <p>
                  Mit Ihrer Einwilligung setzen wir Google Analytics 4 ein. GA4 verwendet Cookies,
                  um das Nutzerverhalten zu analysieren. IP-Adressen werden anonymisiert.
                </p>
                <ProviderBox
                  name="Google Ireland Ltd."
                  address="Gordon House, Barrow Street, Dublin 4, Irland"
                  country="USA / Irland"
                  privacyUrl="https://policies.google.com/privacy"
                  safeguard="EU-Standardvertragsklauseln; Data Processing Amendment"
                  note="Measurement-ID: G-[IHRE ID]. Datenaufbewahrung: 14 Monate."
                />
                <p className="mt-3 text-sm text-gray-600">
                  Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO. Opt-out:
                  https://tools.google.com/dlpage/gaoptout
                </p>

                */}

                {/*
                  ══════════════════════════════════════════════════════════
                  FACEBOOK PIXEL – Kommentar entfernen wenn aktiv
                  Pixel-ID eintragen
                  ══════════════════════════════════════════════════════════

                <SubHeading>10.2 Facebook Pixel (Meta)</SubHeading>
                <p>
                  Mit Ihrer Einwilligung verwenden wir den Facebook Pixel für Remarketing und
                  Erfolgsmessung von Facebook-Werbeanzeigen.
                </p>
                <ProviderBox
                  name="Meta Platforms Ireland Ltd."
                  address="4 Grand Canal Square, Grand Canal Harbour, Dublin 2, Irland"
                  country="Irland / USA"
                  privacyUrl="https://www.facebook.com/privacy/policy/"
                  safeguard="EU-Standardvertragsklauseln"
                  note="Pixel-ID: [IHRE PIXEL-ID]."
                />
                <p className="mt-3 text-sm text-gray-600">
                  Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO. Widerspruch:
                  https://www.facebook.com/ads/preferences/
                </p>

                */}

                {/*
                  ══════════════════════════════════════════════════════════
                  HOTJAR – Kommentar entfernen wenn aktiv
                  Site-ID eintragen
                  ══════════════════════════════════════════════════════════

                <SubHeading>10.3 Hotjar</SubHeading>
                <p>
                  Mit Ihrer Einwilligung nutzen wir Hotjar für Heatmaps und Session-Recordings.
                  Hotjar maskiert automatisch sensible Eingabefelder.
                </p>
                <ProviderBox
                  name="Hotjar Ltd."
                  address="Dragonara Business Centre, 5th Floor, Dragonara Road, Paceville St Julian's STJ 3141, Malta"
                  country="Malta (EU)"
                  privacyUrl="https://www.hotjar.com/legal/policies/privacy/"
                  safeguard="Art. 6 Abs. 1 lit. a DSGVO; EU-Server"
                  note="Site-ID: [IHRE SITE-ID]. Opt-out: https://www.hotjar.com/legal/compliance/opt-out"
                />

                */}

                <p className="text-sm text-gray-500 italic">
                  Derzeit werden keine aktiven Analyse- oder Marketing-Tracking-Tools eingesetzt.
                  Dieser Abschnitt wird aktualisiert, sobald entsprechende Tools aktiviert werden.
                </p>
              </section>

              {/* 11. AVV */}
              <section>
                <SectionHeading id="auftragsverarbeitung" number="11" title="Auftragsverarbeitung (Art. 28 DSGVO)" />
                <p>
                  Da der HSE Hub personenbezogene Daten der Mitarbeiter unserer Kunden verarbeitet,
                  agieren wir diesen Nutzern gegenüber als <strong>Auftragsverarbeiter</strong>.
                  Mit jedem Kunden wird ein Auftragsverarbeitungsvertrag (AVV) abgeschlossen,
                  der insbesondere regelt:
                </p>
                <ul className="list-disc pl-6 mt-4 space-y-2 text-sm">
                  <li>Gegenstand, Dauer und Zweck der Verarbeitung</li>
                  <li>Art der personenbezogenen Daten und Kategorien betroffener Personen</li>
                  <li>Pflichten und Rechte des Verantwortlichen (Kunden)</li>
                  <li>Technische und organisatorische Maßnahmen (TOM) gem. Art. 32 DSGVO</li>
                  <li>Einsatz und Genehmigung von Unterauftragsverarbeitern</li>
                  <li>Verfahren bei Datenpannen (Art. 33/34 DSGVO)</li>
                </ul>
              </section>

              {/* 12. Drittländer */}
              <section>
                <SectionHeading id="drittlaender" number="12" title="Drittlandübermittlungen (Art. 44 ff. DSGVO)" color="green" />
                <p className="mb-4">
                  Soweit Daten in Drittländer übermittelt werden, erfolgt dies auf Grundlage
                  geeigneter Garantien gemäß Art. 46 DSGVO:
                </p>
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
                        { provider: "Cloudinary", country: "USA", guarantee: "EU-SCC" },
                        { provider: "GitHub", country: "USA", guarantee: "EU-SCC" },
                        { provider: "Stripe", country: "Irland (EU)", guarantee: "Innerhalb EU – kein Transfer" },
                        { provider: "Hostinger", country: "Zypern (EU)", guarantee: "Innerhalb EU – kein Transfer" },
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
                <p className="text-sm text-gray-500 mt-3">
                  SCC = EU-Standardvertragsklauseln gemäß Durchführungsbeschluss (EU) 2021/914.
                </p>
              </section>

              {/* 13. Rechte */}
              <section>
                <SectionHeading id="rechte" number="13" title="Ihre Rechte als betroffene Person" />
                <p className="mb-6">
                  Zur Geltendmachung Ihrer Rechte wenden Sie sich bitte an:{" "}
                  <a href="mailto:datenschutz@ihredomain.de" className="text-blue-600 hover:underline">
                    [datenschutz@ihredomain.de]
                  </a>
                  . Wir antworten innerhalb von 30 Tagen (Art. 12 Abs. 3 DSGVO).
                </p>
                <div className="space-y-4">
                  <RightItem article="Art. 15" title="Auskunftsrecht" description="Sie können Auskunft über alle von uns verarbeiteten personenbezogenen Daten verlangen, einschließlich Zweck, Empfänger, Speicherdauer und Herkunft." />
                  <RightItem article="Art. 16" title="Recht auf Berichtigung" description="Sie können die Berichtigung unrichtiger oder die Vervollständigung unvollständiger Daten verlangen." />
                  <RightItem article="Art. 17" title="Recht auf Löschung" description="Sie können die Löschung Ihrer Daten verlangen, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen." />
                  <RightItem article="Art. 18" title="Recht auf Einschränkung" description="Sie können die Einschränkung der Verarbeitung verlangen, z. B. wenn Sie die Richtigkeit der Daten bestreiten." />
                  <RightItem article="Art. 20" title="Recht auf Datenübertragbarkeit" description="Sie haben das Recht, Ihre Daten in einem strukturierten, maschinenlesbaren Format zu erhalten." />
                  <RightItem article="Art. 21" title="Widerspruchsrecht" description="Sie können der Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO jederzeit widersprechen." />
                  <RightItem article="Art. 7 Abs. 3" title="Widerruf der Einwilligung" description="Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen." />
                  <RightItem article="Art. 77" title="Beschwerderecht" description="Sie haben das Recht, sich bei der zuständigen Datenschutz-Aufsichtsbehörde zu beschweren. Liste: bfdi.bund.de" />
                </div>
              </section>

              {/* 14. Sicherheit */}
              <section>
                <SectionHeading id="sicherheit" number="14" title="Datensicherheit (Art. 32 DSGVO)" color="green" />
                <p className="mb-4">
                  Wir setzen technische und organisatorische Maßnahmen (TOM) ein, um
                  personenbezogene Daten zu schützen:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: "🔒", title: "Transport-Verschlüsselung", desc: "TLS 1.2 / 1.3 für alle Datenübertragungen (HTTPS)" },
                    { icon: "🗄️", title: "Verschlüsselung at Rest", desc: "AES-256 für alle gespeicherten Datenbankdaten (Supabase)" },
                    { icon: "👤", title: "Zugriffskontrolle (RBAC)", desc: "Rollenbasierte Berechtigungen; 2FA verfügbar" },
                    { icon: "📋", title: "Audit-Logging", desc: "Protokollierung sicherheitsrelevanter Ereignisse" },
                    { icon: "🔄", title: "Regelmäßige Backups", desc: "Automatische tägliche Backups mit definierten Recovery-Zielen" },
                    { icon: "🛡️", title: "Penetrationstests", desc: "Regelmäßige Sicherheitsüberprüfungen der Infrastruktur" },
                    { icon: "🔑", title: "Passwort-Hashing", desc: "Passwörter nur als bcrypt-Hash gespeichert" },
                    { icon: "📧", title: "Mitarbeiterschulung", desc: "Regelmäßige Datenschutz- und Sicherheitsschulungen" },
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
                  Diese Seite nutzt SSL-/TLS-Verschlüsselung. Eine verschlüsselte Verbindung
                  erkennen Sie am „https://" in der Adresszeile und dem Schloss-Symbol.
                </p>
              </section>

              {/* 15. Änderungen */}
              <section>
                <SectionHeading id="aenderungen" number="15" title="Aktualität & Änderungen dieser Erklärung" />
                <p>
                  Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie aktuellen
                  rechtlichen Anforderungen oder Änderungen unserer Dienste anzupassen. Die
                  aktuelle Fassung ist stets unter dieser URL abrufbar.
                </p>
                <p className="mt-3 text-sm text-gray-600">
                  Bei wesentlichen Änderungen werden registrierte Nutzer zusätzlich per E-Mail
                  informiert.
                </p>
                <div className="mt-8 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                  <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Rechtlicher Hinweis</p>
                  <p className="text-sm text-amber-700">
                    Diese Datenschutzerklärung ersetzt keine individuelle Rechtsberatung. Bitte
                    lassen Sie diese vor der Veröffentlichung durch einen Datenschutzbeauftragten
                    oder Rechtsanwalt prüfen. Alle Angaben in eckigen Klammern{" "}
                    <strong>[...]</strong> müssen durch Ihre konkreten Unternehmensdaten ersetzt werden.
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

export default Datenschutz;
