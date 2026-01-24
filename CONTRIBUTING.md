# Contributing

Thank you for your interest in contributing to chessAgine!

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Git

### Setup

1. Fork and clone the repository
2. Install dependencies:
    ```bash
    npm install
    ```

3. **Set up environment variables**

    Create a `.env.local` file in the root directory:
    to have your own Clerk sign/signup you would need an clerk account and set the following
    ```
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    CLERK_SECRET_KEY
    ```

    to run local agine cloud server, you can use your own open router key and paste it in

    ```
    AGINE_KEY
    ```

    Note this are optional envs, but good to set up when helping with issues user face.

4. Run the development server:
    ```bash
    npm run dev
    ```

    go to localhost:3000 and see agine on local server

## Working on Issues

- Check the [Issues](https://github.com/jalpp/chessagineweb/issues) page for open tasks
- Comment on an issue to express interest before starting work
- Create a feature branch:
  ```bash
  git checkout -b fix/issue-number-description
  ```
- Make your changes and test thoroughly
- Push to your fork and open a Pull Request

## Working on non technical tasks

Any help is a help, you can suggest ideas, perform full tests, or even tell your friends about agine. 

As a user, you can open issues on Github to contact me directly about any issues you find or ideas you have.

## Guidelines For Development

- Follow the existing code style
- Write clear commit messages
- Test your changes before submitting

