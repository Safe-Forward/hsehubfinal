import PublicLayout from "@/components/PublicLayout";

// ─────────────────────────────────────────────────────────────────────────────
// AUFTRAGSVERARBEITUNGSVERTRAG (AVV) – HSE Hub
//
// Wird per Checkbox bei der Registrierung akzeptiert (Clickwrap), siehe
// CompanyRegistration.tsx. AVV_VERSION muss bei jeder inhaltlichen Änderung
// erhöht werden, damit companies.avv_version nachvollziehbar bleibt.
//
// Hinweis: Dies ist ein strukturierter Entwurf. Vor Produktiv-Einsatz mit
// echten Kunden sollte dieser Vertrag von einer Rechtsanwältin/einem
// Rechtsanwalt geprüft werden (insb. Haftung, Gerichtsstand).
// ─────────────────────────────────────────────────────────────────────────────

export const AVV_VERSION = "1.0";
const LAST_UPDATED = "Juni 2026";

const TOC_SECTIONS = [
  { id: "praeambel", number: "", title: "Präambel" },
  { id: "p1", number: "§1", title: "Gegenstand und Dauer" },
  { id: "p2", number: "§2", title: "Art und Zweck der Verarbeitung" },
  { id: "p3", number: "§3", title: "Art der Daten & betroffene Personen" },
  { id: "p4", number: "§4", title: "Pflichten des Auftragsverarbeiters" },
  { id: "p5", number: "§5", title: "Technische und organisatorische Maßnahmen" },
  { id: "p6", number: "§6", title: "Unterauftragsverhältnisse" },
  { id: "p7", number: "§7", title: "Weisungsrecht des Auftraggebers" },
  { id: "p9", number: "§9", title: "Kontrollrechte" },
  { id: "p10", number: "§10", title: "Meldung von Datenschutzverletzungen" },
  { id: "p11", number: "§11", title: "Löschung und Rückgabe" },
  { id: "p13", number: "§13", title: "Laufzeit und Kündigung" },
  { id: "anlage1", number: "", title: "Anlage 1: Unterauftragsverarbeiter" },
  { id: "anlage2", number: "", title: "Anlage 2: TOM" },
];

const SectionHeading = ({ id, number, title }: { id: string; number: string; title: string }) => (
  <h2 id={id} className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3 scroll-mt-8">
    {number && (
      <span className="flex-shrink-0 text-sm font-bold text-blue-600">{number}</span>
    )}
    {title}
  </h2>
);

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">{children}</h3>
);

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
    {children}
  </div>
);

const ProviderRow = ({ name, purpose, country, guarantee }: { name: string; purpose: string; country: string; guarantee: string }) => (
  <tr className="border-b border-gray-100">
    <td className="py-2 pr-4 font-medium text-gray-800">{name}</td>
    <td className="py-2 pr-4 text-gray-600">{purpose}</td>
    <td className="py-2 pr-4 text-gray-600">{country}</td>
    <td className="py-2 text-gray-600">{guarantee}</td>
  </tr>
);

const AVV = () => {
  return (
    <PublicLayout>
      <div className="min-h-[70vh] py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="bg-white/40 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden animate-fade-in">

            <div className="bg-gradient-to-r from-blue-600/10 to-green-600/10 p-8 lg:p-12 border-b border-white/20">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Vertrag zur Auftragsverarbeitung (AVV)
              </h1>
              <p className="text-gray-600 mt-2">gemäß Art. 28 DSGVO – für die Nutzung von HSE Hub (Safe-Forward)</p>
              <p className="text-gray-400 text-sm mt-1">Version {AVV_VERSION} – Stand: {LAST_UPDATED}</p>
            </div>

            <div className="px-8 lg:px-12 pt-8 pb-4">
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-6">
                <p className="text-sm font-semibold text-blue-700 mb-3 uppercase tracking-wide">Inhaltsverzeichnis</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {TOC_SECTIONS.map((s) => (
                    <a key={s.id} href={"#" + s.id} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline py-0.5">
                      {s.number && <span className="text-blue-300 text-xs">{s.number}</span>}
                      {s.title}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-8 lg:px-12 pb-12 space-y-10 text-gray-700 leading-relaxed">

              <section>
                <p className="text-sm text-gray-500">
                  Dieser Vertrag wird zwischen dem jeweiligen Kunden, der ein Konto bei HSE Hub registriert
                  (im Folgenden „<strong>Auftraggeber</strong>" oder „<strong>Verantwortlicher</strong>"), und
                </p>
                <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm">
                  <p className="font-semibold text-gray-800">Safe-Forward</p>
                  <p>Inhaber: Pavel Rohn</p>
                  <p>Angfurtener Str. 1B, 51674 Wiehl</p>
                  <p>E-Mail: info@tech-forward.de</p>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  (im Folgenden „<strong>Auftragsverarbeiter</strong>") geschlossen. Mit dem Abschluss der
                  Registrierung und der Bestätigung dieses Vertrags erklärt der Auftraggeber sein Einverständnis
                  mit den nachfolgenden Bedingungen (elektronische Form gemäß Art. 28 Abs. 9 DSGVO).
                </p>
              </section>

              <section>
                <SectionHeading id="praeambel" number="" title="Präambel" />
                <p>Der Auftraggeber setzt die SaaS-Plattform HSE Hub zur Verwaltung von Arbeitsschutz-, Gesundheits- und Mitarbeiterdaten ein. Im Rahmen dieser Nutzung verarbeitet der Auftragsverarbeiter personenbezogene Daten der Mitarbeiterinnen und Mitarbeiter des Auftraggebers im Auftrag und nach Weisung des Auftraggebers. Dieser Vertrag konkretisiert die datenschutzrechtlichen Pflichten der Parteien gemäß Art. 28 DSGVO und ist Bestandteil des Abonnementvertrags zwischen den Parteien.</p>
              </section>

              <section>
                <SectionHeading id="p1" number="§ 1" title="Gegenstand und Dauer des Auftrags" />
                <p>Gegenstand dieses Vertrags ist die Verarbeitung personenbezogener Daten durch den Auftragsverarbeiter im Auftrag des Auftraggebers im Rahmen der Nutzung von HSE Hub. Die Dauer entspricht der Laufzeit des Abonnementvertrags; mit dessen Beendigung endet auch dieser Vertrag, vorbehaltlich der Lösch- und Rückgabepflichten aus § 11.</p>
              </section>

              <section>
                <SectionHeading id="p2" number="§ 2" title="Art und Zweck der Verarbeitung" />
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Verwaltung von Mitarbeiterstammdaten</li>
                  <li>Dokumentation arbeitsmedizinischer Vorsorgeuntersuchungen (G-Untersuchungen)</li>
                  <li>Erstellung und Verfolgung von Gefährdungsbeurteilungen</li>
                  <li>Verwaltung von Schulungen, Nachweisen und Zertifikaten</li>
                  <li>Dokumentation von Vorfällen, Untersuchungen und Korrekturmaßnahmen</li>
                  <li>Durchführung interner Audits</li>
                  <li>Versand von Benachrichtigungen zu Aufgaben, Fristen und Freigaben</li>
                </ul>
              </section>

              <section>
                <SectionHeading id="p3" number="§ 3" title="Art der Daten und Kategorien betroffener Personen" />
                <SubHeading>Betroffene Personen</SubHeading>
                <p className="text-sm">Mitarbeiterinnen und Mitarbeiter sowie Nutzerinnen und Nutzer mit Login-Zugang des Auftraggebers.</p>
                <SubHeading>Datenkategorien</SubHeading>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Stammdaten: Name, Kontaktdaten, Abteilung, Position</li>
                  <li>Schulungsnachweise, Zertifikate, Aufgaben</li>
                  <li>Vorfall- und Untersuchungsdaten im Kontext Arbeitsschutz</li>
                  <li>Zugangsdaten (E-Mail-Adresse, gehashtes Passwort, Rollenzuweisung)</li>
                </ul>
                <Note>
                  <strong>Besondere Kategorien personenbezogener Daten (Art. 9 DSGVO):</strong> Im Rahmen
                  arbeitsmedizinischer Vorsorgeuntersuchungen können Gesundheitsdaten verarbeitet werden
                  (Status und Termine). Der Auftraggeber stellt sicher, dass hierfür eine Rechtsgrundlage
                  besteht (i.d.R. Art. 9 Abs. 2 lit. h DSGVO i.V.m. arbeitsschutzrechtlichen Vorschriften).
                </Note>
              </section>

              <section>
                <SectionHeading id="p4" number="§ 4" title="Pflichten des Auftragsverarbeiters" />
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Verarbeitung ausschließlich auf dokumentierte Weisung des Auftraggebers</li>
                  <li>Vertraulichkeitsverpflichtung aller zugriffsberechtigten Personen</li>
                  <li>Umsetzung der technischen und organisatorischen Maßnahmen gemäß Art. 32 DSGVO (Anlage 2)</li>
                  <li>Unterstützung bei der Erfüllung der Pflichten aus Art. 32–36 DSGVO</li>
                  <li>Unterstützung bei Anfragen betroffener Personen (Art. 12–23 DSGVO) – u.a. über die integrierte DSGVO-Exportfunktion im Mitarbeiterprofil</li>
                </ul>
              </section>

              <section>
                <SectionHeading id="p5" number="§ 5" title="Technische und organisatorische Maßnahmen" />
                <p className="text-sm">Der Auftragsverarbeiter hat die in Anlage 2 aufgeführten Maßnahmen umgesetzt und ist berechtigt, diese anzupassen, sofern das Schutzniveau dabei nicht unterschritten wird.</p>
              </section>

              <section>
                <SectionHeading id="p6" number="§ 6" title="Unterauftragsverhältnisse" />
                <p className="text-sm">Der Auftraggeber genehmigt allgemein die in Anlage 1 aufgeführten Unterauftragsverarbeiter. Über die Hinzuziehung oder Ersetzung weiterer Unterauftragsverarbeiter wird der Auftraggeber informiert; erfolgt innerhalb von 14 Tagen kein Einspruch, gilt die Änderung als genehmigt. Jeder Unterauftragsverarbeiter wird zu den gleichen Datenschutzpflichten verpflichtet wie in diesem Vertrag festgelegt.</p>
              </section>

              <section>
                <SectionHeading id="p7" number="§ 7" title="Weisungsrecht des Auftraggebers" />
                <p className="text-sm">Der Auftraggeber kann jederzeit Weisungen zu Art, Umfang und Verfahren der Verarbeitung erteilen.</p>
              </section>

              <section>
                <SectionHeading id="p9" number="§ 9" title="Kontrollrechte des Auftraggebers" />
                <p className="text-sm">Der Auftraggeber kann sich von der Einhaltung der vereinbarten Pflichten überzeugen; der Auftragsverarbeiter stellt hierfür auf Anfrage die erforderlichen Nachweise zur Verfügung.</p>
              </section>

              <section>
                <SectionHeading id="p10" number="§ 10" title="Meldung von Datenschutzverletzungen" />
                <p className="text-sm">Der Auftragsverarbeiter meldet jede ihm bekannt gewordene Verletzung des Schutzes personenbezogener Daten unverzüglich, spätestens innerhalb von 48 Stunden, und unterstützt den Auftraggeber bei dessen Pflichten aus Art. 33/34 DSGVO.</p>
              </section>

              <section>
                <SectionHeading id="p11" number="§ 11" title="Löschung und Rückgabe personenbezogener Daten" />
                <p className="text-sm">Nach Vertragsende löscht der Auftragsverarbeiter sämtliche im Auftrag verarbeiteten Daten, sofern keine gesetzliche Aufbewahrungspflicht besteht. Der Auftraggeber kann den Export seiner Daten sowie die vollständige Löschung der Firma jederzeit selbst über die Funktion „Konto/Firma löschen" in den Einstellungen anstoßen.</p>
              </section>

              <section>
                <SectionHeading id="p13" number="§ 13" title="Laufzeit und Kündigung" />
                <p className="text-sm">Dieser Vertrag gilt für die Dauer des Abonnementvertrags. Eine eigenständige Kündigung ist nicht möglich; er endet automatisch mit Beendigung des Hauptvertrags.</p>
              </section>

              <section>
                <SectionHeading id="anlage1" number="" title="Anlage 1: Genehmigte Unterauftragsverarbeiter" />
                <p className="text-xs text-gray-500 mb-3">Stand: {LAST_UPDATED}. Wird bei Änderungen gemäß § 6 aktualisiert.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200 text-left text-xs uppercase text-gray-500">
                        <th className="py-2 pr-4">Anbieter</th>
                        <th className="py-2 pr-4">Zweck</th>
                        <th className="py-2 pr-4">Sitz</th>
                        <th className="py-2">Garantie</th>
                      </tr>
                    </thead>
                    <tbody>
                      <ProviderRow name="Supabase, Inc." purpose="Datenbank, Auth, Dateispeicher" country="USA / EU-Region (Frankfurt)" guarantee="EU-SCC; AVV besteht" />
                      <ProviderRow name="Vercel Inc." purpose="Hosting" country="USA / EU-Rechenzentrum" guarantee="DPA automatisch wirksam" />
                      <ProviderRow name="Stripe Payments Europe, Ltd." purpose="Zahlungsabwicklung" country="Irland (EU)" guarantee="Innerhalb EU; DPA besteht" />
                      <ProviderRow name="Brevo GmbH" purpose="Transaktionaler E-Mail-Versand" country="Deutschland" guarantee="Innerhalb Deutschlands; AVV besteht" />
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <SectionHeading id="anlage2" number="" title="Anlage 2: Technische und organisatorische Maßnahmen" />
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>TLS 1.2/1.3 für alle Datenübertragungen</li>
                  <li>AES-256-Verschlüsselung gespeicherter Daten</li>
                  <li>Rollenbasierte Zugriffskontrolle (RBAC) und Row Level Security</li>
                  <li>Strikte Mandantentrennung auf Datenbankebene</li>
                  <li>Audit-Logging sicherheitsrelevanter Ereignisse</li>
                  <li>Automatisierte Fehlerüberwachung</li>
                  <li>Tägliche automatische Backups</li>
                  <li>Passwort-Hashing, keine Klartext-Speicherung</li>
                  <li>Kaskadierende Löschung personenbezogener Daten bei Mitarbeiterlöschung</li>
                </ul>
              </section>

              <Note>
                Dies ist ein strukturierter Vertragsentwurf, der die tatsächliche technische und
                organisatorische Realität von HSE Hub abbildet. Bei Fragen wenden Sie sich an
                info@tech-forward.de.
              </Note>

            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default AVV;
