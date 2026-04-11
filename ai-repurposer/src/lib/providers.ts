// Central provider + model configuration

export type ProviderId = "gemini" | "groq" | "openrouter" | "nvidia" | "openai";

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
    id: "gemini",
    name: "Google Gemini",
    icon: "✦",
    color: "#4285F4",
    apiKeyLabel: "Gemini API Key",
    apiKeyPlaceholder: "AIzaSy...",
    apiKeyLink: "https://aistudio.google.com/app/apikey",
    apiKeyLinkText: "aistudio.google.com",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", badge: "Fastest", context: "1M ctx" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", badge: "Free", context: "1M ctx" },
      { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B", badge: "Ultra Fast", context: "1M ctx" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", badge: "Smart", context: "2M ctx" },
      { id: "gemini-2.5-pro-exp-03-25", name: "Gemini 2.5 Pro (Exp)", badge: "Powerful", context: "1M ctx" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    icon: "⚡",
    color: "#F55036",
    apiKeyLabel: "Groq API Key",
    apiKeyPlaceholder: "gsk_...",
    apiKeyLink: "https://console.groq.com/keys",
    apiKeyLinkText: "console.groq.com",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", badge: "Versatile", context: "128K" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", badge: "Fastest", context: "128K" },
      { id: "llama3-70b-8192", name: "Llama 3 70B", badge: "Stable", context: "8K" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", badge: "MoE", context: "32K" },
      { id: "gemma2-9b-it", name: "Gemma 2 9B", badge: "Google", context: "8K" },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 (Llama 70B)", badge: "Reasoning", context: "128K" },
    ],
  },
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
      // Verified Free Models (April 2026)
      { id: "openrouter/free", name: "Free Router (Auto)", badge: "Recommended", context: "200K" },
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", badge: "Free • Smart", context: "65K" },
      { id: "meta-llama/llama-3.1-8b-instruct:free", name: "Llama 3.1 8B", badge: "Free • Fast", context: "128K" },
      { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B", badge: "Free • Google", context: "8K" },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1", badge: "Free • Reasoning", context: "164K" },
      { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B", badge: "Free • Classic", context: "32K" },
      { id: "qwen/qwen-2.5-72b-instruct:free", name: "Qwen 2.5 72B", badge: "Free • Stable", context: "128K" },
      // Paid (high performance)
      { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", badge: "Fast", context: "200K" },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", badge: "Affordable", context: "128K" },
      { id: "google/gemini-pro-1.5", name: "Gemini 1.5 Pro", badge: "Smart", context: "2M" },
    ],
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    icon: "🟢",
    color: "#76B900",
    apiKeyLabel: "NVIDIA API Key",
    apiKeyPlaceholder: "nvapi-...",
    apiKeyLink: "https://build.nvidia.com/",
    apiKeyLinkText: "build.nvidia.com",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    models: [
      { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B", badge: "Optimized", context: "128K" },
      { id: "meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B", badge: "Fast", context: "128K" },
      { id: "nvidia/llama-3.1-nemotron-70b-instruct", name: "Nemotron 70B", badge: "NVIDIA", context: "128K" },
      { id: "mistralai/mistral-7b-instruct-v0.3", name: "Mistral 7B v0.3", badge: "Efficient", context: "32K" },
      { id: "google/gemma-2-27b-it", name: "Gemma 2 27B", badge: "Smart", context: "8K" },
      { id: "deepseek-ai/deepseek-r1", name: "DeepSeek R1", badge: "Reasoning", context: "64K" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: "◆",
    color: "#10A37F",
    apiKeyLabel: "OpenAI API Key",
    apiKeyPlaceholder: "sk-proj-...",
    apiKeyLink: "https://platform.openai.com/api-keys",
    apiKeyLinkText: "platform.openai.com",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini", badge: "Affordable", context: "128K" },
      { id: "gpt-4o", name: "GPT-4o", badge: "Smart", context: "128K" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", badge: "Powerful", context: "128K" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", badge: "Fast", context: "16K" },
      { id: "o1-mini", name: "o1 Mini", badge: "Reasoning", context: "128K" },
    ],
  },
];

export function getProvider(id: ProviderId): Provider {
  return PROVIDERS.find((p) => p.id === id) || PROVIDERS[0];
}
