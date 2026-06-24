# Pre-Commit Hooks

This project uses [pre-commit](https://pre-commit.com/) to automatically check code quality, formatting, types, and builds before commits.

## Setup

### 1. Install pre-commit framework

**macOS (Homebrew):**

```bash
brew install pre-commit
```

**Python/pip:**

```bash
pip install pre-commit
```

**Windows/Other:**
See [pre-commit installation docs](https://pre-commit.com/#install).

### 2. Install git hooks

```bash
./scripts/setup-hooks.sh
```

Or manually:

```bash
pre-commit install
```

## What Gets Checked

### File-Level Checks (All Languages)

-   ✓ Trailing whitespace
-   ✓ End-of-file newlines
-   ✓ YAML/JSON/TOML syntax
-   ✓ Merge conflict markers
-   ✓ Case-conflict filenames
-   ✓ Private key detection
-   ✓ Line ending normalization (LF)

### TypeScript/JavaScript

-   ✓ **Prettier** — code formatting
-   ✓ **ESLint** — linting (catches errors, style issues)
-   ✓ **TypeScript** — type checking (`tsc --noEmit`)

### Database & Build

-   ✓ **Prisma format** — schema formatting
-   ✓ **Cloudflare build** — `npm run cf:build` (validates build, doesn't deploy)

## Usage

### Automatic (on every commit)

Hooks run automatically when you commit:

```bash
git commit -m "your message"
```

If any hook fails, the commit is blocked. Fix issues and try again.

### Manual (run on all files)

To check all files without committing:

```bash
pre-commit run --all-files
```

To run a specific hook:

```bash
pre-commit run prettier --all-files
pre-commit run eslint --all-files
pre-commit run tsc-check --all-files
```

### Skip hooks (if needed)

To bypass hooks on a commit:

```bash
git commit --no-verify
```

⚠️ Only for emergencies — hooks exist to catch issues early.

## Configuration

All hooks are defined in `.pre-commit-config.yaml`.

### Disable a hook temporarily

Comment out the hook block in `.pre-commit-config.yaml`:

```yaml
# - repo: local
#   hooks:
#     - id: cf-build-check
#       ...
```

Then reinstall:

```bash
pre-commit install
```

### Adjust hook behavior

Edit `.pre-commit-config.yaml` — common options:

-   `files:` — only run on matching files
-   `exclude:` — skip certain files
-   `args:` — pass arguments to the tool
-   `pass_filenames:` — whether to pass filenames (set to `false` for tools that scan entire project)

### Add a new hook

Example: Add a custom Bash linter:

```yaml
- repo: local
  hooks:
      - id: shellcheck
        name: Bash linting
        entry: shellcheck
        language: system
        types: [shell]
```

## Troubleshooting

### "pre-commit: command not found"

Install pre-commit using the steps above.

### "Hook failed but I need to commit now"

Use `git commit --no-verify`, but fix the issues in the next commit.

### Hooks are running on files I didn't change

Hooks run on all staged files by default. Stage only the files you want:

```bash
git add specific-file.ts
git commit
```

### Cloudflare build is slow

The `cf-build-check` only runs if certain files changed (see `files:` pattern in config). To skip it:

```bash
git commit --no-verify
```

Or remove it from `.pre-commit-config.yaml` temporarily.

### Update hooks

```bash
pre-commit autoupdate
```

## Framework Agnosticism

This setup uses **language-level tools** (TypeScript, JavaScript, Prettier, ESLint) rather than framework-specific ones. If you switch from Next.js to SvelteKit or another framework:

1. Update ESLint config if you change languages
2. Update `cf:build` check if you switch deployment targets
3. Generic checks (trailing whitespace, secrets, formatting) stay as-is

This keeps hooks maintainable across framework/tooling changes.

## CI/CD Integration

To run hooks in CI (e.g., GitHub Actions):

```yaml
- name: Run pre-commit hooks
  run: |
      pip install pre-commit
      pre-commit run --all-files
```

This ensures all commits pass the same checks locally and in CI.
