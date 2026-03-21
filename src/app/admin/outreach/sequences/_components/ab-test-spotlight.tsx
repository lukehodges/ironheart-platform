"use client";

import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ABSequence {
  id: string;
  name: string;
  sector: string;
  totalSent: number;
  totalReplied: number;
  replyRate: number;
  totalConverted: number;
}

interface ABTestSpotlightProps {
  variantA: ABSequence;
  variantB: ABSequence;
}

export function ABTestSpotlight({ variantA, variantB }: ABTestSpotlightProps) {
  const winner = variantA.replyRate >= variantB.replyRate ? "A" : "B";
  const totalSamples = variantA.totalSent + variantB.totalSent;
  const confidence = Math.min(95, Math.round(50 + totalSamples * 0.3));

  return (
    <Card className="border-indigo-200 bg-indigo-50/30">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold">A/B Test Spotlight</h3>
          <Badge variant="secondary">{variantA.sector}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <VariantCard variant={variantA} label="A" isWinner={winner === "A"} />
          <VariantCard variant={variantB} label="B" isWinner={winner === "B"} />
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-medium">{confidence}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-indigo-500 transition-all"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VariantCard({
  variant,
  label,
  isWinner,
}: {
  variant: ABSequence;
  label: string;
  isWinner: boolean;
}) {
  return (
    <Card
      className={
        isWinner
          ? "border-emerald-300 bg-emerald-50/50"
          : "border-gray-200 bg-white"
      }
    >
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Variant {label}
          </span>
          {isWinner && (
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
              WINNING
            </Badge>
          )}
        </div>
        <p className="mb-3 font-semibold">{variant.name}</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Sent</p>
            <p className="text-sm font-medium">{variant.totalSent}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reply Rate</p>
            <p className="text-lg font-bold">{variant.replyRate}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Replied</p>
            <p className="text-sm font-medium">{variant.totalReplied}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Converted</p>
            <p className="text-sm font-medium">{variant.totalConverted}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
