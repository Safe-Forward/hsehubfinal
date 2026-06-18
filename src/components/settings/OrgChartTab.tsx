import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface TeamMember {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  line_manager_id: string | null;
  functional_manager_id: string | null;
}

interface TreeNode extends TeamMember {
  children: TreeNode[];
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  manager: "bg-blue-100 text-blue-800 border-blue-200",
  hse_manager: "bg-green-100 text-green-800 border-green-200",
  employee: "bg-gray-100 text-gray-700 border-gray-200",
};

function getRoleBadgeClass(role: string): string {
  const key = role?.toLowerCase().replace(/\s+/g, "_");
  return ROLE_COLORS[key] || "bg-gray-100 text-gray-700 border-gray-200";
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

interface MemberCardProps {
  member: TeamMember;
  allMembers: TeamMember[];
  isMatrix: boolean;
}

function MemberCard({ member, allMembers, isMatrix }: MemberCardProps) {
  const functionalManager = isMatrix && member.functional_manager_id
    ? allMembers.find((m) => m.id === member.functional_manager_id)
    : null;

  return (
    <div className="flex flex-col items-center">
      <div className="bg-card border rounded-lg p-3 shadow-sm w-44 text-center hover:shadow-md transition-shadow">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm mx-auto mb-2">
          {getInitials(member.first_name, member.last_name)}
        </div>
        {/* Name */}
        <p className="font-medium text-sm leading-tight">
          {member.first_name} {member.last_name}
        </p>
        {/* Role badge */}
        <Badge
          variant="outline"
          className={`mt-1 text-xs ${getRoleBadgeClass(member.role)}`}
        >
          {member.role}
        </Badge>
        {/* Functional manager (matrix mode) */}
        {functionalManager && (
          <p className="mt-1.5 text-xs text-muted-foreground border-t pt-1 border-dashed">
            <span className="font-medium">Func: </span>
            {functionalManager.first_name} {functionalManager.last_name}
          </p>
        )}
      </div>
    </div>
  );
}

interface OrgTreeProps {
  node: TreeNode;
  allMembers: TeamMember[];
  isMatrix: boolean;
  isRoot?: boolean;
}

function OrgTree({ node, allMembers, isMatrix, isRoot = false }: OrgTreeProps) {
  return (
    <div className="flex flex-col items-center">
      <MemberCard member={node} allMembers={allMembers} isMatrix={isMatrix} />

      {node.children.length > 0 && (
        <>
          {/* Vertical connector down */}
          <div className="w-px h-6 bg-border" />

          {/* Horizontal bar spanning children */}
          <div className="flex items-start gap-8">
            {node.children.map((child, idx) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Connector tick up to horizontal bar */}
                <div className="w-px h-6 bg-border" />
                <OrgTree
                  node={child}
                  allMembers={allMembers}
                  isMatrix={isMatrix}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgChartTab() {
  const { companyId } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [orgType, setOrgType] = useState<"linie" | "matrix">("linie");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    fetchData();
  }, [companyId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [membersRes, settingsRes] = await Promise.all([
        supabase
          .from("team_members")
          .select("*")
          .eq("company_id", companyId),
        supabase
          .from("company_settings")
          .select("org_type")
          .eq("company_id", companyId)
          .single(),
      ]);

      if (membersRes.error) throw membersRes.error;

      setMembers((membersRes.data as TeamMember[]) || []);

      if (!settingsRes.error && settingsRes.data?.org_type) {
        setOrgType(settingsRes.data.org_type as "linie" | "matrix");
      }
    } catch (err: any) {
      console.error("OrgChart fetch error:", err);
      setError("Fehler beim Laden der Organigramm-Daten.");
    } finally {
      setLoading(false);
    }
  };

  // Build tree from flat member list using line_manager_id
  const buildTree = (members: TeamMember[]): TreeNode[] => {
    const map = new Map<string, TreeNode>();
    members.forEach((m) => map.set(m.id, { ...m, children: [] }));

    const roots: TreeNode[] = [];
    map.forEach((node) => {
      if (node.line_manager_id && map.has(node.line_manager_id)) {
        map.get(node.line_manager_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Organigramm wird geladen...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-destructive">
        {error}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
        <Users className="w-8 h-8" />
        <p>Noch keine Team-Mitglieder vorhanden.</p>
      </div>
    );
  }

  const roots = buildTree(members);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Organigramm
            <Badge variant="outline" className="ml-2 text-xs">
              {orgType === "matrix" ? "Matrix-Organisation" : "Linien-Organisation"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orgType === "matrix" && (
            <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-6 h-px bg-border" />
                <span>Linie (line_manager)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-px border-t border-dashed border-muted-foreground" />
                <span>Funktion (functional_manager, im Mitglieder-Card)</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto pb-4">
            <div className="flex gap-16 items-start min-w-max px-4 pt-4">
              {roots.map((root) => (
                <OrgTree
                  key={root.id}
                  node={root}
                  allMembers={members}
                  isMatrix={orgType === "matrix"}
                  isRoot
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
