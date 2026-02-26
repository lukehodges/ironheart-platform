"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RoleList } from "@/components/settings/roles/role-list"
import { PermissionMatrix } from "@/components/settings/roles/permission-matrix"
import { UserRoleAssignment } from "@/components/settings/roles/user-role-assignment"
import { Shield, Grid3x3, Users } from "lucide-react"

/**
 * RolesTab - Main container for RBAC management.
 *
 * Sub-tabs:
 * - Roles: CRUD for custom roles
 * - Permission Matrix: grid of roles x permissions
 * - User Assignments: assign/remove roles for team members
 */
export function RolesTab() {
  return (
    <div className="animate-fade-in space-y-6">
      <Tabs defaultValue="roles" className="w-full">
        <TabsList>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="matrix" className="gap-2">
            <Grid3x3 className="h-4 w-4" />
            Permission Matrix
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <Users className="h-4 w-4" />
            User Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-6">
          <RoleList />
        </TabsContent>

        <TabsContent value="matrix" className="mt-6">
          <PermissionMatrix />
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <UserRoleAssignment />
        </TabsContent>
      </Tabs>
    </div>
  )
}
