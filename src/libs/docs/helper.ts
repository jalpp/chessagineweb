export interface ProviderConfig {
  name: string;
  models: string[];
  keyPrefix: string;
  website: string;
  docsUrl: string;
  supportsRouting: boolean;
}



export interface ModelRecommendation {
  provider: string;
  model: string;
  useCase: string;
  cost: 'Free' | 'Low' | 'Medium' | 'High';
  performance: 'Good' | 'Better' | 'Best';
  reasoning: string;
}

export interface ModelPricing {
  provider: string;
  model: string;
  inputPrice: number; // per 1M tokens
  outputPrice: number; // per 1M tokens
  costPer200Requests: number;
  tier: 'Free' | 'Budget' | 'Balanced' | 'Premium';
}



export interface ChessScenario {
  name: string;
  description: string;
  icon: React.ReactNode;
  tokensPerRequest: { input: number; output: number };
  requestsPerSession: number;
}

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'technical' | 'cost' | 'privacy';
}

export interface IntegrationItem {
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  status: 'Available' | 'Coming Soon' | 'Beta';
  link?: string;
}

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}


// Language options
export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹' },
];


export const PROVIDERS: Record<string, ProviderConfig> = {
  agineCloud: {
    name: 'aginecloud',
    models: [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'meta-llama/llama-3.3-70b-instruct',
      'mistralai/mistral-small-3.1-24b-instruct',
      'qwen/qwen3-coder',
      'nvidia/nemotron-3-super-120b-a12b',
      'google/gemma-3-27b-it',
      'google/gemini-3.1-pro-preview',
      'anthropic/claude-sonnet-4.6'
    ],
    keyPrefix: '',
    website: 'https://www.chessagine.com/docs',
    docsUrl: 'https://www.chessagine.com/docs',
    supportsRouting: false,
  },
  ollama: {
    name: 'Ollama',
    models: [
      'qwen3:8b',
      'qwen3:4b',
      'qwen3:30b',
      'gpt-oss:20b',
      'gpt-oss:120b',
      'deepseek-v3.1:671b-cloud',
      'gpt-oss:120b-cloud',
      'gpt-oss:20b-cloud',
      'kimi-k2-thinking:cloud',
      'kimi-k2:1t-cloud',
    ],
    keyPrefix: '',
    website: 'https://docs.ollama.com/',
    docsUrl: 'https://docs.ollama.com/',
    supportsRouting: false,
  },
  openai: {
    name: 'OpenAI',
    models: [
      'gpt-5.4',
      'gpt-5.4-pro',
      'gpt-5-mini',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o',
      'gpt-4o-mini',
      'o3',
      'o4-mini',
    ],
    keyPrefix: 'sk-',
    website: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs/quickstart',
    supportsRouting: true,
  },
  anthropic: {
    name: 'Anthropic Claude',
    models: [
      'claude-opus-4-6',
      'claude-sonnet-4-6',
      'claude-sonnet-4-5',
      'claude-haiku-4-5',
    ],
    keyPrefix: 'sk-ant-',
    website: 'https://console.anthropic.com/settings/keys',
    docsUrl: 'https://docs.anthropic.com/claude/docs/getting-started',
    supportsRouting: true,
  },
  google: {
    name: 'Google Gemini',
    models: [
      'gemini-3.1-pro-preview',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
    ],
    keyPrefix: 'AIza',
    website: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/docs',
    supportsRouting: true,
  },
};

export const MODEL_RECOMMENDATIONS: ModelRecommendation[] = [
  // FREE AgineCloud — tool-capable free models on OpenRouter (March 2026)
  {
    provider: 'AgineCloud',
    model: 'openai/gpt-oss-120b:free',
    useCase: 'Free advanced chess analysis with tool calling',
    cost: 'Free',
    performance: 'Best',
    reasoning: 'OpenAI\'s 120B open-weight model — 131K context, full tool support, near o4-mini reasoning quality. Best free model for chess analysis.',
  },
  {
    provider: 'AgineCloud',
    model: 'nvidia/nemotron-3-super-120b-a12b:free',
    useCase: 'Free powerful reasoning with tools',
    cost: 'Free',
    performance: 'Best',
    reasoning: 'NVIDIA\'s 120B MoE model with 262K context, tools, and reasoning. Multi-environment RL training makes it exceptional for multi-step chess analysis.',
  },
  {
    provider: 'AgineCloud',
    model: 'qwen/qwen3-coder:free',
    useCase: 'Free fast analysis with large context',
    cost: 'Free',
    performance: 'Better',
    reasoning: 'Qwen3 Coder 480B with 262K context and strong tool use. Excellent at structured analysis and multi-step reasoning over long game histories.',
  },
  {
    provider: 'AgineCloud',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    useCase: 'Free reliable general chess chat',
    cost: 'Free',
    performance: 'Better',
    reasoning: 'Meta\'s proven 70B model — solid tool calling, 128K context, consistently reliable. Best choice for beginners wanting a stable free experience.',
  },

  // FREE Ollama Cloud
  {
    provider: 'Ollama',
    model: 'gpt-oss:120b-cloud',
    useCase: 'Free cloud analysis — no setup needed',
    cost: 'Free',
    performance: 'Best',
    reasoning: 'OpenAI\'s 120B open-weight model running on Ollama cloud. Premium quality analysis without any subscription fees.',
  },
  {
    provider: 'Ollama',
    model: 'kimi-k2:1t-cloud',
    useCase: 'Free ultra-advanced cloud reasoning',
    cost: 'Free',
    performance: 'Best',
    reasoning: 'Kimi K2\'s 1-trillion parameter cloud model. Exceptional for deep positional analysis and long game reviews.',
  },
  {
    provider: 'Ollama',
    model: 'deepseek-v3.1:671b-cloud',
    useCase: 'Free strong reasoning cloud model',
    cost: 'Free',
    performance: 'Best',
    reasoning: 'DeepSeek V3.1 671B — rivals premium paid models for complex analysis at zero cost.',
  },
  {
    provider: 'Ollama',
    model: 'qwen3:8b',
    useCase: 'Free offline balanced analysis',
    cost: 'Free',
    performance: 'Good',
    reasoning: 'Great local option for intermediate players. No internet required after setup, runs on 8GB RAM.',
  },

  // Budget Paid
  {
    provider: 'OpenAI',
    model: 'gpt-4.1-nano',
    useCase: 'Ultra-cheap quick analysis',
    cost: 'Low',
    performance: 'Good',
    reasoning: 'Cheapest OpenAI model at $0.10/$0.40 per million tokens. Great for simple Q&A and move hints.',
  },
  {
    provider: 'OpenAI',
    model: 'gpt-5-mini',
    useCase: 'Budget fast cloud analysis',
    cost: 'Low',
    performance: 'Good',
    reasoning: 'GPT-5 intelligence at mini pricing ($0.25/$2.00). Strong reasoning for a budget model.',
  },
  {
    provider: 'Anthropic',
    model: 'claude-haiku-4-5',
    useCase: 'Fast hints and quick analysis',
    cost: 'Low',
    performance: 'Better',
    reasoning: 'Fastest Claude at $1/$5 per million tokens. Near-frontier performance for rapid game feedback.',
  },
  {
    provider: 'Google',
    model: 'gemini-2.5-flash-lite',
    useCase: 'Ultra-cheap high-volume analysis',
    cost: 'Low',
    performance: 'Good',
    reasoning: 'Cheapest Gemini at $0.10/$0.40 per million tokens. Ideal for high-frequency puzzle training.',
  },

  // Balanced
  {
    provider: 'OpenAI',
    model: 'gpt-5.4',
    useCase: 'Best overall reasoning and tool use',
    cost: 'Medium',
    performance: 'Best',
    reasoning: 'Current OpenAI flagship at $2.50/$15. Excellent tool calling, 1M context, and superior chess reasoning.',
  },
  {
    provider: 'Anthropic',
    model: 'claude-sonnet-4-6',
    useCase: 'Best balanced performance (Feb 2026)',
    cost: 'Medium',
    performance: 'Best',
    reasoning: 'Latest Sonnet at $3/$15. Adaptive thinking, 1M context, outstanding for deep game review.',
  },
  {
    provider: 'Google',
    model: 'gemini-2.5-pro',
    useCase: 'Deep analysis with large context',
    cost: 'Medium',
    performance: 'Best',
    reasoning: 'Best price-performance pro model at $1.25/$10. 1M context window excellent for full game analysis.',
  },
  {
    provider: 'OpenAI',
    model: 'o3',
    useCase: 'Complex multi-step chess reasoning',
    cost: 'Medium',
    performance: 'Best',
    reasoning: 'Chain-of-thought reasoning at $2/$8. Outperforms GPT-5 on logic and complex positional problems.',
  },

  // Premium
  {
    provider: 'Anthropic',
    model: 'claude-opus-4-6',
    useCase: 'Ultimate chess analysis (Feb 2026)',
    cost: 'High',
    performance: 'Best',
    reasoning: 'Most capable Claude at $5/$25. Adaptive thinking, 14+ hour task horizon, 1M context. Best for comprehensive game review.',
  },
  {
    provider: 'OpenAI',
    model: 'gpt-5.4-pro',
    useCase: 'Maximum intelligence analysis',
    cost: 'High',
    performance: 'Best',
    reasoning: 'OpenAI\'s highest-capability model. For professional-level deep analysis where only the best will do.',
  },
  {
    provider: 'Google',
    model: 'gemini-3.1-pro-preview',
    useCase: 'Cutting-edge multimodal reasoning',
    cost: 'High',
    performance: 'Best',
    reasoning: 'Google\'s latest flagship at $2/$12. Advanced agentic capabilities and best-in-class tool use.',
  },
];

export const MODEL_PRICING: ModelPricing[] = [
  // Ollama (all free)
  { provider: 'Ollama', model: 'qwen3:4b', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'Ollama', model: 'qwen3:8b', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'Ollama', model: 'qwen3:30b', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'Ollama', model: 'gpt-oss:20b', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'Ollama', model: 'gpt-oss:120b', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'Ollama', model: 'deepseek-v3.1:671b-cloud', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'Ollama', model: 'gpt-oss:120b-cloud', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'Ollama', model: 'gpt-oss:20b-cloud', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'Ollama', model: 'kimi-k2-thinking:cloud', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'Ollama', model: 'kimi-k2:1t-cloud', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },

  // AgineCloud (all free except flagship)
  { provider: 'AgineCloud', model: 'openai/gpt-oss-120b:free', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'AgineCloud', model: 'openai/gpt-oss-20b:free', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'AgineCloud', model: 'meta-llama/llama-3.3-70b-instruct:free', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'AgineCloud', model: 'mistralai/mistral-small-3.1-24b-instruct:free', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'AgineCloud', model: 'qwen/qwen3-coder:free', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'AgineCloud', model: 'nvidia/nemotron-3-super-120b-a12b:free', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'AgineCloud', model: 'google/gemma-3-27b-it:free', inputPrice: 0, outputPrice: 0, costPer200Requests: 0, tier: 'Free' },
  { provider: 'AgineCloud', model: 'google/gemini-3.1-pro-preview', inputPrice: 2.00, outputPrice: 12.00, costPer200Requests: 2.80, tier: 'Premium' },

  // OpenAI (March 2026 pricing)
  { provider: 'OpenAI', model: 'gpt-4.1-nano', inputPrice: 0.10, outputPrice: 0.40, costPer200Requests: 0.10, tier: 'Budget' },
  { provider: 'OpenAI', model: 'gpt-4.1-mini', inputPrice: 0.40, outputPrice: 1.60, costPer200Requests: 0.40, tier: 'Budget' },
  { provider: 'OpenAI', model: 'gpt-4o-mini', inputPrice: 0.15, outputPrice: 0.60, costPer200Requests: 0.15, tier: 'Budget' },
  { provider: 'OpenAI', model: 'gpt-5-mini', inputPrice: 0.25, outputPrice: 2.00, costPer200Requests: 0.45, tier: 'Budget' },
  { provider: 'OpenAI', model: 'gpt-4o', inputPrice: 2.50, outputPrice: 10.00, costPer200Requests: 2.50, tier: 'Balanced' },
  { provider: 'OpenAI', model: 'gpt-4.1', inputPrice: 2.00, outputPrice: 8.00, costPer200Requests: 2.00, tier: 'Balanced' },
  { provider: 'OpenAI', model: 'gpt-5.4', inputPrice: 2.50, outputPrice: 15.00, costPer200Requests: 3.50, tier: 'Balanced' },
  { provider: 'OpenAI', model: 'o4-mini', inputPrice: 1.10, outputPrice: 4.40, costPer200Requests: 1.10, tier: 'Balanced' },
  { provider: 'OpenAI', model: 'o3', inputPrice: 2.00, outputPrice: 8.00, costPer200Requests: 2.00, tier: 'Balanced' },
  { provider: 'OpenAI', model: 'gpt-5.4-pro', inputPrice: 10.00, outputPrice: 40.00, costPer200Requests: 10.00, tier: 'Premium' },

  // Anthropic (March 2026 — Opus/Sonnet 4.6 are latest)
  { provider: 'Anthropic', model: 'claude-haiku-4-5', inputPrice: 1.00, outputPrice: 5.00, costPer200Requests: 1.20, tier: 'Budget' },
  { provider: 'Anthropic', model: 'claude-sonnet-4-5', inputPrice: 3.00, outputPrice: 15.00, costPer200Requests: 3.60, tier: 'Balanced' },
  { provider: 'Anthropic', model: 'claude-sonnet-4-6', inputPrice: 3.00, outputPrice: 15.00, costPer200Requests: 3.60, tier: 'Balanced' },
  { provider: 'Anthropic', model: 'claude-opus-4-5', inputPrice: 5.00, outputPrice: 25.00, costPer200Requests: 6.00, tier: 'Premium' },
  { provider: 'Anthropic', model: 'claude-opus-4-6', inputPrice: 5.00, outputPrice: 25.00, costPer200Requests: 6.00, tier: 'Premium' },

  // Google Gemini (March 2026)
  { provider: 'Google', model: 'gemini-2.5-flash-lite', inputPrice: 0.10, outputPrice: 0.40, costPer200Requests: 0.10, tier: 'Budget' },
  { provider: 'Google', model: 'gemini-2.5-flash', inputPrice: 0.30, outputPrice: 2.50, costPer200Requests: 0.56, tier: 'Budget' },
  { provider: 'Google', model: 'gemini-2.5-pro', inputPrice: 1.25, outputPrice: 10.00, costPer200Requests: 2.25, tier: 'Balanced' },
  { provider: 'Google', model: 'gemini-3.1-pro-preview', inputPrice: 2.00, outputPrice: 12.00, costPer200Requests: 2.80, tier: 'Premium' },
];

export function calculateChatPrice(tokens: number, model: string){
    const modelPrice = MODEL_PRICING.find(val => val.model === model);

    if(!modelPrice){
        return 0;
    }

    return (tokens * (modelPrice.inputPrice + modelPrice.outputPrice) / 1000000);
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What is ChessAgine and how is it different from a chess coach?",
    answer: "ChessAgine is your AI chess buddy, not a formal coach. Think of it as a knowledgeable friend who's always available to chat about chess, analyze positions, explain concepts, and help you explore the game. Unlike a structured coaching program, ChessAgine adapts to your curiosity and provides conversational, friendly guidance whenever you need it.",
    category: "general"
  },
  {
    question: "Is ChessAgine suitable for beginners?",
    answer: "Absolutely! ChessAgine is designed to be helpful for players of all levels. It can explain basic rules, teach fundamental concepts, suggest beginner-friendly openings, and provide encouragement. The AI adapts its explanations to your level and asks clarifying questions to better understand what you want to learn.",
    category: "general"
  },
  {
    question: "Can I use ChessAgine completely free?",
    answer: "Yes! ChessAgine offers multiple free options: AgineCloud provides instant access to free community-hosted models including Gemini 3 Pro preview and other open-source models. Just select AgineCloud in settings and start analyzing. Alternatively, Ollama offers both cloud models (instant, no setup) and local models (offline, maximum privacy). Both are completely free forever!",
    category: "cost"
  },
  {
    question: "What is AgineCloud and how do I use it?",
    answer: "AgineCloud is a ChessAgine-hosted, community-driven cloud provider that's free to use. It runs affordable open-source models and some premium models like Gemini 3 Pro that run on community donations, so everyone shares the resources. To use it: simply select AgineCloud in the settings tab and start using it immediately - no API keys or setup required. Since it's in beta, you might encounter rate limits that reset every 24 hours.",
    category: "technical"
  },
  {
    question: "What's the difference between AgineCloud, Ollama, and paid API models?",
    answer: "AgineCloud: Free cloud-based provider hosted by ChessAgine. Select it in settings and start immediately - perfect for instant access. Ollama: Free models you run on your own device. Requires installation and setup following instructions, but gives you offline access and complete privacy. Paid APIs (OpenAI, Anthropic, Google): You insert your own API key from these providers and pay only for what you use. Generally faster with more advanced models, but costs money based on usage.",
    category: "technical"
  },
  {
    question: "What's the difference between Ollama Cloud and Ollama Local models?",
    answer: "Ollama Cloud models (with '-cloud' suffix) run on Ollama's free servers - you just connect ChessAgine and start analyzing, no setup required. Local models run on your own computer after installing Ollama from ollama.com, giving you offline access and maximum privacy but requiring adequate RAM. Both are completely free! Cloud models are easier to start with, while local models work without internet and keep everything private.",
    category: "technical"
  },
  {
    question: "Can ChessAgine help improve my chess rating?",
    answer: "While ChessAgine isn't a replacement for structured training or human coaching, it can definitely support your improvement journey. It can help you understand your games, explain tactical patterns, suggest areas to focus on, and provide practice scenarios. Think of it as a study companion that's available 24/7.",
    category: "general"
  },
  {
    question: "Can ChessAgine make mistakes or give incorrect analysis?",
    answer: "Yes, like all AI models, ChessAgine can make mistakes or occasionally provide incorrect information - this is called 'hallucination'. It might miscalculate variations, give inaccurate historical facts, or misunderstand complex positions. Always use your own judgment and cross-reference important information. For critical analysis, consider using higher-tier models like o1, GPT-5, Claude Opus-4.5, or Gemini 3 Pro. Free models may have more limitations than premium ones.",
    category: "technical"
  },
  {
    question: "Is ChessAgine trained on millions of chess games?",
    answer: "ChessAgine itself is not specially trained - it uses base AI models' existing training. ChessAgine is FOSS (free and open-source software) that applies various AI engineering techniques to convert general AI models into chess-aware assistants. The underlying models have seen chess content during training, but ChessAgine enhances their chess capabilities through prompt engineering and integration techniques. You can even fork ChessAgine and run it locally if you want!",
    category: "technical"
  },
  {
    question: "How can I get more accurate results from ChessAgine?",
    answer: "To improve accuracy: 1) Use higher-tier models (like GPT-5, Claude Opus-4.5, Gemini 3 Pro, or o1) which generally provide better reasoning, 2) Be specific in your questions, 3) Ask follow-up questions if something seems unclear, 4) Cross-reference important analysis with multiple sources. For free options, larger models typically perform better - AgineCloud's Gemini 3 Pro or Ollama's larger models (like gpt-oss:120b) give better results.",
    category: "technical"
  },
  {
    question: "How accurate is ChessAgine's chess analysis?",
    answer: "ChessAgine provides good general chess understanding and can explain concepts well, but it's not a chess engine like Stockfish. For precise move evaluation, it integrates with Stockfish. For learning and understanding concepts, ChessAgine excels at providing clear, conversational explanations. However, like all AI, it can make errors, so use it as a learning tool rather than an absolute authority.",
    category: "technical"
  },
  {
    question: "Do different AI models give different quality results?",
    answer: "Absolutely! More advanced models (like o1, GPT-5, Claude Opus-4.5, Gemini 3 Pro) generally provide more accurate analysis, better strategic understanding, and fewer mistakes compared to budget or free models. Free models from AgineCloud and Ollama are great for learning and casual analysis. If you need reliable analysis for important games, investing in a premium model can make a significant difference.",
    category: "technical"
  },
  {
    question: "Should I use free models or paid API models?",
    answer: "It depends on your needs! Free options (AgineCloud/Ollama) are perfect for: learning basics, casual analysis, unlimited practice without cost concerns, and offline use (Ollama local). Paid APIs are better for: faster responses, more sophisticated analysis, heavy usage without rate limits, and professional-level chess study. Many users start with free options and upgrade to paid models for important analysis.",
    category: "cost"
  },
  {
    question: "How much does it typically cost to use ChessAgine with paid APIs?",
    answer: "With AgineCloud and Ollama: $0 - completely free! With paid APIs: Costs vary by model and usage. Budget models like GPT-5-nano ($0.05/$0.40 per million tokens) or Gemini Flash-Lite ($0.10/$0.40): expect $0.50-$2 per month for casual use. Mid-tier models like GPT-5 or Claude Sonnet: $2-$10 monthly for regular use. Premium models: $10-$30+ for heavy usage. The cost analysis tab shows detailed breakdowns for different patterns.",
    category: "cost"
  },
  {
    question: "Where do I set up payment information to use ChessAgine?",
    answer: "For AgineCloud/Ollama models: No payment needed - they're completely free. For paid APIs: You set up payment directly with the AI provider (OpenAI, Anthropic, or Google), not within ChessAgine. Visit your chosen provider's website, create an account, add payment methods, generate an API key, then insert that key into ChessAgine settings.",
    category: "cost"
  },
  {
    question: "Is my chess data and conversation history private?",
    answer: "Privacy depends on your provider: AgineCloud: Conversations are processed through community-hosted servers. Ollama Local: Maximum privacy - everything runs on your computer, nothing leaves your device. Ollama Cloud: Processed on Ollama's servers. Paid APIs: ChessAgine doesn't store conversations - they go directly between your browser and the provider. Check each provider's privacy policy for details on data handling.",
    category: "privacy"
  },
  {
    question: "Can I use multiple AI providers with ChessAgine?",
    answer: "Yes! You can set up AgineCloud for instant free access, install Ollama for local free models, AND add API keys for OpenAI, Anthropic, and Google, then switch between them. This lets you use different models for different purposes - perhaps AgineCloud for quick questions, Ollama for offline study, and a powerful paid model for deep analysis. Mix and match based on your needs!",
    category: "technical"
  },
  {
    question: "What happens if I run out of API credits for paid models?",
    answer: "If your API credits are exhausted, you'll need to add more funds to your provider account. ChessAgine will show you the error message from the provider. You can add credits directly through their platform. Alternatively, switch to AgineCloud or Ollama models which never run out since they're free.",
    category: "cost"
  },
  {
    question: "Can ChessAgine analyze games from chess.com or Lichess?",
    answer: "Yes! You can paste PGN games from any platform, and ChessAgine can analyze them. With the Lichess integration, you can also explore opening databases and get additional context for your games.",
    category: "technical"
  },
  {
    question: "What computer specs do I need to run Ollama local models?",
    answer: "It varies by model size: qwen3:4b needs ~4GB RAM, qwen3:8b needs ~8GB RAM, gpt-oss:20b needs ~20GB RAM, and larger models like gpt-oss:120b need 64GB+ RAM. Most modern computers can run the smaller models (4b-8b) just fine. Start with a smaller model and upgrade if you have the resources and want better analysis quality. If you don't want to worry about local setup, use AgineCloud or Ollama Cloud models instead!",
    category: "technical"
  },
  {
    question: "Is ChessAgine open source? Can I run it myself?",
    answer: "Yes! ChessAgine is FOSS (free and open-source software). You can fork the project on GitHub and run it locally if you want complete control over your setup. This gives you full customization options and the ability to modify it for your specific needs. Most users prefer the hosted version at chessagine.com for convenience, but the option to self-host is always available.",
    category: "technical"
  }
];