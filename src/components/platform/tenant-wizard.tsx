"use client"

import { useTenantWizard } from "@/hooks/use-tenant-wizard"
import { WizardProgress } from "./wizard/wizard-progress"
import { Step1BusinessDetails } from "./wizard/step1-business-details"
import { Step2SelectPlan } from "./wizard/step2-select-plan"
import { Step3AdminUser } from "./wizard/step3-admin-user"
import { Step4SelectModules } from "./wizard/step4-select-modules"
import { Step5Confirm } from "./wizard/step5-confirm"

export function TenantWizard() {
  const wizard = useTenantWizard()

  return (
    <div className="space-y-8">
      <WizardProgress currentStep={wizard.state.step} />

      <div className="max-w-4xl mx-auto">
        {wizard.state.step === 1 && (
          <Step1BusinessDetails
            data={wizard.state.businessDetails}
            onUpdate={wizard.updateBusinessDetails}
            onNext={wizard.nextStep}
          />
        )}

        {wizard.state.step === 2 && (
          <Step2SelectPlan
            selectedPlan={wizard.state.plan}
            onSelect={wizard.updatePlan}
            onNext={wizard.nextStep}
            onBack={wizard.prevStep}
          />
        )}

        {wizard.state.step === 3 && (
          <Step3AdminUser
            data={wizard.state.adminUser}
            onUpdate={wizard.updateAdminUser}
            onNext={wizard.nextStep}
            onBack={wizard.prevStep}
          />
        )}

        {wizard.state.step === 4 && (
          <Step4SelectModules
            selectedModules={wizard.state.modules}
            onUpdate={wizard.updateModules}
            onNext={wizard.nextStep}
            onBack={wizard.prevStep}
          />
        )}

        {wizard.state.step === 5 && (
          <Step5Confirm
            state={wizard.state}
            onSubmit={wizard.submit}
            onBack={wizard.prevStep}
            isSubmitting={wizard.isSubmitting}
          />
        )}
      </div>
    </div>
  )
}
