# Contributing Guide

Thank you for your interest in contributing to msgReader!

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- (For desktop development) Rust toolchain

### Setup

```bash
# Clone the repository
git clone https://github.com/Rasalas/msg-reader.git
cd msg-reader

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173` with hot module reloading.

---

## Development Workflow

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Check code style |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format code with Prettier |

### Make Targets

```bash
make help          # Show all available targets
make dev           # Start development server
make test          # Run tests
make test-unit     # Run only unit tests (faster)
make mocks         # Generate mock email files for testing
```

---

## Code Style

### ESLint

The project uses ESLint for code quality:

```bash
npm run lint       # Check for issues
npm run lint:fix   # Auto-fix issues
```

### Prettier

Code formatting is handled by Prettier:

```bash
npm run format        # Format all files
npm run format:check  # Check formatting
```

### Conventions

- Use ES Modules (`import`/`export`)
- Use JSDoc comments for public APIs
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable and function names
- Keep functions small and focused

---

## Testing

### Running Tests

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Generate coverage report
make test-unit              # Unit tests only (faster)
make test-integration       # Integration tests only
```

### Writing Tests

Tests are in the `tests/` directory, mirroring the source structure:

```
tests/
├── unit/
│   ├── MessageHandler.test.js
│   ├── storage.test.js
│   └── ...
└── integration/
    └── ...
```

Example test:

```javascript
import MessageHandler from '../../src/js/MessageHandler.js';

describe('MessageHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new MessageHandler(mockStorage);
  });

  test('adds message with hash', () => {
    const message = handler.addMessage(mockMsgInfo, 'test.msg');
    expect(message.messageHash).toBeDefined();
  });
});
```

### Mock Emails

Generate test email files:

```bash
make mocks              # Generate scenario-based mocks
make mocks-bulk COUNT=100   # Generate bulk emails for performance testing
```

---

## Project Structure

```
src/js/
├── main.js              # App entry, orchestration
├── MessageHandler.js    # Message state
├── FileHandler.js       # File input
├── KeyboardManager.js   # Keyboard shortcuts
├── storage.js           # localStorage wrapper
├── sanitizer.js         # XSS protection
├── utils.js             # Parsers
└── ui/
    ├── UIManager.js     # UI coordinator
    └── ...              # Sub-managers
```

See [architecture.md](./architecture.md) for detailed component documentation.

---

## Pull Request Process

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Changes

- Write code following the style guide
- Add tests for new functionality
- Update documentation if needed

### 3. Test Your Changes

```bash
npm run lint
npm test
npm run build
```

All checks must pass.

### 4. Commit

Write clear commit messages:

```
feat: add keyboard shortcut for search

- Add Ctrl+F to focus search input
- Update help modal with new shortcut
```

Prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

### 5. Push and Create PR

```bash
git push -u origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear description of changes
- Reference to related issues
- Screenshots for UI changes

---

## Architecture Decisions

For significant changes, consider writing an ADR (Architecture Decision Record):

1. Copy `doc/adr/template.md`
2. Number it sequentially (e.g., `004-your-decision.md`)
3. Fill in context, decision, and rationale
4. Include in your PR

---

## Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- For questions, use GitHub Discussions
