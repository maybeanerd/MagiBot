import posthog, { PostHog } from 'posthog-node';
import configuration from './configuration';

// Singleton PostHog client
let client: PostHog | null = null;

export function initPostHog() {
  if (!client) {
    // Use configuration for PostHog keys
    const apiKey = configuration.posthogApiKey;
    if (!apiKey) {
      console.warn('PostHog API key not set. Analytics disabled.');
      return;
    }
    client = new posthog.PostHog(apiKey);
  }
}

export function trackCommandUsage({
  commandName,
  userId,
  properties = {},
}: {
  commandName: string;
  userId: string;
  properties?: Record<string, any>;
}) {
  if (!client) {
    console.warn('PostHog client not initialized.');
    return;
  }
  client.capture({
    distinctId: userId,
    event: 'command_used',
    properties: {
      command: commandName,
      ...properties,
    },
  });
}

export function shutdownPostHog() {
  if (client) {
    client.shutdown();
    client = null;
  }
}
