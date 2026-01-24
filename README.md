[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

# ChessAgine

<p align="center">
  <img src="/public/static/images/agineowl.png" alt="ChessAgine" width="200"/>
</p>

A modern FOSS chess interface that combines LLMs and chess engines into one unified platform. 
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


## Chess Context Protocol (CCP)

ChessAgine is a **Chess Context Protocol Client (CCPC)** to the CCP.
To read more about the protocol (beta), explore `/chessContextProtocol`.
This protocol allows Chess GUIs to integrate engines and LLMs seamlessly.

## ChessAgine MCP
ChessAgine has a comprehensive MCP server that brings CCP to your MCP Client like Claude desktop,
to install the server, read more [here](https://github.com/jalpp/chessagine-mcp)

## Thanks

check out ```./thanks.md``` to explore various devs who have indirectly or directly contributed to chessAgine project.

## Contributing 

 out ```./CONTRIBUTING.md``` for guidelines on how to contribute to ChessAgine.

## Author

ChessAgine by @jalpp


