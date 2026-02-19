/**
 * OpenTelemetry SDK setup.
 * Only initialized when OTEL_EXPORTER_OTLP_ENDPOINT is set.
 * Skipped during Next.js build phase to avoid cold-start issues.
 *
 * Usage: import '@/shared/telemetry' in instrumentation.ts
 */

if (
  process.env.NEXT_PHASE !== 'phase-production-build' &&
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT
) {
  void (async () => {
    try {
      const { NodeSDK } = await import('@opentelemetry/sdk-node')
      const { getNodeAutoInstrumentations } = await import(
        '@opentelemetry/auto-instrumentations-node'
      )
      const { OTLPTraceExporter } = await import(
        '@opentelemetry/exporter-trace-otlp-http'
      )

      const sdk = new NodeSDK({
        traceExporter: new OTLPTraceExporter(),
        instrumentations: [getNodeAutoInstrumentations()],
      })

      sdk.start()
    } catch {
      // OTel init failure must never crash the app
    }
  })()
}
