export interface ProviderConfig {
  name: string;
  models: string[];
  keyPrefix: string;
  website: string;
  docsUrl: string;
  supportsRouting: boolean;
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

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}


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
      'arcee-ai/trinity-large-preview',
      'stepfun/step-3.5-flash',
      'z-ai/glm-4.5-air',
      'qwen/qwen3.5-9b',
      'meta-llama/llama-3.1-8b-instruct',
      'google/gemini-3.1-pro-preview',
      'anthropic/claude-sonnet-4.6'
    ],
    keyPrefix: '',
    website: 'https://www.chessagine.com/docs',
    docsUrl: 'https://www.chessagine.com/docs',
    supportsRouting: false,
  },
};

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