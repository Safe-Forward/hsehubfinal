---
status: complete
---

# Team-Rollen-Dropdown Fix

## Was geändert

### TeamTab.tsx
- `roles: Record<string, any>` prop entfernt
- `customRoleNames: string[]` prop hinzugefügt
- Beide Select-Dropdowns rendern jetzt `customRoleNames.map(...)` statt `Object.keys(roles).map(...)`
- Leerzustand: "Keine Rollen definiert" wenn `customRoleNames.length === 0`

### Settings.tsx
- `roles={roles}` → `customRoleNames={customRolesData.map((r) => r.role_name)}`
- `customRolesData` kommt direkt aus fetchCustomRoles() → nur DB-Rollen

## Commit
`5888637` — pushed to main, Vercel deployt
