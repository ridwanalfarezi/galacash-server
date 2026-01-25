# Contributing to GalaCash Server

Thank you for your interest in contributing to GalaCash Server! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Contributions](#making-contributions)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to maintain a welcoming and inclusive community.

## Getting Started

### Prerequisites

- Node.js v20 or higher
- pnpm v10 or higher
- Docker Desktop (for backend development)
- Git

### Project Structure

This is a **Node.js + Express + TypeScript** application using **Prisma** for database management.

```
src/
├── config/              # Configuration files
├── controllers/         # HTTP request handlers
├── routes/              # API route definitions
├── services/            # Business logic layer
├── repositories/        # Data access layer
├── middlewares/         # Express middlewares
├── prisma/             # Generated Prisma client
└── ...
```

## Development Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Start Docker services (PostgreSQL & Redis):**

   ```bash
   docker-compose up -d
   ```

3. **Initialize database:**

   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
   ```

4. **Start development server:**
   ```bash
   pnpm dev
   ```

## Making Contributions

### Types of Contributions

- 🐛 **Bug fixes**: Found a bug? Open an issue or submit a PR
- ✨ **Features**: New features are welcome! Please discuss larger changes first
- 📝 **Documentation**: Help improve our docs
- 🧪 **Tests**: Additional test coverage is always appreciated

### Workflow

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```
3. **Make your changes**
4. **Test your changes**
5. **Commit** using conventional commits:
   ```bash
   git commit -m "feat(scope): add new feature"
   git commit -m "fix(scope): fix bug description"
   ```
6. **Push** to your fork
7. **Open a Pull Request**

## Pull Request Process

1. Ensure your code follows the project's coding standards
2. Update documentation if needed
3. Add tests for new functionality
4. Ensure all tests pass
5. Request review from maintainers
6. Address any feedback

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat:     New feature
fix:      Bug fix
docs:     Documentation only
style:    Formatting, no code change
refactor: Code restructuring
test:     Adding tests
chore:    Maintenance tasks
```

## Coding Standards

### TypeScript

- Use strict mode
- Avoid `any` types
- Use proper typing for all functions and variables

### Backend

- Follow RESTful API conventions
- Use Joi for validation
- Implement proper error handling
- Add JSDoc comments for public APIs

### Code Quality

```bash
# Run linting
pnpm lint

# Fix lint issues
pnpm lint:fix

# Format code
pnpm format

# Type checking
pnpm typecheck
```

## Questions?

Feel free to open an issue for any questions or concerns.

---

Thank you for contributing! 🎉
