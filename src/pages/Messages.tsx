import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Hash, Users, Search, Plus, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  channel_type: "company" | "direct";
  channel_name: string | null;
  created_at: string;
}

interface Channel {
  id: string;
  name: string;
  type: "company" | "direct";
  unread_count: number;
}

export default function Messages() {
  const { user, companyId } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (companyId) {
      fetchChannels();
      setupRealtimeSubscription();
    }
  }, [companyId]);

  useEffect(() => {
    if (activeChannel) {
      fetchMessages(activeChannel.id);
    }
  }, [activeChannel]);

  const fetchChannels = async () => {
    try {
      // Company-wide channels
      const companyChannels: Channel[] = [
        { id: "general", name: "General", type: "company", unread_count: 0 },
        { id: "safety", name: "Safety", type: "company", unread_count: 0 },
        {
          id: "announcements",
          name: "Announcements",
          type: "company",
          unread_count: 0,
        },
      ];

      // Fetch employees for DMs
      const { data: employees } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("company_id", companyId)
        .limit(10);

      const directChannels: Channel[] =
        employees?.map((emp) => ({
          id: `dm-${emp.id}`,
          name: emp.full_name,
          type: "direct" as const,
          unread_count: 0,
        })) || [];

      setChannels([...companyChannels, ...directChannels]);
      if (!activeChannel && companyChannels.length > 0) {
        setActiveChannel(companyChannels[0]);
      }
    } catch (error) {
      console.error("Error fetching channels:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (channelId: string) => {
    try {
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50);

      const demoMessages: Message[] =
        notifications?.map((notif) => ({
          id: notif.id,
          content: notif.message,
          sender_id: notif.user_id || "",
          sender_name: "System",
          channel_type: "company",
          channel_name: channelId,
          created_at: notif.created_at,
        })) || [];

      setMessages(demoMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const newMessage: Message = {
              id: payload.new.id,
              content: payload.new.message,
              sender_id: payload.new.user_id || "",
              sender_name: "System",
              channel_type: "company",
              channel_name: activeChannel?.id || null,
              created_at: payload.new.created_at,
            };
            setMessages((prev) => [newMessage, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !activeChannel) return;

    try {
      const { error } = await supabase.from("notifications").insert({
        company_id: companyId,
        user_id: user?.id,
        category: "system",  // Changed from "message" to "system" - valid category
        type: "info",
        title: `Message in ${activeChannel.name}`,
        message: messageInput,
        is_read: false,
      });

      if (error) {
        console.error("Send message error:", error);
        throw error;
      }

      setMessageInput("");
      toast({
        title: "✅ Message sent",
        description: "Your message has been delivered.",
      });
    } catch (error: any) {
      console.error("Failed to send message - full error:", error);
      toast({
        title: "Fehler",
        description: error.message || "Nachricht konnte nicht gesendet werden",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4 p-4">
      {/* Sidebar */}
      <Card className="w-80 flex flex-col border-0 shadow-xl">
        <CardHeader className="border-b">
          <CardTitle className="text-xl">{t("messages.title")}</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("messages.searchChannels")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  {t("messages.channels")}
                </h3>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {filteredChannels
                .filter((ch) => ch.type === "company")
                .map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannel(channel)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      activeChannel?.id === channel.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        <span className="font-medium">{channel.name}</span>
                      </div>
                      {channel.unread_count > 0 && (
                        <Badge variant="destructive" className="h-5">
                          {channel.unread_count}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  {t("messages.directMessages")}
                </h3>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {filteredChannels
                .filter((ch) => ch.type === "direct")
                .map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannel(channel)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      activeChannel?.id === channel.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(channel.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{channel.name}</span>
                      </div>
                      {channel.unread_count > 0 && (
                        <Badge variant="destructive" className="h-5">
                          {channel.unread_count}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </ScrollArea>
      </Card>

      {/* Main Chat */}
      <Card className="flex-1 flex flex-col border-0 shadow-xl">
        {activeChannel ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {activeChannel.type === "company" ? (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                  ) : (
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(activeChannel.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <h2 className="text-xl font-semibold">
                      {activeChannel.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {activeChannel.type === "company"
                        ? t("messages.companyChannel")
                        : t("messages.directMessage")}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  {t("messages.members")}
                </Button>
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("messages.noMessages")}</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(message.sender_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-sm">
                            {message.sender_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{message.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  placeholder={`${t("messages.messagePlaceholder")} ${
                    activeChannel.name
                  }...`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={!messageInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t("messages.sendInstructions")}
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {t("messages.selectChannel")}
              </h3>
              <p className="text-sm">{t("messages.selectChannelDesc")}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
