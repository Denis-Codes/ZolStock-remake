# Frontend Refactor Guidelines — Styling & Layout

## Scope
- Focus is styling and layout: SCSS, spacing, paddings, media queries, border-radius, and layout structure.
- **Markup changes are allowed when needed** to support a layout change (e.g. adding a wrapper div, restructuring a flex/grid container, adjusting class names). This is not a strict "SCSS-only" refactor anymore.
- **Never delete components or pages.** If something looks dead or redundant, flag it in your summary — don't remove it.
- **You have freedom to rework layouts**: padding, spacing, margins, media query breakpoints, and roundness (corners can be made less round/more squared off where it improves the design). This is a real design pass on layout, not just a cleanup.
- **Do not touch the main brand colors. This is non-negotiable.** No new hex values for primary/brand/accent colors, no "slightly adjusted" shades, no swapping to a nearby palette even if it looks better. If you convert hardcoded colors to variables/tokens, the rendered output must be pixel-identical — verify the hex values match before and after, don't eyeball it. Non-brand colors (e.g. neutral grays, borders, shadows) can be adjusted if it serves the layout rework, but brand colors are frozen.

## The most important rule: don't break what's working
- Before changing a component or layout, identify everything that depends on it — parent components passing props/classes into it, JS that queries specific selectors or class names, conditional rendering tied to a class, shared mixins/variables used elsewhere.
- After each change, explicitly check that those dependencies still work — don't just check that the changed piece looks right in isolation.
- If a change would require breaking one of those ties (e.g. a class name that JS hooks into, a structural assumption another component relies on), stop and flag it before proceeding — don't silently sever it and hope nothing notices.
- When in doubt between "cleaner code" and "definitely not breaking anything," choose not breaking anything, and tell me about the tradeoff.

## Git discipline
- **Never run `git commit` or `git push`.** Not even for "safe" intermediate steps.
- Break large refactors into **discrete, logically separable stages** (e.g. "rework spacing scale," "consolidate breakpoints," "flatten nested selectors to current convention"). Each stage should be a clean, reviewable diff I can commit myself.
- At the start of a session, propose the stage breakdown before writing code — don't silently decide the boundaries.
- After each stage, stop and summarize: what changed, why, what depended on the changed piece and how you verified it still works, and what to visually verify on my end. Don't chain into the next stage unannounced.

## Responsive / media queries
- Rework breakpoints around actual common device widths rather than arbitrary numbers — roughly: mobile ~375-428px, tablet ~768-1024px, desktop ~1280px+. Match whatever breakpoint variables/mixins the project already defines if they exist; don't invent a second system alongside them.
- Consider layout logic across the range of each breakpoint, not just one width per breakpoint.

## Deprecated → current conventions
- Replace old patterns with the project's current conventions (nesting depth, variable/token usage, mixin patterns, naming scheme — match what's already established in the newest files, not what's most common).
- No `!important` unless one already exists for a documented reason — if you must add one, flag it explicitly.
- Flatten unnecessary nesting; keep a reasonable max nesting depth (3 levels as a default unless the codebase already enforces its own rule).
- Consolidate duplicate values into variables/tokens where the codebase already uses that pattern — don't introduce a new token system unprompted.

## Self-check loop (before presenting each stage as done)
1. Re-read the diff as if reviewing someone else's PR — does it match the stated goal of the stage, or did scope creep in?
2. Trace every dependency of what you touched (props, selectors, JS hooks, shared styles) and confirm none were silently broken.
3. Confirm no components or pages were deleted, and diff every brand/primary color value used before vs. after — they must match exactly, no exceptions.
4. Confirm the stage is committable on its own — it shouldn't depend on a later, unstaged change to avoid breaking the build.
5. If anything is ambiguous (conflicting conventions, unclear ownership of a shared style), stop and ask rather than guessing.

## Aesthetic guardrails
- No default-feeling AI output: avoid Inter/Roboto/system-ui as a silent fallback, avoid the reflexive purple-gradient-on-white look, avoid box-shadow/border-radius values that read as unmodified framework defaults.
- Intentional, context-specific choices — match the codebase's existing design language rather than "cleaning it up" toward something generic.
- Leaning less round is welcome where it fits the direction, but apply it consistently (don't square off one component and leave a sibling rounded without reason).
- Copy is design too: if you touch button labels or error text while reworking a layout, keep them specific and action-oriented ("Save changes," not "Submit"), and non-apologetic in errors ("Password must be 8+ characters," not "Oops, something went wrong!").

## Workflow mechanics
- Work file-by-file or component-by-component, not screen-by-screen. Use `@path/to/file` references rather than re-reading the whole styles/component directory each time.
- Use `/clear` between stages so context doesn't drift or cause stray edits to unrelated files.
- Don't run linters/formatters project-wide as a side effect — scope any `stylelint`/prettier runs to the files touched in the current stage.