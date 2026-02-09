# Agent Guidelines for ColdestPlace

This document provides coding agents with essential information about the project structure, commands, and code style guidelines.

## Project Overview

**Language**: [Specify: TypeScript/Python/Java/Go/Rust/etc.]
**Framework**: [Specify: React/Next.js/Django/Spring/etc.]
**Package Manager**: [Specify: npm/yarn/pnpm/pip/cargo/maven/etc.]

## Build, Lint, and Test Commands

### Setup
```bash
# Install dependencies
[TODO: e.g., npm install, pip install -r requirements.txt, cargo build]

# Setup environment
[TODO: e.g., cp .env.example .env]
```

### Build
```bash
# Development build
[TODO: e.g., npm run build:dev]

# Production build
[TODO: e.g., npm run build]
```

### Linting
```bash
# Run linter
[TODO: e.g., npm run lint, flake8 ., cargo clippy]

# Auto-fix issues
[TODO: e.g., npm run lint:fix, black .]
```

### Testing
```bash
# Run all tests
[TODO: e.g., npm test, pytest, cargo test]

# Run tests in watch mode
[TODO: e.g., npm test -- --watch]

# Run a single test file
[TODO: e.g., npm test -- path/to/test.spec.ts, pytest tests/test_file.py]

# Run a specific test case
[TODO: e.g., npm test -- -t "test name", pytest tests/test_file.py::test_function]

# Run with coverage
[TODO: e.g., npm test -- --coverage, pytest --cov]
```

### Development Server
```bash
# Start dev server
[TODO: e.g., npm run dev, python manage.py runserver]

# Start with specific port
[TODO: e.g., npm run dev -- --port 3001]
```

## Code Style Guidelines

### File Organization
- Place source code in `[TODO: e.g., src/, lib/, app/]`
- Place tests in `[TODO: e.g., __tests__/, tests/, *_test.go]`
- Place configuration files in the project root
- Group related functionality in feature directories
- Keep files focused and under [TODO: e.g., 300] lines when possible

### Imports
```
[TODO: Specify import ordering, e.g.:]
1. Standard library imports
2. Third-party library imports
3. Local application imports
4. Type imports (if applicable)

# Example:
import { useState } from 'react';
import axios from 'axios';
import { MyComponent } from '@/components/MyComponent';
import type { User } from '@/types';
```

### Formatting
- **Indentation**: [TODO: e.g., 2 spaces, 4 spaces, tabs]
- **Line Length**: Max [TODO: e.g., 100] characters
- **Quotes**: [TODO: e.g., single quotes, double quotes]
- **Semicolons**: [TODO: e.g., required, omitted]
- **Trailing Commas**: [TODO: e.g., always, es5, none]
- Use auto-formatter: [TODO: e.g., Prettier, Black, rustfmt]

### Naming Conventions

#### Files
- Components/Classes: [TODO: e.g., PascalCase.tsx, snake_case.py]
- Utilities: [TODO: e.g., camelCase.ts, snake_case.py]
- Tests: [TODO: e.g., *.test.ts, test_*.py, *_test.go]
- Constants: [TODO: e.g., SCREAMING_SNAKE_CASE.ts]

#### Variables and Functions
- Variables: [TODO: e.g., camelCase, snake_case]
- Functions: [TODO: e.g., camelCase, snake_case]
- Constants: [TODO: e.g., SCREAMING_SNAKE_CASE]
- Private members: [TODO: e.g., _prefixed, normal]
- Boolean variables: Start with `is`, `has`, `should`, `can`

#### Classes and Types
- Classes: [TODO: e.g., PascalCase]
- Interfaces: [TODO: e.g., PascalCase, IPascalCase]
- Types: [TODO: e.g., PascalCase]
- Enums: [TODO: e.g., PascalCase]

### TypeScript/Type Guidelines (if applicable)
- Always provide explicit return types for functions
- Avoid `any` type - use `unknown` or proper types
- Use strict null checks
- Prefer interfaces for object shapes
- Prefer type aliases for unions and primitives
- Use generics for reusable type-safe code

### Error Handling
```
[TODO: Specify error handling patterns, e.g.:]
- Use try-catch for async operations
- Create custom error classes for domain-specific errors
- Always log errors with context
- Return Result types or use Either monad (if applicable)
- Validate inputs at boundaries
- Provide meaningful error messages
```

### Comments and Documentation
- Write self-documenting code with clear names
- Add comments for "why", not "what"
- Document public APIs with [TODO: e.g., JSDoc, docstrings]
- Keep comments up-to-date with code changes
- Use TODO/FIXME/NOTE comments appropriately

### Best Practices

#### General
- Follow SOLID principles
- Keep functions small and focused (single responsibility)
- Avoid deep nesting (max 3-4 levels)
- Prefer composition over inheritance
- Write pure functions when possible
- Avoid premature optimization

#### Testing
- Write tests for all business logic
- Follow AAA pattern (Arrange, Act, Assert)
- Use descriptive test names
- Mock external dependencies
- Aim for [TODO: e.g., 80%] code coverage minimum

#### Git Commits
- Write clear, descriptive commit messages
- Use conventional commits format: `type(scope): subject`
- Types: feat, fix, docs, style, refactor, test, chore
- Keep commits atomic and focused

## Project-Specific Rules

[TODO: Add any project-specific guidelines, patterns, or conventions here]

### Architecture Patterns
[TODO: e.g., MVC, MVVM, Clean Architecture, Hexagonal, etc.]

### State Management
[TODO: e.g., Redux, Context API, Zustand, etc.]

### API Conventions
[TODO: e.g., REST, GraphQL, gRPC patterns]

### Database Access
[TODO: e.g., ORM patterns, query builders, raw SQL guidelines]

## Common Pitfalls to Avoid
- [TODO: Add project-specific gotchas]
- [TODO: Known performance issues]
- [TODO: Security considerations]

## Additional Resources
- [Project Documentation](TODO: link)
- [Contributing Guide](TODO: link)
- [Code Review Checklist](TODO: link)
