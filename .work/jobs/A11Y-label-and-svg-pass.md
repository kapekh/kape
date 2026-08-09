# A11Y - The 134 accessibility errors J12 stopped in front of

## Objective

J12 cleared six lint categories and deliberately did not start this one. Its reason is the contract:

> I stopped rather than rush a 25-file label pass that mints ids by script and can make
> accessibility worse.

Take that seriously. A label wired to the wrong control is worse than no label, because a screen
reader now confidently announces the wrong thing and no linter will ever flag it again.

Baseline at `421e151`, measured in the lead pane, not taken from the report:

```
bunx biome check src --max-diagnostics=500
Found 142 errors, 30 warnings
```

The 142 are 134 a11y plus 8 `noArrayIndexKey` that J12 left standing on purpose. Leave those 8
alone; they need a persisted-shape change and are somebody else's job. The 30 warnings are
`noExplicitAny` and belong to a job running after you.

You are done when the a11y count is zero, or when what remains is written down with a reason per
site that a person would accept.

## What the 134 actually are

| rule | count |
|---|---|
| `noLabelWithoutControl` | 98 |
| `noSvgWithoutTitle` | 21 |
| `noStaticElementInteractions` | 7 |
| `useSemanticElements` | 2 |
| `useValidAnchor`, `useKeyWithClickEvents`, `useFocusableInteractive`, `useAriaPropsForRole`, `noNoninteractiveElementToInteractiveRole`, `noAutofocus` | 1 each |

The three groups want different thinking, so do them as three commits, not one.

**The 98 labels.** Most are admin table filters and editor field rows. Read what each label sits
next to before wiring it. Where a label genuinely captions a group rather than one control, the
answer is a `fieldset`/`legend` or a `role="group"` with `aria-labelledby`, not an `htmlFor` pointed
at whichever input happens to be first.

**The 21 SVGs.** Almost all are decorative icons inside a button that already has an accessible
name. Those want `aria-hidden="true"`, not a `<title>` that makes a screen reader announce the icon
and the button. Only add a `<title>` where the SVG is the only thing carrying the meaning.

**The 7 static-element handlers and the singletons.** These are real interaction bugs. A `div` with
`onClick` is unreachable by keyboard. Prefer changing it to a `button` over bolting on `role`,
`tabIndex` and a key handler.

## Files you own

Every `.tsx` under `src/components/` and `src/routes/`.

Nothing else. In particular do not touch `src/lib/`, `src/server/`, `biome.json`, or any `.test.tsx`
beyond what a change of yours forces. A second job is live at the same time in
`src/server/seed/projects.ts` and `.work/kape-copy/`; both are outside your ownership.

## Gates, after every one of the three commits

```
bunx tsc --noEmit                       # silent
bun run test                            # 269 passed, 24 files
bunx biome format src                   # clean over 247
bunx biome check src --max-diagnostics=500   # error count strictly down, never up
```

`git diff --stat bun.lock package.json` must be empty. No dependency for this.

## Evidence, not assertions

A label pass is exactly the kind of change that type-checks, lints clean and is still wrong. For
each of the three commits, drive the real admin in a browser and show it working:

- `bun run dev`, log in at `/login` as `admin@kapekh.org` / `kape-admin-2026`.
- Click each label you rewired and show focus landing on the control it names. A label wired
  correctly moves focus when clicked; that is the check, and it costs seconds.
- For the static-element fixes, reach the control by keyboard alone and activate it.

Screenshots to `.work/a11y-shots/`. Report to `.work/a11y-report.md`.

## Stop conditions

Stop and report rather than deciding alone if:

- A fix needs a change to a component's public props, or moves markup between files.
- The correct fix is a visible layout change. Say what it would look like first.
- You find a control that has no accessible name available at all. That is a design gap, not a lint
  fix, and it needs KAPE's answer.

Do not suppress a rule to reach zero. A suppression with an honest reason is a finding; a
suppression to clear the count is a lie the next person inherits.
