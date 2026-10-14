# Codex Implementation Guide

## Purpose

Analyze and implement changes with full codebase contextualization. This guide ensures surgical precision: thoroughly understand the context, optimize where beneficial, and avoid over-engineering simple changes. Codex must be hyper-specific in its analysis, going as deep as possible to minimize back-and-forth with the user.

---

## Execution Contract

This guide follows a single-phase confirmation protocol. Codex analyzes everything first, presents the complete plan with all options, and only then asks for user confirmation. No modifications are permitted until the user explicitly confirms.

---

## Phase 1: Rule Discovery and Context Loading

Before any implementation planning, Codex MUST fetch and process cursor rules in the following order:

### Step 1.1: Fetch All Rule Headers

Run this command to discover all available rules with their headers:

```bash
for f in $(find .cursor/rules -name "*.mdc" -type f | sort); do
  echo "=== $f ==="
  head -10 "$f" | grep -E "^(description:|globs:|alwaysApply:)" || echo "(no frontmatter found)"
  echo ""
done
```

This returns the frontmatter (description, globs, alwaysApply) for each rule file.

### Step 1.2: Read All `alwaysApply: true` Rules

From the output of Step 1.1, identify all rules where `alwaysApply: true` and read them immediately. These are core project rules that apply to every task.

### Step 1.3: Match Rules by Description (Context Matching)

After reading `alwaysApply: true` rules, analyze the user's request and match against rule descriptions from Step 1.1:

- If the user mentions API calls, server queries, or mutations → read rules with matching descriptions
- If the user mentions database operations → read rules about ORM/database
- If the user mentions animations → read animation-related rules
- If the user mentions styling or UI → read visual style rules
- And so on for any technology or pattern mentioned

### Step 1.4: Match Rules by Glob (File Matching)

After planning which files will be modified, check if any rules from Step 1.1 have `globs` patterns matching those files. If a glob pattern matches a planned file path, read that rule.

**Note:** Most rules prefer descriptions over globs. Only check glob matching for rules that explicitly define them in their frontmatter.

---

## Phase 2: Determine Implementation Scope

The AI must determine the working scope in this priority order:

### Priority 1: Git Changes

Execute both commands to capture the complete change landscape:

```bash
git diff --staged
git diff
```

If git diffs are found → use those files as the scope. Mark scope as `🌿 Git diffs`.

### Priority 2: User-Provided References

If git diffs are empty but the user provided file or folder references → use those as the scope. Mark scope as `💡 User-provided`.

### Priority 3: AI Analysis

If no git diffs and no user-provided references → research the codebase based on the user's instructions to identify which files need to be modified. Mark scope as `🔎 AI Analysis`.

**IMPORTANT:** Never stop because there are no git changes. Always continue to help the user implement their request.

---

## Phase 3: Deep Contextual Analysis

Before presenting anything, Codex MUST:

1. **Read all scoped files** completely (from git diff, user references, or AI analysis)
2. **Identify related files** that are needed to understand the changes:
   - Files that import from the scoped files
   - Files that are imported by the scoped files
   - Configuration files (e.g., `globals.css`, `tailwind.config.js`)
   - Type definition files
   - Similar components or patterns in the codebase
3. **Understand the intent** of the requested changes
4. **Identify all possible approaches** to implement the changes

---

## Phase 4: Re-check Rules Based on Plan

After determining which files will be modified, Codex MUST:

1. **Re-fetch rule headers** to check for glob patterns
2. **Match planned file paths** against rule globs
3. **Read any newly matched rules** and adapt the plan accordingly

For example:

- If planning to edit `app/dashboard/page.tsx`, check for rules with globs like `app/**/*.tsx`
- If planning to create a background job task, check for rules with globs matching that folder

---

## Phase 5: Present Analysis & Solutions

Output a structured analysis in the following format:

### When Multiple Solutions Exist

```
# Chapter 1: Understanding the Request

<One or two paragraphs explaining what the user wants to achieve, based on the scope and their request. Be clear and concise.>

# Chapter 2: Context Used

Files analyzed to understand the codebase and inform the solution:

- `path/to/globals.css` - Global color definitions
- `path/to/component.tsx` - Current implementation of the feature
- `path/to/types.ts` - Type definitions used
- `path/to/similar-component.tsx` - Similar pattern for reference

Used scope: `<scope emoji and path>`

# Chapter 3: Rules Used

📌 **Always Apply** (Phase 1.2)
- `<rule-path>` - <brief description of how it informed the plan>

✨ **Matching Context** (Phase 1.3)
- `<rule-path>` - <why this rule was matched based on user request>

🧩 **Matching Glob** (Phase 1.4)
- `<rule-path>` - Matched `<glob-pattern>` for `<file-path>`

# Chapter 4: Proposed Solutions

## (A) <Solution Name> ⭐ Recommended

**Description:** <Clear explanation of what this solution does>

**Modifications:**
- 🟠 `path/to/file.tsx` - [what will change]
- 🟢 `path/to/new-file.ts` - [purpose of new file]
- 🔴 `path/to/deleted-file.ts` - [why deleted]

**Pros:**
- Pro 1
- Pro 2

**Cons:**
- Con 1

---

## (B) <Second Solution Name>

**Description:** <Clear explanation of what this solution does>

**Modifications:**
- 🟠 `path/to/file.tsx` - [what will change]
- 🟠 `path/to/another-file.tsx` - [what will change]

**Pros:**
- Pro 1

**Cons:**
- Con 1
- Con 2

---

Reply with the letter of your chosen solution (A, B, C...) or provide feedback.
```

### When Only One Solution Exists

```
# Chapter 1: Understanding the Request

<One or two paragraphs explaining what the user wants to achieve, based on the scope and their request. Be clear and concise.>

# Chapter 2: Context Used

Files analyzed to understand the codebase and inform the solution:

- `path/to/globals.css` - Global color definitions
- `path/to/component.tsx` - Current implementation of the feature

Used scope: `<scope emoji and path>`

# Chapter 3: Rules Used

📌 **Always Apply** (Phase 1.2)
- `<rule-path>` - <brief description of how it informed the plan>

✨ **Matching Context** (Phase 1.3)
- `<rule-path>` - <why this rule was matched>

🧩 **Matching Glob** (Phase 1.4)
- (none matched)

# Chapter 4: The Modification Plan

**Description:** <Clear explanation of what will be done>

**Modifications:**
- 🟠 `path/to/file.tsx` - [what will change]
- 🟢 `path/to/new-file.ts` - [purpose of new file]
- 🔴 `path/to/deleted-file.ts` - [why deleted]

---

Reply **"yes"** to proceed or provide feedback.
```

---

## Phase 6: Await User Selection

**DO NOT PROCEED** until the user explicitly:

- Selects a solution letter (A, B, C, etc.) when multiple solutions exist
- Confirms with "yes", "ok", "proceed" when only one solution exists
- Provides feedback (in which case, adjust and re-present)

---

## Phase 7: Execute & Validate

After receiving user confirmation:

1. **Implement** the selected solution
2. **Run validation**: `bun run checks`
3. **Fix** any linting or type errors immediately
4. **Update sprint file** (if applicable): If the implemented feature is part of a sprint listed in `ROADMAP.md`, update the corresponding sprint file in `/docs/sprints/` to mark the task as completed (✅)
5. **Present completion summary**:

```
## ✅ Modifications Complete

- 🟠 `path/to/file.tsx` - [what was changed]
- 🟢 `path/to/new-file.ts` - Created
- 🔴 `path/to/deleted-file.ts` - Deleted

**Validation:** `bun run checks` ✅ Passed
```

---

## Scope Types Reference

| Scope                               | When Used                    | Example                                   |
| ----------------------------------- | ---------------------------- | ----------------------------------------- |
| `🌿 Git diffs (path/to/folder)`     | Git diff returned changes    | `🌿 Git diffs (app/(application)/drive)`  |
| `💡 User-provided (path/to/folder)` | User specified files/folders | `💡 User-provided (server/routers/auth)`  |
| `🔎 AI Analysis (path/to/folder)`   | AI researched codebase       | `🔎 AI Analysis (app/(application)/chat)` |

**Determining the scope path:**

The path should be the "starting point" of where changes occur, NOT the root project folder:

- ✅ `🌿 Git diffs (app/(application)/drive)` - Editing drive page
- ✅ `💡 User-provided (server/routers/auth)` - User pointed to auth router
- ❌ `🔎 AI Analysis (app)` - Too broad, find the specific feature folder
- ❌ `🌿 Git diffs (.)` - Never use root folder

---

## Modification Emoji Legend

| Emoji | Meaning       |
| ----- | ------------- |
| 🟠    | Modified file |
| 🟢    | New file      |
| 🔴    | Deleted file  |

---

## Solution Ranking Guidelines

When presenting multiple solutions:

1. **⭐ Recommended**: The cleanest, most maintainable approach following project conventions
2. **Neutral**: Valid alternatives with trade-offs
3. **⚠️ Not Recommended**: Works but has significant downsides (more code, breaks patterns, etc.)

Always rank from most recommended to least recommended. Be explicit about why each solution is ranked as it is.

---

## Anti-Over-Engineering Rules

**CRITICAL: These rules are NON-NEGOTIABLE.**

**DO NOT:**

- Create new components for one-time UI modifications
- Introduce state management for simple local state
- Create utility functions used only once
- Add abstraction layers for single use cases
- Build configuration systems for hardcoded values
- Create factories, builders, or design patterns for straightforward operations
- Split files that work better as a single unit

**DO:**

- Make inline modifications when appropriate
- Use existing utilities and helpers
- Keep changes minimal and focused
- Prefer direct implementation over abstraction

---

## Complexity Threshold Guidelines

| Change Scope                         | Appropriate Response                                         |
| ------------------------------------ | ------------------------------------------------------------ |
| Single line fix                      | Direct inline modification                                   |
| Single function change               | Modify in place, optimize if obvious                         |
| Multiple related changes in one file | Refactor together, no new files unless necessary             |
| Changes across 2-3 files             | Coordinate changes, consider shared types                    |
| Changes across 4+ files              | Evaluate for potential abstraction, but still prefer minimal |

---

## Safety & Scope Guards

1. **NEVER** modify code without explicit user confirmation
2. **NEVER** skip the rule discovery phase
3. **NEVER** skip the context analysis section
4. **NEVER** present solutions without pros/cons when multiple exist
5. **NEVER** stop because git diff is empty - always continue with user references or AI analysis
6. **ALWAYS** show all files used for context
7. **ALWAYS** include the "Used scope" line with the correct scope type
8. **ALWAYS** include the "Rules Used" chapter with categorized rules
9. **ALWAYS** rank solutions when there are multiple options
10. **ALWAYS** use the emoji legend for modifications
11. **ALWAYS** validate with `bun run checks` after modifications
12. **ALWAYS** be hyper-specific - go as deep as possible
13. **ALWAYS** use a specific feature folder for scope, never the root folder

---

## Quick Reference: Rule Discovery Command

Run this to get all rule headers at once:

```bash
for f in $(find .cursor/rules -name "*.mdc" -type f | sort); do
  name="${f#.cursor/rules/}"
  name="${name%.mdc}"
  desc=$(grep "^description:" "$f" | head -1 | sed 's/^description: *//')
  always=$(grep "^alwaysApply:" "$f" | head -1 | sed 's/^alwaysApply: *//')
  globs=$(grep "^globs:" "$f" | head -1 | sed 's/^globs: *//')
  echo "$name | $always | $desc | $globs"
done
```
