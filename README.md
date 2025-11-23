[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

# ChessAgine

<p align="center">
  <img src="/public/static/images/agineowl.png" alt="ChessAgine" width="200"/>
</p>

A modern FOSS chess interface that combines LLMs and chess engines into one unified platform. Built for the community, by the community.
---

## Preview

<p align="center">
  <img src="/public/static/images/aginelatestui.png" alt="ChessAgine_Preview" >
</p>
(Agine analyzing position using free open source model)


## Features

- **Multi-AI Support**: Compatible with OpenAI, Claude, Gemini, and Ollama models  
- **Chess-Aware AI**: Advanced position analysis and contextual understanding via implementation of **Chess Context Protocol (CCP)**  
- **Stockfish Integration**: Powered by Stockfish 17.1 engine for accurate evaluation
- **Maia2 Integration**: Support for Maia 2 to see most human made moves for given position  
- **Opening Explorer**: Comprehensive opening database integration  
- **Puzzle Training**: Interactive chess puzzles for skill improvement  
- **Game Review**: Generate game review and ask Agine for specific move analysis
- **hallucinations Checker** checks the previous responses hallucinations  
- **Ollama Integration**: Run LLMs locally or via cloud and connect to ChessAgine. Free, open source, and no API key required  
- **Mobile/Tablet UI support** Able to talk to Agine on mobile/tablet


## Providers & Routers

ChessAgine works with multiple AI providers:

| Provider   | API Key Required | Example Models                                   |
|------------|-----------------|-------------------------------------------------|
| OpenAI     | ✅ Yes          | gpt-4, gpt-4o, gpt-5, o1, o3                     |
| Anthropic  | ✅ Yes          | claude-sonnet-4, claude-3.5-haiku                |
| Google     | ✅ Yes          | gemini-1.5-pro, gemini-2.5-flash                 |
| Ollama     | ❌ No           | qwen3:8b, gpt-oss:120b, deepseek-v3.1:671b-cloud, kimi-k2-thinking:cloud, kimi-k2:1t-cloud |
| ChessAgine Cloud |  ❌ No |    google/gemini-2.0-flash-exp,openai/gpt-oss-20b,nvidia/nemotron-nano-9b-v2 |

> ✅ Use Ollama for free, local, and open source AI integration without needing API keys.
> ✅ Use ChessAgineCloud for free cloud based open source models


| Router   | API Key Required | Example Models                                   |
|------------|-----------------|-------------------------------------------------|
| OpenRouter     | ✅ Yes          | gpt-4, gpt-4o, gpt-5, o1, o3, claude-sonnet-4, claude-3.5-haiku,                       |


> ✅ ChessAgine now supports Open router to connect to multiple providers at a time

## Chess trained LLM Models
ChessAgine GUI connects to [NAKSTStudio/chess-gemma-commentary](https://huggingface.co/NAKSTStudio/chess-gemma-commentary)
which can be used in Game review mode.

A Fine-tuned Gemma 3 270M model for generating chess move commentary, ELO predictions, and move classifications in 14 languages. 

```@model{chess_gemma_commentary_2025,
  title={Chess Gemma Commentary: Multilingual Chess Analysis},
  author={NAKST Studio},
  year={2025},
  howpublished={Hugging Face Hub}
}
```


## Using Ollama Locally (No API Key Required)

ChessAgine supports **Ollama** as a free, open-source option to run LLMs locally or via Ollama Cloud.  
Unlike other providers, **no API key is required**.

### Setup Steps

1. **Download Ollama**  
   👉 [https://ollama.com/](https://ollama.com/)

2. **Sign up to Ollama** (optional for cloud usage)

3. **Install models**  
   Run models locally or use the `-cloud` variants for Ollama Cloud.  
   Example:
   ```bash
   ollama run gpt-oss:20b


4. **Install ngrok**
   👉 [https://ngrok.com/download](https://ngrok.com/download)

5. **Authenticate ngrok**

   ```bash
   ngrok config add-authtoken <YOUR_TOKEN>
   ```

6. **Expose Ollama API on port 11434**

   ```bash
   ngrok http 11434
   ```

7. **Copy the ngrok forwarding URL** and paste it into ChessAgine **Settings**.

8. **Start using ChessAgine with Ollama models** 🎉

### Example Models Available

* `qwen3:8b`, `qwen3:4b`, `qwen3:30b`
* `gpt-oss:20b`, `gpt-oss:120b`
* Cloud versions: `deepseek-v3.1:671b-cloud`, `gpt-oss:20b-cloud`, `gpt-oss:120b-cloud`

## Chess Context Protocol (CCP)

ChessAgine is a **Chess Context Protocol Client (CCPC)** to the CCP.
To read more about the protocol, explore `/chessContextProtocol`.
This protocol allows Chess GUIs to integrate engines and LLMs seamlessly.

## ChessAgine MCP
ChessAgine has a comprehensive MCP server that brings CCP to your MCP Client like Claude desktop,
to install the server, read more [here](https://github.com/jalpp/chessagine-mcp)


## Open Source Software Credits

ChessAgine recognizes all the open source contributions made by various developers.
A huge thanks to everyone who helped make ChessAgine possible:

* **Stockfish developers** (see AUTHORS file). Stockfish [Computer software]. [https://github.com/official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish)

* **Maia developers and researchers:**

```
@inproceedings{tang2024maia,
       title={Maia-2: A Unified Model for Human-{AI} Alignment in Chess},
       author={Zhenwei Tang and Difan Jiao and Reid McIlroy-Young and Jon Kleinberg and Siddhartha Sen and Ashton Anderson},
       booktitle={The Thirty-eighth Annual Conference on Neural Information Processing Systems},
       year={2024},
       url={https://openreview.net/forum?id=XWlkhRn14K}
}
```

- Maia Web source coded modified and taken from [https://github.com/CSSLab/maia-platform-frontend](https://github.com/CSSLab/maia-platform-frontend)

* **ChessDojo developers**, whose modified UiEngine model and Stockfish UI components were used. [https://github.com/jackstenglein/chess-dojo-scheduler](https://github.com/jackstenglein/chess-dojo-scheduler)
* **Stockfish.js developers** [https://github.com/nmrugg/stockfish.js/](https://github.com/nmrugg/stockfish.js/) for providing compiled Stockfish 17.1 wasm and NNUE files.
* **Lichess developers** whose API enabled opening explorer, puzzle databases, and game imports. [https://lichess.org/api](https://lichess.org/api)
* **ChessKit developers** [https://github.com/GuillaumeSD/Chesskit](https://github.com/GuillaumeSD/Chesskit) for UI and engine setup code, plus game review algorithms.
* **ChessDB developers** [https://github.com/noobpwnftw/chessdb](https://github.com/noobpwnftw/chessdb) for billions of engine-analyzed positions in the cloud.
* **Mastra devs** [https://mastra.ai/](https://mastra.ai/) for the Agent framework powering AI features.

* **Chessboardmagic devs** [Toan Hoang](https://github.com/HollowLeaf1981/ChessPieces) for free open source chess pieces.

* **NAKSTStudio Devs** [https://huggingface.co/NAKSTStudio](https://huggingface.co/NAKSTStudio/activity/likes) for Free open source chess commentary trained model

---

## Author

ChessAgine by @jalpp


