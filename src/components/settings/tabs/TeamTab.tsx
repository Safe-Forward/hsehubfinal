import { Mail, Plus, Send, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { sendMemberInvitation, sendNoteNotification } from "@/services/emailService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TeamMemberForm {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface TeamTabProps {
  teamMembers: any[];
  teamMemberForm: TeamMemberForm;
  setTeamMemberForm: React.Dispatch<React.SetStateAction<TeamMemberForm>>;
  isAddingTeamMember: boolean;
  roles: Record<string, any>;
  handleAddTeamMember: () => void;
  handleChangeTeamMemberRole: (memberId: string, memberName: string, oldRole: string, newRole: string) => void;
  fetchTeamMembers: () => void;
}

export function TeamTab({
  teamMembers,
  teamMemberForm,
  setTeamMemberForm,
  isAddingTeamMember,
  roles,
  handleAddTeamMember,
  handleChangeTeamMemberRole,
  fetchTeamMembers,
}: TeamTabProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("settings.teamManagement")}</CardTitle>
            <CardDescription>
              {t("settings.teamManagementDesc")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 mb-4 p-4 border rounded-lg bg-muted/50">
            <div>
              <Label>{t("settings.firstName")}</Label>
              <Input
                placeholder={t("settings.enterFirstName")}
                value={teamMemberForm.firstName}
                onChange={(e) =>
                  setTeamMemberForm((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>{t("settings.lastName")}</Label>
              <Input
                placeholder={t("settings.enterLastName")}
                value={teamMemberForm.lastName}
                onChange={(e) =>
                  setTeamMemberForm((prev) => ({
                    ...prev,
                    lastName: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>{t("common.email")}</Label>
              <Input
                type="email"
                placeholder={t("settings.enterEmail")}
                value={teamMemberForm.email}
                onChange={(e) =>
                  setTeamMemberForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>{t("settings.userRole")}</Label>
              <Select
                value={teamMemberForm.role}
                onValueChange={(value) =>
                  setTeamMemberForm((prev) => ({
                    ...prev,
                    role: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("settings.selectRole")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(roles).map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-4 flex justify-end">
              <Button
                onClick={handleAddTeamMember}
                disabled={isAddingTeamMember}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isAddingTeamMember
                  ? "Adding..."
                  : t("settings.addTeamMember")}
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("settings.name")}</TableHead>
                  <TableHead>{t("settings.email")}</TableHead>
                  <TableHead>{t("settings.role")}</TableHead>
                  <TableHead className="text-right">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t("settings.noTeamMembers")}
                    </TableCell>
                  </TableRow>
                ) : (
                  teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.first_name} {member.last_name}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          onValueChange={(newRole) =>
                            handleChangeTeamMemberRole(
                              member.id,
                              `${member.first_name} ${member.last_name}`,
                              member.role,
                              newRole
                            )
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(roles).map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await sendMemberInvitation(
                                      member.id,
                                      member.email,
                                      `${member.first_name} ${member.last_name}`
                                    );
                                    toast({
                                      title: "Success",
                                      description: "Invitation email sent successfully",
                                    });
                                  } catch (err: any) {
                                    toast({
                                      title: "Error",
                                      description: err.message || "Failed to send invitation",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Send Invite</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const { data: { user } } = await supabase.auth.getUser();
                                    const currentUserName = user?.user_metadata?.full_name || "Admin";

                                    await sendNoteNotification(
                                      member.email,
                                      `${member.first_name} ${member.last_name}`,
                                      "You have been mentioned in a note. Please check HSE Hub for details.",
                                      currentUserName
                                    );
                                    toast({
                                      title: "Success",
                                      description: "Notification email sent successfully",
                                    });
                                  } catch (err: any) {
                                    toast({
                                      title: "Error",
                                      description: err.message || "Failed to send notification",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Send Mail</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from("team_members")
                                      .delete()
                                      .eq("id", member.id);

                                    if (error) throw error;

                                    toast({
                                      title: "Success",
                                      description: "Team member removed successfully",
                                    });
                                    fetchTeamMembers();
                                  } catch (err: any) {
                                    toast({
                                      title: "Error",
                                      description: err.message,
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
