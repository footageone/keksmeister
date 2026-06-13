# Compliance Context (DE/EU)

This document maps what Keksmeister implements to the rules that apply in
Germany and the EU as of mid-2026. It is **not** legal advice — your DPO
still needs to sign off — but it shows which obligations the library
addresses out of the box and which ones depend on how you deploy it.

## The legal stack

| Rule | What it covers | How Keksmeister relates |
|---|---|---|
| **§ 25 TDDDG** (Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz, in force since **May 2024**, replaces TTDSG) | Setting and reading information on the visitor's terminal — i.e. cookies, `localStorage`, fingerprinting. Requires prior, informed consent for anything that isn't strictly necessary. | The ``ScriptBlocker`` keeps non-essential ``<script>`` tags out of the page until the matching category is granted. The ``onConsent`` callback / built-in logger only fire after a real consent decision. |
| **DSGVO Art. 6(1)(a), Art. 7** | Conditions for valid consent and proof of consent (Rechenschaftspflicht). | Each decision becomes a ``ConsentRecord`` (timestamp, revision, choices, method, action, subjectId) — see [consent-logging.md](consent-logging.md). |
| **DSGVO Art. 7(3)** | Withdrawal must be as easy as giving consent. | ``ConsentManager.revokeAll()`` exists and is exposed through the ``<keksmeister-trigger>`` element — but only if **you place that element on every page** (see "Trigger placement" below). |
| **DSK-OH "Digitale Dienste" v1.2** (Nov 2024) | German supervisory authorities' practical reading of TDDDG + DSGVO. | Reject button on Layer 1 (Rn. 135), banner-config snapshot per revision (Rn. 85), opt-in default (Rn. 59), pseudonymity (Rn. 84) — all implemented. |
| **EDPB Guidelines 03/2022** | Deceptive design patterns in consent flows. | No pre-checked boxes; accept and reject have the same visual weight on Layer 1 and Layer 2 (see [the styles guide](../src/ui/styles.css)). |
| **ePrivacy-Verordnung** | Would have replaced the ePrivacy Directive at EU level. | **Withdrawn** by the EU Commission in February 2025. § 25 TDDDG (the German transposition of the 2002 Directive) remains the operative rule. |

## Trigger placement — required for DSGVO Art. 7(3)

DSGVO Art. 7(3) requires that withdrawal of consent must be **as easy as
giving it**. Hiding a withdrawal link three menu levels deep, behind a contact
form, or in the privacy policy is not enough — the supervisory authorities
treat that as Art. 7(3) violation.

Keksmeister ships ``<keksmeister-trigger>`` for this. **You must place it on
every page** where ``<keksmeister-banner>`` is also placed:

```html
<footer>
  <!-- … other footer links … -->
  <keksmeister-trigger variant="text"></keksmeister-trigger>
</footer>
```

If the trigger is missing on a page, that page does not satisfy Art. 7(3) —
even though the underlying ``ConsentManager`` API still works.

The library cannot enforce this for you. Treat it as a deployment checklist
item alongside the banner element itself.

## EinwV / §26 TDDDG — what it is and why Keksmeister is *not* one

The **Einwilligungsverwaltungsverordnung** (EinwV), effective **1 April
2025**, implements § 26 TDDDG. It creates an optional, BfDI-certified role
called *anerkannter Einwilligungsverwaltungsdienst* (EVD). The idea: a
neutral third-party service stores the visitor's consent preferences once,
and websites query it instead of showing their own banner.

**Keksmeister is not an EVD and does not aim to become one.** It is a
self-hosted library that lets your own website run its own banner. That is
fully legitimate under § 25 TDDDG + DSGVO — no EinwV certification is
required to operate your own consent flow.

What this means for operators:

- You can deploy Keksmeister on your own site without involving the BfDI.
- If you want to *offer an EVD* to third parties, you need a separate,
  certified product. Keksmeister is not it.
- As the EVD market matures, an integration that respects a visitor's
  central EVD preference (if any) may become a useful Keksmeister feature.
  It is not implemented today.

## Snapshot of compliance choices (Stand 2026-06)

- **Withdrawn ePrivacy-Verordnung** — no impact on this library; we follow
  § 25 TDDDG and the 2002 Directive it implements.
- **No IAB TCF** — the EuGH ruling C-604/22 (March 2024) treats TC-Strings
  as personal data; Keksmeister does not emit, store or consume them, so
  none of the related compliance debates apply.
- **Retention of consent proof** — defaults to ~3 years
  (§§ 195, 199 BGB civil limitation), see [consent-logging.md](consent-logging.md).

## Where Keksmeister can *not* help you

These are operational obligations the library cannot enforce:

- Hosting the audit log inside the EU.
- Listing the consent in your record of processing activities (Art. 30 DSGVO).
- Naming the receiving service in your privacy policy.
- Keeping the trigger on every page (see above).
- Adjusting ``revision`` whenever the banner texts or categories change, so
  the snapshot endpoint records the right version.
