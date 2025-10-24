
export type OpenAIModel =
  | "gpt-4"
  | "gpt-4-turbo"
  | "gpt-3.5-turbo"
  | "gpt-4o"
  | "gpt-4o-mini"
  | "o3"
  | "o3-mini"
  | "o1"
  | "o1-mini"
  | "o4-mini"
  | "gpt-5"
  | "gpt-5-mini"
  | "gpt-5-nano"
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano";

export type AnthropicModel =
  | "claude-sonnet-4-20250514"
  | "claude-opus-4-20250514"
  | "claude-3-5-sonnet-latest"
  | 'claude-3.7-sonnet'
  | 'claude-opus-4.1'
  | 'claude-sonnet-4.5'
  | "claude-3-5-haiku-latest";

export type GoogleModel =
  | "gemini-1.5-pro"
  | "gemini-1.5-flash"
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-lite"
  | "gemini-2.5-flash"
  | "gemini-2.5-pro";
  
export type OllamaModel =
  | "qwen3:8b"
  | "qwen3:4b"
  | "qwen3:30b"
  | "gpt-oss:20b"
  | "gpt-oss:120b"
  | "deepseek-v3.1:671b-cloud"
  | "gpt-oss:120b-cloud"
  | "gpt-oss:20b-cloud";


export type AgineCloudModel = 
  | "deepseek/deepseek-chat-v3.1:free"
  | "google/gemini-2.0-flash-exp:free"
  | "openai/gpt-oss-20b:free"
  | "nvidia/nemotron-nano-9b-v2:free"
  | "mistralai/mistral-small-3.1-24b-instruct:free"
  | "meta-llama/llama-3.3-70b-instruct:free"
  | "meta-llama/llama-4-maverick:free"


export type LanguageModel = OpenAIModel | AnthropicModel | GoogleModel | OllamaModel | AgineCloudModel;

export type Provider = "openai" | "anthropic" | "google" | "ollama" | "aginecloud"

export type ApiSetting = {
  provider: Provider;
  model: LanguageModel;
  apiKey: string;
  language: string;
  isRouted: boolean;
  ollamaBaseUrl?: string;
};
