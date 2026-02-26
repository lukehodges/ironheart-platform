export interface RoleWithPermissions {
  id: string
  tenantId: string
  name: string
  description: string | null
  color: string | null
  isSystem: boolean
  isDefault: boolean
  permissionCount: number
  permissions: { id: string; resource: string; action: string; description: string | null }[]
  createdAt: Date
  updatedAt: Date
}

export interface PermissionGroup {
  moduleSlug: string
  moduleName: string
  permissions: { id: string; resource: string; action: string; description: string | null }[]
}

export interface UserRoleAssignment {
  userId: string
  userName: string
  userEmail: string
  roleId: string
  roleName: string
  grantedAt: Date
  grantedBy: string | null
  expiresAt: Date | null
}
