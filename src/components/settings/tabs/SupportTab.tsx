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
      {/* Submit Ticket Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="w-5 h-5" />
            Submit a Support Ticket
          </CardTitle>
          <CardDescription>
            Having an issue? Submit a ticket and our team will help you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select
                  value={ticketForm.category}
                  onValueChange={(value) =>
                    setTicketForm((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="login_issue">Login Issue</SelectItem>
                    <SelectItem value="payment_error">Payment Error</SelectItem>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="feature_request">Feature Request</SelectItem>
                    <SelectItem value="performance">Performance Issue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
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
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="Brief summary of your issue"
                value={ticketForm.title}
                onChange={(e) =>
                  setTicketForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, etc."
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
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Tickets Card */}
      <Card>
        <CardHeader>
          <CardTitle>My Recent Tickets</CardTitle>
          <CardDescription>
            Track the status of your submitted tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <Headphones className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      No tickets submitted yet
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
                          {ticket.priority}
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
                          {ticket.status?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(ticket.created_at).toLocaleDateString()}
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
