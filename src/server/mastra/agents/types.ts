
export type OpenAIModel =
  | "gpt-4"
  | "gpt-4-turbo"
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
  | "gpt-5.1"
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano";

export type AnthropicModel =
  | "claude-sonnet-4-5"
  | 'claude-opus-4-1'
  | 'claude-opus-4-5'
  | "claude-haiku-4-5"

export type GoogleModel =
  | "gemini-1.5-pro"
  | "gemini-1.5-flash"
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-lite"
  | "gemini-2.5-flash"
  | "gemini-2.5-pro"
  | "gemini-3-pro-preview"
  
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
  | "amazon/nova-2-lite-v1:free"
  | "google/gemini-3-pro-preview"


export type LanguageModel = OpenAIModel | AnthropicModel | GoogleModel | OllamaModel | AgineCloudModel;

export type Provider = "openai" | "anthropic" | "google" | "ollama" | "agineCloud"

export type ApiSetting = {
  provider: Provider;
  model: LanguageModel;
  apiKey: string;
  language: string;
  isRouted: boolean;
  ollamaBaseUrl?: string;
};
