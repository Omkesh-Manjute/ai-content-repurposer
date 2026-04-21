// Central provider + model configuration
export type ProviderId = "openrouter";

export interface ModelOption {
  id: string;
  name: string;
  badge?: string;
  context?: string;
}

export interface Provider {
  id: ProviderId;
  name: string;
  icon: string;
  color: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  apiKeyLink: string;
  apiKeyLinkText: string;
  models: ModelOption[];
  baseUrl?: string;
}

export const PROVIDERS: Provider[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: "🔀",
    color: "#6366F1",
    apiKeyLabel: "OpenRouter API Key",
    apiKeyPlaceholder: "sk-or-v1-...",
    apiKeyLink: "https://openrouter.ai/keys",
    apiKeyLinkText: "openrouter.ai",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      { id: "openrouter/auto", name: "Auto (Best for cost)", badge: "Recommended", context: "200K" },
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)", badge: "Free • Smart", context: "65K" },
      { id: "meta-llama/llama-3.1-8b-instruct:free", name: "Llama 3.1 8B (Free)", badge: "Free • Fast", context: "128K" },
      { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B (Free)", badge: "Free • Google", context: "8K" },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)", badge: "Free • Reasoning", context: "164K" },
      { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", badge: "Fast", context: "200K" },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", badge: "Affordable", context: "128K" },
    ],
  },
];

export function getProvider(id: ProviderId): Provider {
  return PROVIDERS[0];
}
