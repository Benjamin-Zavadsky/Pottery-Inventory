# Skill: Update the AI Analysis Prompt

Follow this sequence exactly. Changes to the prompt affect every future analysis run.
Do not make speculative edits — every change must have a clear reason.

## 1. Explore first
- Read `app/api/generate-description/route.ts` in full
- Understand the structure: SYSTEM_PROMPT (expertise/rules) and buildTextPrompt (instructions/output format)
- Identify exactly which part needs to change before touching anything

## 2. Understand the two sections

**SYSTEM_PROMPT** — Defines Claude's expertise and critical attribution rules.
Change this when:
- A new ceramic tradition needs to be added to Claude's knowledge
- An attribution rule is consistently wrong and needs correction
- A new disambiguation rule is needed (e.g. two traditions share visual features)

**buildTextPrompt()** — Defines what Claude analyzes and what it returns.
Change this when:
- A new field needs to be added to the JSON output
- The analysis instructions need to be more or less specific
- The multi-image vs single-image instructions need updating
- User context handling needs to change

## 3. Plan
Before changing anything, write out:
- Which section is changing (SYSTEM_PROMPT or buildTextPrompt)
- What the current behavior is
- What the desired behavior is
- Why the current prompt produces the wrong result

Wait for approval before proceeding.

## 4. Rules for editing the prompt

**Never change the JSON output shape without updating the app**
The output fields (`name`, `place_of_origin`, `age`, `color`, `condition`, `rarity`,
`originality`, `dimensions`, `use_function`, `tribe_culture`, `research_notes`,
`description`) are consumed directly by the UI. Adding or renaming a field requires
corresponding changes in:
- `app/add/page.tsx` — AISuggestions type and SUGGESTION_LABELS
- `app/item/[id]/page.tsx` — SUGGESTION_LABELS

**Never remove the JSON-only instruction**
The prompt must always end with the instruction to return only a valid JSON object
with no surrounding text. Removing this causes the response parser to fail.

**Never make the model name configurable**
The model is hardcoded as `claude-opus-4-7`. Do not move it to an env variable or
make it dynamic.

**Never call the real API in tests**
If testing prompt changes, mock the API response. Never use real Anthropic API calls
in the test suite.

## 5. After editing
- Verify the JSON output shape is unchanged (or update the app to match)
- Verify `buildTextPrompt` still returns a string ending with the closing `}`
  of the JSON template
- Run `npm run lint` and `npm run build` to check for type errors

## 6. Commit
```
feat: update AI prompt to [describe change]
```
or
```
fix: correct AI attribution rule for [tradition]
```
