-- Qualification types catalog (company-specific + system defaults)
CREATE TABLE IF NOT EXISTS public.qualification_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  default_renewal_days integer, -- NULL = kein Ablaufdatum
  is_system_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Employee qualifications (who has which qualification)
CREATE TABLE IF NOT EXISTS public.employee_qualifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  qualification_type_id uuid REFERENCES public.qualification_types(id) ON DELETE CASCADE NOT NULL,
  issued_date date NOT NULL,
  expiry_date date, -- NULL = kein Ablaufdatum
  renewal_interval_days integer, -- NULL = kein Ablaufdatum
  notes text,
  assigned_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, qualification_type_id)
);

-- RLS
ALTER TABLE public.qualification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_qualifications ENABLE ROW LEVEL SECURITY;

-- Policies für qualification_types
CREATE POLICY "Company members can view qualification types" ON public.qualification_types
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    OR is_system_default = true
  );

CREATE POLICY "Admins can manage qualification types" ON public.qualification_types
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('company_admin', 'hse_manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('company_admin', 'hse_manager')
    )
  );

-- Policies für employee_qualifications
CREATE POLICY "Company members can view employee qualifications" ON public.employee_qualifications
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Non-employees can manage employee qualifications" ON public.employee_qualifications
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('company_admin', 'hse_manager', 'department_manager')
    )
  );

-- Seed system default qualification types
INSERT INTO public.qualification_types (name, description, default_renewal_days, is_system_default, company_id) VALUES
  ('Gabelstaplerfahrer', 'Berechtigung zum Führen von Gabelstaplern (Staplerschein)', 1825, true, NULL),
  ('Ersthelfer', 'Ausgebildeter Ersthelfer (Erste-Hilfe-Kurs)', 730, true, NULL),
  ('Brandschutzhelfer', 'Ausgebildeter Brandschutzhelfer', 1825, true, NULL),
  ('Brandschutzbeauftragter', 'Bestellter Brandschutzbeauftragter', NULL, true, NULL),
  ('Sicherheitsbeauftragter', 'Bestellter Sicherheitsbeauftragter nach § 22 SGB VII', NULL, true, NULL),
  ('Gefahrgutbeauftragter', 'Bestellter Gefahrgutbeauftragter', 1095, true, NULL),
  ('Strahlenschutzbeauftragter', 'Bestellter Strahlenschutzbeauftragter', NULL, true, NULL),
  ('Kranführer', 'Berechtigung zum Führen von Krananlagen', 1825, true, NULL),
  ('Anschläger', 'Ausgebildeter Anschläger für Hebevorgänge', 1825, true, NULL),
  ('Ladungssicherung', 'Unterweisung Ladungssicherung', 1095, true, NULL),
  ('PSA gegen Absturz', 'Unterweisung PSA gegen Absturz (Höhensicherung)', 365, true, NULL),
  ('Elektrofachkraft', 'Ausgebildete Elektrofachkraft', NULL, true, NULL),
  ('Elektrotechnisch unterwiesene Person (EuP)', 'EuP nach DGUV Vorschrift 3', 365, true, NULL),
  ('Schweißer', 'Schweißerprüfung nach EN ISO 9606', 730, true, NULL),
  ('Dampfkesselwärter', 'Berechtigung als Kesselwärter', 1095, true, NULL),
  ('Druckbehälterbeauftragter', 'Bestellter Druckbehälterbeauftragter', NULL, true, NULL),
  ('Explosivstoffbeauftragter', 'Bestellter Explosivstoffbeauftragter', NULL, true, NULL),
  ('Abfallbeauftragter', 'Bestellter Betriebsbeauftragter für Abfall', NULL, true, NULL),
  ('Gewässerschutzbeauftragter', 'Bestellter Gewässerschutzbeauftragter', NULL, true, NULL),
  ('Immissionsschutzbeauftragter', 'Bestellter Immissionsschutzbeauftragter', NULL, true, NULL),
  ('Datenschutzbeauftragter', 'Bestellter Datenschutzbeauftragter', NULL, true, NULL),
  ('Fachkraft für Arbeitssicherheit (SiFa)', 'Bestellte Fachkraft für Arbeitssicherheit', NULL, true, NULL),
  ('Betriebsmediziner', 'Bestellter Betriebsarzt', NULL, true, NULL),
  ('Notfallkoordinator', 'Ausgebildeter Notfallkoordinator', 1095, true, NULL)
ON CONFLICT DO NOTHING;
