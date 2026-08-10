# FIX-C - the shared admin primitives

Six of the seven items are done and verified.
M10's fix is in place and unit-proven, but its browser acceptance is blocked on a call site outside my file set; the exact edit is at the end.

## Files changed

| file | what changed |
|---|---|
| `src/components/Dialogs.tsx` | M09 focus return; M11 live region, toast/dialog ordering, in-dialog announcement mirror |
| `src/components/admin/useDirty.ts` | M10 `ready` parameter, baseline resolved during render |
| `src/components/admin/ActionMenu.tsx` | L16 arrow keys; focus returns to the trigger before an action runs; STATIC 9 name on the menu itself |
| `src/components/admin/form-ui.tsx` | STATIC 18 `Field` / `TextField` with `required`, `error`, `hint` |
| `src/components/admin/LangTabs.tsx` | STATIC 17 rebuilt as a real tab pattern |
| `src/components/admin/useDirty.async.test.tsx` | new, 3 tests |
| `src/components/admin/LangTabs.test.tsx` | new, 5 tests |

No call site was swept. Nothing outside the owned set was touched.

## 1. M09 - a dialog dumps focus on BODY

The trap and the roles were already right, and so was `useModalPanel`'s restore.
What was wrong is *what* it restored to.
`ActionMenu` called `setOpen(false)` before running the item's `onClick`, so the menu item was on its way out; by the time the modal mounted and read `document.activeElement`, it was already `BODY`.
The dialog was faithfully returning focus to nothing.

Two changes:

- `ActionMenu` hands focus back to the `⋯` trigger *before* invoking the action, so a dialog the action opens has a live element to return to.
- `Dialogs` reads the opener when `confirm()` / `prompt()` is called rather than when the modal mounts, and restores it from an unmount-cleanup microtask, which lands after `useModalPanel`'s own restore has run.

When the opener is gone - confirming a delete removes the row and its `⋯` button with it - focus goes to `<main>`.
That is the choice the contract asked me to justify: `<main>` sits after the sidebar and the skip link, so the next Tab continues inside the table the row was in, rather than at the top of the document.

One thing the first attempt got wrong, worth recording because the symptom looked like success.
The opener usually outlives the dialog by a frame or two: `confirm()` resolves as soon as the mutation returns, and the row only disappears when the list refetches.
So the restore found `opener.isConnected === true`, focused the trigger, and the browser then dropped focus to `BODY` silently when the refetch removed it.

Run before that was handled:

```
=== M09: document.activeElement after each dialog exit ===
rows before: 42
after Escape  -> BUTTON "Row actions"
after Cancel  -> BUTTON "Row actions"
after Confirm ("Confirm") -> BODY "Skip to main contentKAPEAdminDashboardMe"
rows after:  41 (row really was deleted)
```

There is now a re-check at 250 ms and 1000 ms that moves to `<main>` only if focus is genuinely nowhere, so it can never take focus off the user.

### Acceptance 2 - three exits, three landings, none of them BODY

`/admin/pages`, first row's `⋯` opened with the keyboard, `Delete` reached with the keyboard, dialog dismissed three ways:

```
=== M09: document.activeElement after each dialog exit ===
rows before: 41
after Escape  -> BUTTON "Row actions"
after Cancel  -> BUTTON "Row actions"
after Confirm ("Confirm") -> MAIN "PagesEvery page and its URL. Set a page'"
rows after:  40 (row really was deleted)
```

The row count moving 41 → 40 is there to show the Confirm case really did delete, so the opener really was gone.

## 2. M11 - the toast

### It is announced

The audit could not establish whether the `<output>` region reached a screen reader.
It did not, reliably, and the reason is structural: every toast was its own `<output>`, so the live region was created in the same frame as its first message.
A region a screen reader was not already watching does not announce what it arrives holding.

The host is now one `<output>` mounted from first paint, empty or not, with each toast a plain `div` inside it.

My first pass at this was wrong in a way worth naming: I made the *container* permanent but left each toast as its own `<output>`, so an idle page still had zero live regions. Finding zero `<output>` nodes on a quiet page is what caught it.

Evidence, via CDP `Accessibility.getFullAXTree`:

```
=== 1. the live region is in the a11y tree BEFORE any toast ===
empty page: 1 node(s) with role=status
   live: polite | atomic: true | name: ""
DOM: [{"text":"","inDialog":false}]

=== 2. fire a toast with no dialog open ===
after toast: 1 node(s) with role=status
   live: polite | atomic: true | name: ""
DOM: ["Page created."]
```

The same region, before and after: the message arrives as a text change inside a region that was already there.

For contrast, the same probe against the first attempt:

```
=== the live region exists BEFORE any toast is fired ===
[]
```

### Acceptance 6 - a toast fired while a confirm dialog is open

Two things were wrong, not one.
The stacking (`z-300` over the dialog's `z-150`) is the visible half.
The other half is that `aria-modal="true"` takes everything outside the dialog out of the accessibility tree, so a screen reader could not reach the toast at all while a dialog was up, however high it sat.

So the dialog carries an `sr-only` mirror of the toast text, and the visible copy goes `aria-hidden` while a dialog is open - announced once, not twice.

```
=== 3. open a confirm dialog, THEN fire a toast ===
{
 "visibleToastText": "Modules saved.",
 "toastZIndex": "300",
 "dialogZIndex": "150",
 "topmostAtToastCentre": "the toast itself (on top)",
 "inDialogMirrorText": "Modules saved.",
 "visibleCopyHiddenFromAT": "true"
}
with dialog open: 1 node(s) with role=status
   live: polite | atomic: true | name: ""
```

`topmostAtToastCentre` is `document.elementFromPoint` at the toast's centre, so it is what the compositor actually put on top rather than what the z-index implies.

Screenshot: `.work/ui-audit/fixc/toast-over-confirm-dialog.png` - the toast renders crisp while the page behind the dialog is blurred by the backdrop, which is the same fact visually.

The contract's other half of M11 - field errors sitting next to their field with `aria-describedby` - is STATIC 18 below. The handler that would raise them (`admin.pages.new.tsx:23-33`) is a call site, so it belongs to the adopting job.

## 3. M10 - a form is dirty before anyone types

`useDirty` and `useDirtyGuard` take a third argument, `ready`, defaulting to `true`.
While it is false the baseline follows the snapshot; the first render where it is true fixes it.

Two details that matter:

- The baseline is resolved **during render**, not in an effect. An effect settles it one frame late, and that frame is a form reporting itself dirty before anyone has touched it. Re-running the render is idempotent, so a double render under StrictMode lands in the same place.
- It is a parameter rather than a guess. I first tried a call-site-free heuristic - watch the document for `input` / `change` / `keydown` and only treat snapshot changes before the first one as data arriving. It broke both of the hook's existing tests, and worse, it would silently absorb any programmatic edit: choosing an image in the media picker fires none of those events, so the change would have been re-baselined away and the guard would not have warned. That is weakening the guard, which the contract rules out. Nothing observable from inside the hook separates a query landing from code editing a field.

### Acceptance 4 - the mutation test

`src/components/admin/useDirty.async.test.tsx` models the `/admin/footer` shape: state starts empty, a query fills it after mount.

Mutant - the early capture put back (`ready` ignored, baseline fixed at mount):

```
### MUTANT: baseline captured at mount, ready ignored
     × is CLEAN once the query has filled the form nobody touched 91ms
     × still goes DIRTY on a real edit after the data has landed 14ms
     × goes clean again when the edit is reverted by hand 21ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected false to be true // Object.is equality
AssertionError: expected false to be true // Object.is equality
AssertionError: expected false to be true // Object.is equality
      Tests  3 failed (3)
```

Restored:

```
### RESTORED
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

Both directions are covered, per the contract: the form is clean after the query lands, goes dirty on a real edit, and goes clean again when that edit is reverted by hand.

### Acceptance 3 - BLOCKED

`/admin/footer` still reproduces, because the fix needs an argument the call site has to pass and `src/routes/admin.footer.tsx` is not mine:

```
=== M10: /admin/footer, nothing touched ===
{
 "saveButton": "Save footer",
 "disabled": false
}
after clicking a sidebar link -> Unsaved changesLeave this page and lose the edits you have not saved?Keep editingDiscard c
url now: http://localhost:3011/admin/footer
```

The edit, one argument at `src/routes/admin.footer.tsx:204`:

```ts
	const dirty = useDirtyGuard(
		JSON.stringify({ vals, links, buttons, socials }),
		savedAt,
		!loading,
	);
```

Every `useDirtyGuard` call site, and whether it needs the same:

```
admin.footer.tsx                               loadingFlag=1  useDirtyGuard@204
admin.nav.tsx                                  loadingFlag=2  useDirtyGuard@58
admin.account.tsx                              loadingFlag=0  useDirtyGuard@54
OfficeForm.tsx                                 loadingFlag=0  useDirtyGuard@87
PostForm.tsx                                   loadingFlag=0  useDirtyGuard@236
CampaignForm.tsx                               loadingFlag=0  useDirtyGuard@157
PageForm.tsx                                   loadingFlag=0  useDirtyGuard@204
UserForm.tsx                                   loadingFlag=0  useDirtyGuard@67
ProjectForm.tsx                                loadingFlag=0  useDirtyGuard@158
FormBuilder.tsx                                loadingFlag=0  useDirtyGuard@170
```

Only the two with a loading flag need it - `admin.footer.tsx:204` and `admin.nav.tsx:58` (`useDirtyGuard(JSON.stringify(vals), savedAt, !loading)`).
The other eight initialise their state synchronously from a prop, which is the case `useDirty.repro.test.tsx` already covers, so they are correct as they stand.

## 4. L16 - arrow keys in the row menu

Copied from `PageSwitcher.tsx:132-152` as instructed: an active index, clamped movement, focus following it.
Added on top of that shape: wrap at both ends, Home/End, disabled items skipped, and a roving `tabIndex` so the menu has one tab stop rather than one per item.
Opening the menu now moves focus to the first item, which is what `role="menu"` implies, so Escape has to return focus to the trigger explicitly - it used to get that for free by never moving focus at all.

### Acceptance 5

Run on `/admin/users`, whose menu has two items.
I started on `/admin/pages` and it proved nothing - every menu there has a single item, so movement and wrap are indistinguishable from doing nothing:

```
after opening the menu -> BUTTON "Delete" role=menuitem
ArrowDown  -> BUTTON "Delete" role=menuitem
...
menu items in order: ["Delete"]
```

The real run:

```
trigger focused        -> BUTTON "Row actions"
after opening the menu -> BUTTON "Reset password" role=menuitem

=== L16: focused element after each key ===
ArrowDown  -> BUTTON "Delete user" role=menuitem
ArrowDown  -> BUTTON "Reset password" role=menuitem
ArrowUp    -> BUTTON "Delete user" role=menuitem
End        -> BUTTON "Delete user" role=menuitem
Home       -> BUTTON "Reset password" role=menuitem

menu items in order: ["Reset password","Delete user"]

=== L16: Escape returns to the trigger ===
after Escape -> BUTTON "Row actions"
```

Down from the last item wraps to the first, up from the first wraps to the last.

## 5. STATIC 9 - "Row actions" forty times

The `label` prop and its default already existed at `HEAD`, so the API the contract asked for is shipped.
What was missing is that the `role="menu"` container itself had no name, only the trigger did.
It now carries `aria-label={label}` too.

The 18 call sites are explicitly out of scope and untouched.

## 6. STATIC 18 - required fields

`form-ui.tsx` gains `Field` and `TextField`.
`Field` takes the control as a render prop rather than fixing it as an `<input>`, because admin forms put inputs, textareas, selects and the media picker in the same slot:

```tsx
<Field label="URL segment" required hint="Lowercase, no spaces." error={err}>
  {(p) => <input {...p} className={fieldInput} value={v} onChange={…} />}
</Field>
```

The marker is an `aria-hidden` `*` plus an `sr-only` " (required)" plus `required` on the control.
An asterisk alone is punctuation to a screen reader.
`aria-describedby` lists the error before the hint, because descriptions are read in order and the problem matters more than the guidance that failed to prevent it.

### Acceptance 7

Throwaway render exercising all three together:

```
--- rendered field ---
label            : <label for="_r_0_-field" class="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">URL segment<span aria-hidden="true" class="ml-0.5 text-destructive">*</span><span class="sr-only"> (required)</span></label>
input id         : _r_0_-field
required         : true
aria-invalid     : true
aria-describedby : _r_0_-error _r_0_-hint
  -> #_r_0_-error      : Segment is required.
  -> #_r_0_-hint       : Lowercase, no spaces.
```

Both ids resolve to real elements holding the text they claim.
The throwaway (`src/components/admin/form-ui.throwaway.test.tsx`) is deleted.

## 7. STATIC 17 - LangTabs announced tabs it had not built

Built rather than un-claimed, since the tabs are real: `aria-controls` on each tab, `aria-labelledby` back from each panel, roving `tabIndex` so the tablist is one tab stop, and Left/Right/Home/End with wrap moving selection and focus together.
Panels still all stay mounted and merely hidden, so rich-text editors do not remount on a tab change.

Covered by `src/components/admin/LangTabs.test.tsx`, 5 tests, including that every `aria-controls` resolves to a `role="tabpanel"` that names its tab back:

```
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

## Acceptance 1 - the gates

```
### 1. tsc
   exit=0 (silent)

### 1. test
 Test Files  37 passed (37)
      Tests  356 passed (356)

### 1. lint
Checked 278 files in 145ms. No fixes applied.
Found 8 errors.
```

333 over 33 was the floor; 356 over 37 clears it, and the 8 lint errors are the standing `noArrayIndexKey` set, unchanged.

## Notes

- **L17** appears in the contract's evidence list but not in its Do list. It is the shared list header showing "0 total" before the query resolves, which lives in the list pages - out of my file set.
- The MCP browser profile was held by another pane throughout, so the browser evidence was collected with an isolated Chromium driven by `playwright-core` installed under `/tmp`. Nothing was added to the repo's dependencies.
- HMR from the other panes reloaded the admin repeatedly mid-run (`[vite] page reload src/routes/admin.tsx`), which is why the login helper retries. Every result above comes from a single uninterrupted interaction.
- No `git` write command was run. `kape.db` was not touched; the server's own `.work/scratch/uitest.db` lost two pages to the M09 delete confirmations, which is the test doing what it was asked to.
