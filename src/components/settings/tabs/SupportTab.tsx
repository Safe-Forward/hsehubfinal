import { Headphones, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface TicketForm {
  category: string;
  priority: string;
  title: string;
  description: string;
}

interface SupportTabProps {
  ticketForm: TicketForm;
  setTicketForm: React.Dispatch<React.SetStateAction<TicketForm>>;
  isSubmittingTicket: boolean;
  myTickets: any[];
  submitTicket: () => void;
}

export function SupportTab({
  ticketForm,
  setTicketForm,
  isSubmittingTicket,
  myTickets,
  submitTicket,
}: SupportTabProps) {
  return (
    <div className="space-y-6">
      {/* Support-Ticket einreichen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="w-5 h-5" />
            Support-Ticket einreichen
          </CardTitle>
          <CardDescription>
            Problem gefunden? Reiche ein Ticket ein und unser Team hilft dir weiter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kategorie *</Label>
                <Select
                  value={ticketForm.category}
                  onValueChange={(value) =>
                    setTicketForm((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="login_issue">Anmeldeproblem</SelectItem>
                    <SelectItem value="payment_error">Zahlungsfehler</SelectItem>
                    <SelectItem value="bug">Fehlermeldung</SelectItem>
                    <SelectItem value="feature_request">Funktionswunsch</SelectItem>
                    <SelectItem value="performance">Leistungsproblem</SelectItem>
                    <SelectItem value="other">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priorität</Label>
                <Select
                  value={ticketForm.priority}
                  onValueChange={(value) =>
                    setTicketForm((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                    <SelectItem value="urgent">Dringend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Betreff *</Label>
              <Input
                placeholder="Kurze Zusammenfassung deines Problems"
                value={ticketForm.title}
                onChange={(e) =>
                  setTicketForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Beschreibung *</Label>
              <Textarea
                placeholder="Bitte beschreibe dein Problem ausführlich. Füge Fehlermeldungen, Schritte zur Reproduktion usw. hinzu."
                rows={5}
                value={ticketForm.description}
                onChange={(e) =>
                  setTicketForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={submitTicket} disabled={isSubmittingTicket}>
                {isSubmittingTicket ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Absenden
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meine Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Meine letzten Tickets</CardTitle>
          <CardDescription>
            Status deiner eingereichten Tickets verfolgen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Betreff</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Priorität</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erstellt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <Headphones className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      Noch keine Tickets eingereicht
                    </TableCell>
                  </TableRow>
                ) : (
                  myTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ticket.category?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ticket.priority === "urgent"
                              ? "destructive"
                              : ticket.priority === "high"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {ticket.priority === "urgent"
                            ? "Dringend"
                            : ticket.priority === "high"
                              ? "Hoch"
                              : ticket.priority === "medium"
                                ? "Mittel"
                                : "Niedrig"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ticket.status === "open"
                              ? "destructive"
                              : ticket.status === "in_progress"
                                ? "secondary"
                                : "default"
                          }
                        >
                          {ticket.status === "open"
                            ? "Offen"
                            : ticket.status === "in_progress"
                              ? "In Bearbeitung"
                              : ticket.status === "closed"
                                ? "Geschlossen"
                                : ticket.status?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(ticket.created_at).toLocaleDateString("de-DE")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
