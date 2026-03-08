"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  LayoutDashboard,
  UserPlus,
  MapPin,
  ClipboardCheck,
  FileSearch,
  Calculator,
  FileSignature,
  Leaf,
  Users,
  GitCompareArrows,
  Receipt,
  Handshake,
  PoundSterling,
  ShieldCheck,
} from "lucide-react";

const DEMO_STEPS = [
  {
    title: "Command Centre",
    page: "/admin/brokerage-mockups/dashboard",
    icon: LayoutDashboard,
    narrative:
      "Your daily command centre. 18 active deals, £2.3M pipeline, 3 overdue compliance items. The lifecycle funnel shows where every deal sits across your business.",
    accent: "bg-blue-500",
  },
  {
    title: "New Supply Contact",
    page: "/admin/brokerage-mockups/contacts/new",
    icon: UserPlus,
    narrative:
      "A landowner calls in. We capture Robert Whiteley — farmer in the Solent catchment, 60 hectares of arable land. He's tagged as a Supply partner.",
    accent: "bg-emerald-500",
  },
  {
    title: "Onboard Site",
    page: "/admin/brokerage-mockups/sites/new",
    icon: MapPin,
    narrative:
      "We onboard Whiteley Farm as a potential supply site. Land size, current use, location captured. Catchment auto-detected from coordinates.",
    accent: "bg-amber-500",
  },
  {
    title: "Schedule Assessment",
    page: "/admin/brokerage-mockups/assessments/schedule",
    icon: ClipboardCheck,
    narrative:
      "Time to send an ecologist. We pick the site, select assessment type, and assign Sarah Chen — she's free Thursday and specialises in nutrient surveys.",
    accent: "bg-violet-500",
  },
  {
    title: "Assessment Results",
    page: "/admin/brokerage-mockups/assessments/ASM-001",
    icon: FileSearch,
    narrative:
      "Sarah visits the site, records baseline data. The system calculates: this land can generate 95 kg/year nitrogen credits. Photos and findings all captured.",
    accent: "bg-cyan-500",
  },
  {
    title: "Nutrient Calculator",
    page: "/admin/brokerage-mockups/assessments/calculator",
    icon: Calculator,
    narrative:
      "The Natural England nutrient budget methodology running inside your platform. No more spreadsheets emailed back and forth — it's all here.",
    accent: "bg-indigo-500",
  },
  {
    title: "Legal & Documents",
    page: "/admin/brokerage-mockups/documents/DOC-001",
    icon: FileSignature,
    narrative:
      "Legal kicks off. S106 agreement generated from a template, sent for signatures. We track who's signed and who hasn't. 80-year commitment secured.",
    accent: "bg-rose-500",
  },
  {
    title: "Site Goes Live",
    page: "/admin/brokerage-mockups/sites/S-0001",
    icon: Leaf,
    narrative:
      "Whiteley Farm is now an active supply site. 95 kg/year banked and ready to sell. The capacity gauge shows available credits — ready to allocate.",
    accent: "bg-emerald-600",
  },
  {
    title: "Developer Requirement",
    page: "/admin/brokerage-mockups/contacts/C-101",
    icon: Users,
    narrative:
      "Meanwhile, Rachel Morrison at Taylor Wimpey needs credits for a 200-home development in Eastleigh. Requirement: 30 kg/year nitrogen, Solent catchment.",
    accent: "bg-sky-500",
  },
  {
    title: "Supply Matching",
    page: "/admin/brokerage-mockups/matching",
    icon: GitCompareArrows,
    narrative:
      "One click — the system finds matching supply sites in the Solent catchment, ranked by price. Whiteley Farm offers competitive value.",
    accent: "bg-purple-500",
  },
  {
    title: "Generate Quote",
    page: "/admin/brokerage-mockups/deals/D-0038/quote",
    icon: Receipt,
    narrative:
      "We generate a quote: 30 kg/year at £2,500/kg = £75,000 total. Your 20% commission: £15,000. One click to send to Rachel.",
    accent: "bg-orange-500",
  },
  {
    title: "Deal in Progress",
    page: "/admin/brokerage-mockups/deals/D-0038",
    icon: Handshake,
    narrative:
      "Deal D-0038 is now live. The lifecycle bar shows exactly where we are. All parties, documents, and financials linked in one view.",
    accent: "bg-blue-600",
  },
  {
    title: "Payment & Commission",
    page: "/admin/brokerage-mockups/financials/invoices",
    icon: PoundSterling,
    narrative:
      "Payment comes through. £75,000 from Taylor Wimpey. £60,000 to Robert Whiteley. £15,000 is your commission. Every penny tracked.",
    accent: "bg-green-500",
  },
  {
    title: "Ongoing Compliance",
    page: "/admin/brokerage-mockups/compliance",
    icon: ShieldCheck,
    narrative:
      "The deal closes, but obligations continue for 80 years. Annual monitoring is auto-scheduled, reminders fire before deadlines. Nothing falls through the cracks.",
    accent: "bg-red-500",
  },
];

export default function DemoWalkthroughPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showClosing, setShowClosing] = useState(false);

  const step = DEMO_STEPS[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / DEMO_STEPS.length) * 100;

  const goNext = () => {
    if (currentStep < DEMO_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
      setShowClosing(false);
    } else {
      setShowClosing(true);
    }
  };

  const goPrev = () => {
    if (showClosing) {
      setShowClosing(false);
    } else if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const restart = () => {
    setCurrentStep(0);
    setShowClosing(false);
  };

  if (showClosing) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-6 bg-background">
        <div className="max-w-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto">
            <span className="text-white text-2xl font-bold">IH</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            That&apos;s one deal.
          </h1>
          <p className="text-xl text-muted-foreground">
            You&apos;re running 18 simultaneously across 6 catchments.
          </p>
          <p className="text-lg text-muted-foreground">
            And when you&apos;re ready to broker carbon credits, real estate, or
            energy — it&apos;s the same platform, different configuration.
          </p>
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button asChild>
              <Link href="/admin/brokerage-mockups/settings/vertical">
                See how →
              </Link>
            </Button>
            <Button variant="outline" onClick={restart}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart Demo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col bg-background">
      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-3xl space-y-6">
          {/* Step indicator */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              Step {currentStep + 1} of {DEMO_STEPS.length}
            </Badge>
            <div className="flex items-center gap-1.5">
              {DEMO_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentStep
                      ? "bg-primary w-6"
                      : i < currentStep
                        ? "bg-emerald-500"
                        : "bg-border"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Step card */}
          <Card className="overflow-hidden">
            <div className={`h-1.5 ${step.accent}`} />
            <CardContent className="p-8">
              <div className="flex items-start gap-5">
                <div
                  className={`shrink-0 w-12 h-12 rounded-xl ${step.accent} flex items-center justify-center`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 space-y-3">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {step.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {step.narrative}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview card linking to actual page */}
          <Link
            href={step.page}
            className="block group"
          >
            <Card className="border-dashed hover:border-primary/40 transition-colors">
              <CardContent className="py-4 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    Open live page: <span className="font-medium">{step.page.split("/brokerage-mockups")[1]}</span>
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs group-hover:border-primary/40 transition-colors"
                >
                  View →
                </Badge>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="border-t border-border bg-card/80 backdrop-blur sticky bottom-0">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Progress value={progress} className="h-1 mb-4" />
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={goPrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              {step.title}
            </span>
            <Button size="sm" onClick={goNext}>
              {currentStep === DEMO_STEPS.length - 1 ? "Finish" : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
