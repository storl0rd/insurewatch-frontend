import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const otlpEndpoint = import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const otlpHeaders = import.meta.env.VITE_OTEL_EXPORTER_OTLP_HEADERS ?
  Object.fromEntries(
    import.meta.env.VITE_OTEL_EXPORTER_OTLP_HEADERS.split(',').map(h => {
      const [key, value] = h.split('=');
      return [key.trim(), value.trim()];
    })
  ) : {};

const provider = new WebTracerProvider({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'insurewatch-frontend',
    [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
    'deployment.environment': import.meta.env.MODE || 'production',
    'service.language': 'javascript',
  }),
});

provider.addSpanProcessor(
  new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
      headers: otlpHeaders,
    })
  )
);

provider.register({
  contextManager: new ZoneContextManager(),
});

registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations({
      // Propagate trace context headers to all outgoing fetch requests
      '@opentelemetry/instrumentation-fetch': {
        propagateTraceHeaderCorsUrls: /.*/,
        clearTimingResources: true,
      },
      // Propagate trace context headers to all outgoing XHR requests
      '@opentelemetry/instrumentation-xml-http-request': {
        propagateTraceHeaderCorsUrls: /.*/,
      },
    }),
  ],
});
