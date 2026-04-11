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
      'openrouter/free',
      'qwen/qwen3.5-9b',
      'nvidia/nemotron-3-super-120b-a12b',
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

export interface FAQItem {
  question: string;
  answer: string;
  category: "general" | "technical" | "cost" | "privacy";
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What is ChessAgine and how is it different from a chess coach?",
    answer:
      "ChessAgine is your AI chess buddy, NOT a formal coach. Think of it as a knowledgeable friend who's always available to chat about chess, analyze positions, explain concepts, and help you explore the game. Unlike a structured coaching program, ChessAgine adapts to your curiosity and provides conversational, friendly guidance whenever you need it.",
    category: "general",
  },
  {
    question: "Is ChessAgine suitable for beginners?",
    answer:
      "Absolutely! ChessAgine is designed to be helpful for players of all levels. It can explain basic rules, teach fundamental concepts, suggest beginner-friendly openings, and provide encouragement. The AI adapts its explanations to your level and asks clarifying questions to better understand what you want to learn.",
    category: "general",
  },
  {
    question: "Can ChessAgine help improve my chess rating?",
    answer:
      "While ChessAgine isn't a replacement for structured training or human coaching, it can definitely support your improvement journey. It can help you understand your games, explain tactical patterns, suggest areas to focus on, and provide practice scenarios. Think of it as a study companion that's available 24/7.",
    category: "general",
  },
  {
    question: "Is ChessAgine open source? Can I run it myself?",
    answer:
      "Yes! ChessAgine is FOSS (free and open-source software). You can fork the project on GitHub and run it locally if you want complete control over your setup. Most users prefer the hosted version at chessagine.com for convenience, but the option to self-host is always available.",
    category: "general",
  },

  {
    question: "What is AgineCloud and how do I use it?",
    answer:
      "AgineCloud is ChessAgine's built-in cloud provider. Free accounts get access to free random openrouter open-source models instantly. Paid tier users unlock four additional premium models including Google Gemini Pro and Claude Sonnet, running on dedicated resources for faster, more reliable responses.",
    category: "technical",
  },
  {
    question: "What are Knowledge Cards?",
    answer:
      "Knowledge Cards are a premium feature that let you teach ChessAgine about your own chess knowledge. Create custom cards to share your favorite openings, tactical patterns, endgame techniques, or personal chess insights. ChessAgine will reference your Knowledge Cards during analysis and conversations, making it a truly personalized chess assistant that understands your unique playing style and preferences.",
    category: "cost",
    },
  {
    question: "Can ChessAgine make mistakes or give incorrect analysis?",
    answer:
      "Yes, like all AI models, ChessAgine can make mistakes or occasionally provide incorrect information — this is called 'hallucination'. It might miscalculate variations, give inaccurate historical facts, or misunderstand complex positions. Always use your own judgment and cross-reference important information. Premium models on the paid tier generally make fewer errors than free models.",
    category: "technical",
  },

  {
    question: "What external services and integrations does ChessAgine connect to?",
    answer:
      "ChessAgine integrates with several chess services: Stockfish and Maia engines for position analysis and evaluation, Lichess for game import and opening databases (enhanced with your API token), Posira for additional chess data, and ChessBoardMagic for board visualization. You can also connect your Lichess studies with an API token to give ChessAgine context about your personal chess knowledge and study history.",
    category: "technical",
  },
  {
    question: "Is ChessAgine trained on millions of chess games?",
    answer:
      "ChessAgine itself is not specially trained, it uses base AI models' existing training. ChessAgine is FOSS that applies various AI engineering techniques to convert general AI models into chess-aware assistants. The underlying models have seen chess content during training, and ChessAgine enhances their capabilities through external chess services integrations.",
    category: "technical",
  },
  {
    question: "How accurate is ChessAgine's chess analysis?",
    answer:
      "ChessAgine provides good general chess understanding and conversational explanations. For precise move evaluation it integrates with Stockfish. Premium models on the paid tier (Gemini Pro, Claude Sonnet) deliver noticeably better strategic reasoning and fewer errors than the free openrouter models.",
    category: "technical",
  },
  {
    question: "Do different AI models give different quality results?",
    answer:
      "Absolutely. Premium models (Gemini Pro, Claude Sonnet, Qwen, Llama) provide more accurate analysis, better strategic understanding, more tool calls per session, and a larger chess context window. Free community models are great for learning and casual analysis. If you need reliable analysis for important games, upgrading to the paid tier makes a significant difference.",
    category: "technical",
  },
  {
    question: "Can ChessAgine analyze games from Lichess?",
    answer:
      "Yes! You can paste PGN games from any platform and ChessAgine can analyze them. With the Lichess integration you can also explore opening databases and get additional context for your games.",
    category: "technical",
  },
  {
    question: "What is the daily usage limit, and why is it in place for paid tier users?",
    answer:
    "Paid tier users have a daily limit to ensure fair resource allocation and server stability. This helps us maintain affordable pricing while providing reliable service to all users. The limit is generous enough for typical chess study sessions. If you hit the daily limit, you can still continue using agine but with a free model. Or optionally set your own openRouter token",
    category: "cost",
  },

  {
    question: "Can I use ChessAgine for completely free?",
    answer:
      "Yes! All chess tools — position analysis, game review, puzzles, play bot, and opening explorer — are completely free. Agine Chat is also free with access to random free open router AI models. The only thing behind the paid tier is access to stronger premium AI models with more tool calls and a deeper chess context window with custom chess knowledgecards.",
    category: "cost",
  },
  {
    question: "What is included in the free plan vs. the paid tier?",
    answer:
      "Free plan: all chess tools, Agine Chat, random open router free models, basic chess context window. Paid tier: everything in free, plus four premium models (google/gemini-3.1-pro-preview, anthropic/claude-sonnet-4.6, qwen/qwen3.5-9b, meta-llama/llama-3.1-8b-instruct), more tool calls per session, extended chess context window, dedicated resources, and priority response speed, and allowing agine to access your own chess knowledge cards for personalized context.",
    category: "cost",
  },
  {
    question: "How do I upgrade to the paid tier?",
    answer:
      "Visit the Pricing page and click 'Upgrade'. You'll be taken through a secure checkout powered by Clerk Billing. Once subscribed, premium models become available immediately in your model settings.",
    category: "cost",
  },
  {
    question: "Can I cancel my paid tier subscription?",
    answer:
      "Yes, you can cancel at any time from your account billing settings. You'll retain paid tier access until the end of your current billing period, then revert to the free plan.",
    category: "cost",
  },


  {
    question: "Is my chess data and conversation history private?",
    answer:
      "Conversations are processed through AgineCloud's servers to generate AI responses. ChessAgine does not store your conversation history beyond the active session. For complete privacy, you can self-host ChessAgine, see the GitHub repo for instructions.",
    category: "privacy",
  },
];