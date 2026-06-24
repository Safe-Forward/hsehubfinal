import { useState } from "react";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function CookieConsentBanner() {
  const { showBanner, settingsOpen, acceptAll, acceptNecessaryOnly, savePreferences, openSettings, closeSettings } =
    useCookieConsent();
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  return (
    <>
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] border-t bg-background p-4 shadow-lg sm:p-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Wir verwenden Cookies, um die Website technisch zu betreiben. Mit Ihrer Einwilligung
              setzen wir zusätzlich Analyse- und Marketing-Cookies ein. Mehr dazu in unserer{" "}
              <a href="/datenschutz" className="underline">
                Datenschutzerklärung
              </a>
              .
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={openSettings}>
                Einstellungen
              </Button>
              <Button variant="outline" size="sm" onClick={acceptNecessaryOnly}>
                Nur notwendige
              </Button>
              <Button size="sm" onClick={acceptAll}>
                Alle akzeptieren
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={settingsOpen} onOpenChange={(open) => !open && closeSettings()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cookie-Einstellungen</DialogTitle>
            <DialogDescription>
              Wählen Sie, welche Kategorien von Cookies Sie zulassen möchten. Technisch
              notwendige Cookies sind immer aktiv.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Technisch notwendig</Label>
                <p className="text-xs text-muted-foreground">
                  Erforderlich für Login, Sicherheit und Grundfunktionen. Kann nicht deaktiviert werden.
                </p>
              </div>
              <Switch checked disabled />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="consent-analytics" className="text-sm font-medium">
                  Analyse
                </Label>
                <p className="text-xs text-muted-foreground">
                  Hilft uns zu verstehen, wie die Website genutzt wird (z. B. Google Analytics).
                </p>
              </div>
              <Switch id="consent-analytics" checked={analytics} onCheckedChange={setAnalytics} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="consent-marketing" className="text-sm font-medium">
                  Marketing
                </Label>
                <p className="text-xs text-muted-foreground">
                  Wird für personalisierte Werbung verwendet (z. B. Meta Pixel, HubSpot).
                </p>
              </div>
              <Switch id="consent-marketing" checked={marketing} onCheckedChange={setMarketing} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={acceptNecessaryOnly}>
              Nur notwendige
            </Button>
            <Button onClick={() => savePreferences({ analytics, marketing })}>Auswahl speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
