import { RolePermissionEditor } from "@/components/settings/RolePermissionEditor";
import {
  CustomRole,
  PermissionCategory,
} from "@/types/permissions";

interface UserRolesTabProps {
  customRolesData: CustomRole[];
  selectedRoleForEdit: CustomRole | null;
  setSelectedRoleForEdit: React.Dispatch<React.SetStateAction<CustomRole | null>>;
  handleUpdateDetailedPermission: (
    roleName: string,
    category: PermissionCategory,
    permission: string,
    value: boolean
  ) => void;
  handleCreateNewRole: () => void;
  handleDeleteRoleEnhanced: (roleName: string) => void;
  handleUpdateRoleDescription: (roleName: string, description: string) => void;
  isRolesLoading: boolean;
}

export function UserRolesTab({
  customRolesData,
  selectedRoleForEdit,
  setSelectedRoleForEdit,
  handleUpdateDetailedPermission,
  handleCreateNewRole,
  handleDeleteRoleEnhanced,
  handleUpdateRoleDescription,
  isRolesLoading,
}: UserRolesTabProps) {
  return (
    <RolePermissionEditor
      roles={customRolesData}
      selectedRole={selectedRoleForEdit}
      onSelectRole={setSelectedRoleForEdit}
      onUpdatePermission={handleUpdateDetailedPermission}
      onCreateRole={handleCreateNewRole}
      onDeleteRole={handleDeleteRoleEnhanced}
      onUpdateRoleDescription={handleUpdateRoleDescription}
      isLoading={isRolesLoading}
    />
  );
}
