import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TenantWizard } from '../tenant-wizard'

// Mock wizard hook
vi.mock('@/hooks/use-tenant-wizard', () => ({
  useTenantWizard: vi.fn(() => ({
    state: {
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
    },
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    updateBusinessDetails: vi.fn(),
    updatePlan: vi.fn(),
    updateAdminUser: vi.fn(),
    updateModules: vi.fn(),
    submit: vi.fn(),
    reset: vi.fn(),
    isSubmitting: false,
  })),
}))

// Mock wizard step components
vi.mock('../wizard/wizard-progress', () => ({
  WizardProgress: () => <div>Wizard Progress</div>,
}))

vi.mock('../wizard/step1-business-details', () => ({
  Step1BusinessDetails: () => <div>Step 1: Business Details</div>,
}))

vi.mock('../wizard/step2-select-plan', () => ({
  Step2SelectPlan: () => <div>Step 2: Select Plan</div>,
}))

vi.mock('../wizard/step3-admin-user', () => ({
  Step3AdminUser: () => <div>Step 3: Admin User</div>,
}))

vi.mock('../wizard/step4-select-modules', () => ({
  Step4SelectModules: () => <div>Step 4: Select Modules</div>,
}))

vi.mock('../wizard/step5-confirm', () => ({
  Step5Confirm: () => <div>Step 5: Confirm</div>,
}))

describe('TenantWizard', () => {
  it('renders without crashing', () => {
    render(<TenantWizard />)
    expect(screen.getByText('Wizard Progress')).toBeInTheDocument()
  })

  it('displays step 1 by default', () => {
    render(<TenantWizard />)
    expect(screen.getByText('Step 1: Business Details')).toBeInTheDocument()
  })

  it('displays wizard progress indicator', () => {
    render(<TenantWizard />)
    expect(screen.getByText('Wizard Progress')).toBeInTheDocument()
  })
})
