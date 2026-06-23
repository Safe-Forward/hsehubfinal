---
slug: team-rollen-dropdown
created: 2026-06-21
---

# Team-Rollen-Dropdown: Nur custom_roles anzeigen

## Problem
TeamTab erhält `roles` prop (Record<string,any>) mit hardcodierten Rollen (Admin, Line Manager, HSE Manager, Doctor, Employee, User) + custom roles aus DB → alle erscheinen im Dropdown.

## Fix
1. TeamTab.tsx: `roles` prop durch `customRoleNames: string[]` ersetzen
2. Beide Select-Dropdowns rendern `customRoleNames.map(...)` statt `Object.keys(roles).map(...)`
3. Settings.tsx: `roles={roles}` → `customRoleNames={customRolesData.map(r => r.role_name)}`

## Files
- /tmp/hsehub/src/components/settings/tabs/TeamTab.tsx
- /tmp/hsehub/src/pages/Settings.tsx (TeamTab-Aufruf bei Zeile ~3515)
