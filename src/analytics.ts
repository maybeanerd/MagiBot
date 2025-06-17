import { PostHog } from 'posthog-node';
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
    client = new PostHog(apiKey, {
      host: 'https://eu.i.posthog.com',
    });
  }
}

export function trackGenericEvent({
  userId,
  event,
  properties = {},
}: {
  userId: string;
  event: string;
  properties?: Record<string, any>;
}) {
  if (!client) {
    console.warn('PostHog client not initialized.');
    return;
  }
  client.capture({
    distinctId: userId,
    event,
    properties,
  });
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
  trackGenericEvent({
    userId,
    event: 'command_used',
    properties: {
      ...properties,
      command: commandName,
    },
  });
}

export function trackJoinsoundPlayed({
  userId,
  properties = {},
}: {
  userId: string;
  properties?: Record<string, any>;
}) {
  trackGenericEvent({
    userId,
    event: 'joinsound_played',
    properties,
  });
}

export function shutdownPostHog() {
  if (client) {
    client.shutdown();
    client = null;
  }
}
