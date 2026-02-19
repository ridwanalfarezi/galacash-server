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
- Bun v1.x or higher
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
   bun install
   ```

2. **Start Docker services (PostgreSQL & Redis):**

   ```bash
   docker-compose up -d
   ```

3. **Initialize database:**

   ```bash
   bun prisma:generate
   bun prisma:migrate
   ```

4. **Start development server:**
   ```bash
   bun dev
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
bun lint

# Fix lint issues
bun lint:fix

# Format code
bun run format

# Type checking
bun run type-check
```

## Questions?

Feel free to open an issue for any questions or concerns.

---

## 🔒 Security Architecture

Understanding the security decisions made in this project is important for contributors.

### Authentication & Tokens

| Mechanism          | Details                                                                            |
| ------------------ | ---------------------------------------------------------------------------------- |
| **Access Token**   | JWT (HS256), 1-hour expiry, contains `id`, `nim`, `name`, `role`, `classId`        |
| **Refresh Token**  | Opaque JWT, 7-day expiry, stored in DB (`RefreshToken` table)                      |
| **Token Rotation** | On every `/auth/refresh`, the old refresh token is deleted and a new one is issued |
| **Logout**         | Deletes the refresh token from the database, immediately invalidating the session  |

### Cookie & CORS Policy

- **SameSite**: `lax` — prevents CSRF while allowing top-level navigation
- **CORS Origins**: Configured via `CORS_ORIGIN` env variable (comma-separated). Only explicitly listed origins are allowed
- **Credentials**: Enabled for cookie-based auth (`credentials: true`)

### Rate Limiting

- Global rate limit applied via `express-rate-limit` with Redis store
- Prevents brute-force login attempts and API abuse
- Configurable via environment variables

### Password Handling

- Passwords hashed with **bcrypt** (cost factor 10) via `Bun.password.hash`
- Raw passwords are never stored, logged, or returned in API responses
- Password fields are always destructured out before sending user objects

### Input Validation

- All endpoints validated with **Joi** schemas via `validator.middleware.ts`
- Validates body, params, and query parameters
- Returns structured 400 errors with field-level detail

### Security Headers

- **Helmet.js** configured for security-related HTTP headers
- Includes Content-Security-Policy, X-Frame-Options, etc.

---

Thank you for contributing! 🎉
