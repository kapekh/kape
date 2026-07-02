// Deprecated. Embedded forms are now rendered inline by `RichBody` (which splits
// authored HTML at the `data-kape-form` markers and renders real <FormRenderer/>
// React nodes) — no portal-into-dangerouslySetInnerHTML, which crashed on
// re-render. Do not reintroduce a portal-based hydrator.
export {};
