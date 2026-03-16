export type OpenAIModel =
  | "gpt-5.4"         // current flagship, best reasoning + tool use
  | "gpt-5.4-pro"     // max intelligence
  | "gpt-5-mini"      // fast + cheap
  | "gpt-4.1"         // 1M context window
  | "gpt-4.1-mini"
  | "gpt-4.1-nano"
  | "gpt-4o"
  | "gpt-4o-mini"
  | "o3"              // best for deep reasoning/math
  | "o4-mini";

export type AnthropicModel =
  | "claude-opus-4-6"    // latest, best reasoning + tool use (Feb 2026)
  | "claude-sonnet-4-6"  // latest balanced (Feb 2026)
  | "claude-sonnet-4-5"  // previous balanced
  | "claude-haiku-4-5";  // fastest/cheapest

export type GoogleModel =
  | "gemini-3.1-pro-preview"  // latest flagship (replaces deprecated 3-pro-preview)
  | "gemini-2.5-pro"          // stable, best value pro
  | "gemini-2.5-flash"        // fast + cheap
  | "gemini-2.5-flash-lite";  // cheapest

export type OllamaModel =
  | "qwen3:8b"
  | "qwen3:4b"
  | "qwen3:30b"
  | "gpt-oss:20b"
  | "gpt-oss:120b"
  | "deepseek-v3.1:671b-cloud"
  | "gpt-oss:120b-cloud"
  | "gpt-oss:20b-cloud"
  | "kimi-k2-thinking:cloud"
  | "kimi-k2:1t-cloud";

export type AgineCloudModel =
  | "openai/gpt-oss-120b:free"                          // best free, tool support, 131K ctx
  | "openai/gpt-oss-20b:free"                           // solid free, tool support
  | "meta-llama/llama-3.3-70b-instruct:free"            // reliable free, tool support
  | "mistralai/mistral-small-3.1-24b-instruct:free"     // free, vision + tools
  | "qwen/qwen3-coder:free"                             // best free for coding/tools, 262K ctx
  | "nvidia/nemotron-3-super-120b-a12b:free"            // free, tools + reasoning, 262K ctx
  | "google/gemma-3-27b-it:free"                        // free, vision + tools
  | "google/gemini-3.1-pro-preview"
  | "anthropic/claude-sonnet-4.6";                    // paid, flagship

export type LanguageModel = OpenAIModel | AnthropicModel | GoogleModel | OllamaModel | AgineCloudModel;

export type Provider = "openai" | "anthropic" | "google" | "ollama" | "agineCloud";

export type ApiSetting = {
  provider: Provider;
  model: LanguageModel;
  apiKey: string;
  language: string;
  isRouted: boolean;
  ollamaBaseUrl?: string;
};