[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

# ChessAgine

<p align="center">
  <img src="/public/static/images/agineowl.png" alt="ChessAgine" width="200"/>
</p>

The most underrated FOSS chess interface that combines LLMs and chess engines into one unified platform. 
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
- **Neural Network Integration**: Support for Maia 2, Leela and Elite Leela neural net to see most human made moves for given position  
- **Opening Explorer**: Comprehensive opening database integration  
- **Puzzle Training**: Interactive chess puzzles for skill improvement  
- **Game Review**: Generate game review and ask Agine for specific move analysis
- **hallucinations Checker** checks the previous responses hallucinations  
- **Ollama Integration**: Run LLMs locally or via cloud and connect to ChessAgine. open source, and no API key required  
- **Mobile/Tablet UI support**: Able to talk to Agine on mobile/tablet
- **Full local web app**: Run ChessAgine GUI + Ollama to have entire app running on your own machine/hardware/cloud

## Running ChessAgine locally

### Quick Start
1. Clone the repository and install dependencies:
  ```bash
  npm install
  ```

2. Set up environment variables by creating a `.env.local` file in the root directory with your API keys:
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key // optional not needed, used for auth or multi user setup
  CLERK_SECRET_KEY=your_clerk_secret // optional not needed, used for auth, or multi user setup
  AGINE_KEY=your_api_key // your OpenRouter key to use OpenRouter as backend model provider
  NEXT_PUBLIC_OLLAMA_ENDPOINT=http://localhost:11434 // to use ollama as backend model provider
  LICHESS_API_TOKEN=your-lichess-token // optional used for Lichess Explorer API
  ```

3. Run the development server:
  ```bash
  npm run dev
  ```

4. Open [http://localhost:3000](http://localhost:3000) to see ChessAgine running locally


## Chess Context Protocol (CCP)

ChessAgine is a **Chess Context Protocol Client (CCPC)** to the CCP.
To read more about the protocol (beta), explore `/chessContextProtocol`.
This protocol allows Chess GUIs to integrate engines and LLMs seamlessly.

## ChessAgine MCP
ChessAgine has a comprehensive MCP server that brings CCP to your MCP Client like Claude desktop,
to install the server, read more [here](https://github.com/jalpp/chessagine-mcp)

## Thanks To Devs

check out ```./thanks.md``` to explore various devs who have indirectly or directly contributed to chessAgine project.

## 🚀 Thanks To Everyone! ❤️

[![Stargazers over time](https://starchart.cc/jalpp/chessagineweb.svg?variant=adaptive)](https://starchart.cc/jalpp/chessagineweb)

## Contributing 

check out ```./CONTRIBUTING.md``` for guidelines on how to contribute to ChessAgine.

## Author

ChessAgine by @jalpp


