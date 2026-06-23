import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MessageSquare, Calendar, User } from "lucide-react";

interface Note {
  content: string;
  timestamp: string;
  employee: string;
}

export default function PublicNotes() {
  const { token } = useParams<{ token: string }>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");

  useEffect(() => {
    async function loadNotes() {
      if (!token) {
        setError("Invalid link - no token provided");
        setLoading(false);
        return;
      }

      try {
        // The actual lookup runs server-side (service role) so it can be
        // scoped to the token holder's company - an anonymous visitor's
        // Supabase session has no auth.uid(), so RLS would otherwise block
        // every row anyway.
        const { data, error } = await supabase.functions.invoke("get-public-notes", {
          body: { token },
        });

        if (error || data?.error) {
          setError(data?.error || "Invalid or expired link");
          setLoading(false);
          return;
        }

        setMemberName(data.memberName || "");
        setNotes(data.notes || []);
        setLoading(false);
      } catch (err) {
        console.error("Error loading notes:", err);
        setError("An error occurred while loading your notes");
        setLoading(false);
      }
    }

    loadNotes();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">
              Welcome, {memberName}!
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Here are your notes which are belonging to you
            </p>
          </CardHeader>
        </Card>

        {notes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No notes found where you were mentioned.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notes.map((note, idx) => (
              <Card key={idx} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>From: {note.employee}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(note.timestamp).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
