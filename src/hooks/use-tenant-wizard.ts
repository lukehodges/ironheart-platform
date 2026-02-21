'use client'

import { useState } from 'react'
import type { CreateTenantWizardState } from '@/types/platform-admin'
import { api } from '@/lib/trpc/react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const INITIAL_STATE: CreateTenantWizardState = {
  step: 1,
  businessDetails: {
    businessName: '',
    domain: '',
    industry: '',
  },
  plan: 'TRIAL',
  adminUser: {
    email: '',
    firstName: '',
    lastName: '',
  },
  modules: [],
}

export function useTenantWizard() {
  const [state, setState] = useState<CreateTenantWizardState>(INITIAL_STATE)
  const router = useRouter()

  const createMutation = api.platform.createTenant.useMutation({
    onSuccess: (data) => {
      toast.success('Tenant created successfully')
      router.push(`/platform/tenants/${data.id}`)
    },
    onError: (error) => {
      toast.error(`Failed to create tenant: ${error.message}`)
    },
  })

  const nextStep = () => {
    if (state.step < 5) {
      setState((prev) => ({ ...prev, step: (prev.step + 1) as any }))
    }
  }

  const prevStep = () => {
    if (state.step > 1) {
      setState((prev) => ({ ...prev, step: (prev.step - 1) as any }))
    }
  }

  const updateBusinessDetails = (details: Partial<CreateTenantWizardState['businessDetails']>) => {
    setState((prev) => ({
      ...prev,
      businessDetails: { ...prev.businessDetails, ...details },
    }))
  }

  const updatePlan = (plan: CreateTenantWizardState['plan']) => {
    setState((prev) => ({ ...prev, plan }))
  }

  const updateAdminUser = (user: Partial<CreateTenantWizardState['adminUser']>) => {
    setState((prev) => ({
      ...prev,
      adminUser: { ...prev.adminUser, ...user },
    }))
  }

  const updateModules = (modules: string[]) => {
    setState((prev) => ({ ...prev, modules }))
  }

  const submit = () => {
    createMutation.mutate({
      businessName: state.businessDetails.businessName,
      slug: state.businessDetails.domain,
      email: state.adminUser.email,
      plan: state.plan,
    })
  }

  const reset = () => {
    setState(INITIAL_STATE)
  }

  return {
    state,
    nextStep,
    prevStep,
    updateBusinessDetails,
    updatePlan,
    updateAdminUser,
    updateModules,
    submit,
    reset,
    isSubmitting: createMutation.isPending,
  }
}
