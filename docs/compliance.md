# Compliance Context (EU)

This document maps what Keksmeister implements to the cookie-consent rules
that apply across the EU (plus the UK) as of mid-2026. It is **not** legal
advice — your DPO still needs to sign off — but it shows which obligations
the library addresses out of the box and which ones depend on how you
deploy it.

> **Sources.** All claims below are verified against primary documents
> (regulator PDFs, enforcement decisions, EDPB opinions) — never against
> blog-post summaries. Where a national authority has not been verified
> primarily, the section says so.

## The legal stack

Cookie consent in the EU lives at three levels: a single EU regulation
(DSGVO) and directive (ePrivacy), supranational interpretation (EDPB), and
national transpositions and enforcement by each member-state DPA.

### Supranational

| Rule | What it covers |
|---|---|
| **DSGVO Art. 6(1)(a), Art. 7** | Conditions for valid consent and proof of consent (Rechenschaftspflicht). |
| **DSGVO Art. 7(3)** | Withdrawal must be as easy as giving consent. |
| **DSGVO ErwGr 32** | Silence, pre-ticked boxes or inactivity ≠ consent. |
| **ePrivacy Directive 2002/58/EG, Art. 5(3)** | Prior consent for any non-strictly-necessary access to information stored on the visitor's device. |
| **EDPB Guidelines 05/2020** | Conditions of valid consent (granularity, unambiguity, withdrawal). |
| **EDPB Guidelines 03/2022** | Deceptive design patterns in consent flows. |
| **EDPB Cookie Banner Task Force Report** (Jan 2023) | Joint EU position on what banner designs cross into invalid consent — reject-as-link, pre-ticked Layer 2, etc. |
| **ePrivacy-Verordnung** (proposed regulation) | **Withdrawn** by the EU Commission in February 2025. The 2002 Directive remains operative. |

### National (selection, verified primarily)

| Country | Rule | Notes |
|---|---|---|
| 🇩🇪 Germany | **§ 25 TDDDG** (since May 2024, replaces TTDSG) + **DSK-OH "Digitale Dienste" v1.2** (Nov 2024) | DSK-OH details visual button parity (Rn. 135), config snapshots (Rn. 85), opt-in default (Rn. 59). |
| 🇫🇷 France | **CNIL Délibération 2020-091** + **Recommandation 2020-092** | "Refuser" must be as simple as accepting; cookie consent valid up to ~13 months. |
| 🇮🇹 Italy | **Garante Provvedimento 231** (10 June 2021, enforced since Jan 2022) | Most prescriptive in the EU — see below. |
| 🇪🇸 Spain | **AEPD Cookie Guideline update** (11 July 2023, mandatory **11 January 2024**) | Reject button required on Layer 1 in same shape as accept; Layer 1 must carry accept + reject + link-to-settings. |
| 🇬🇧 UK | **PECR 2003** + **ICO guidance** + **Data (Use and Access) Act 2025** (key provisions in force **Feb 2026**) | Mostly mirrors EU rules; DUA Act adds narrow exceptions for low-risk analytics, security, fraud detection cookies. |

> Not yet primarily verified in this document: AP (Netherlands),
> DPC (Ireland), DSB (Austria), APD/GBA (Belgium) post-May 2025, and the
> noyb cookie-banner sweep totals. Treat guidance for those markets as
> needing local-counsel review.

## EU consensus — enforced everywhere

These obligations are upheld by **every** DPA that has issued guidance, and
back-stopped by the EDPB Cookie Banner Task Force (Jan 2023):

| Requirement | Source |
|---|---|
| Scrolling / continuing to browse is **not** consent — an unambiguous positive action is required. | CNIL Délib. 2020-091; Garante Provv. 231; ICO PECR; EDPB 05/2020 |
| **Reject must be equally easy and visually equivalent to accept** on Layer 1 — same size, colour, weight; no buried text link. | CNIL Délib. 2020-091; Garante Provv. 231; AEPD Cookie Guideline (Jul 2023 update); EDPB Cookie Banner Task Force Jan 2023 |
| Reject offered only as a text link inside paragraph copy = violation. | EDPB Cookie Banner Task Force Jan 2023 |
| Reject offered only **outside** the banner frame (e.g. "click here in our policy") = violation. | EDPB Cookie Banner Task Force Jan 2023 |
| **No pre-ticked checkboxes**, including on the settings (Layer 2) page. | DSGVO ErwGr 32; EDPB Cookie Banner Task Force Jan 2023 |
| Granular consent **per purpose** — bundling distinct purposes into a single "I agree" can void the consent's freedom. | CNIL Délib. 2020-091; EDPB 05/2020 |
| Withdrawal must be **possible**, **at any time**, and **as easy as giving consent** — but no specific UI is mandated. | DSGVO Art. 7(3); EDPB Cookie Banner Task Force Jan 2023 |

Keksmeister implements all seven by default. The visual-parity point is
covered by the matched solid fills on accept and reject buttons; per-purpose
granularity by the toggle-per-category modal; withdrawal by the
``<keksmeister-trigger>`` element.

## National variations — when the strict reading matters

### 🇫🇷 France (CNIL)

- **Délibération 2020-091**, Art. 2: "continuer à naviguer sur un site
  web…ne constituent pas des actions positives claires assimilables à un
  consentement valable."
- **Rejection ≈ acceptance in effort**: "L'expression du refus de
  l'utilisateur…doit pouvoir se traduire par une action présentant le même
  degré de simplicité que celle permettant d'exprimer son consentement."
- **CNIL vs. Google, € 325 m** (September 2025): users were nudged toward
  the personalised-ads option ("encouraged to choose personalised
  advertisements to the detriment of generic advertisements") — held to
  violate the freedom-of-choice requirement. Strong signal that visual
  nudging now triggers enforcement, not just guidance.
- **Recommandation 2020-092** (not primarily re-verified here): operators
  often cite a 6-month re-prompt window and up to 13-month cookie-consent
  retention as CNIL practice.

### 🇮🇹 Italy (Garante Provvedimento 231) — strictest in the EU

The Italian rules add concrete, prescriptive requirements that go beyond
the DSK-OH:

- **Six-month minimum re-prompt window after a rejection** is *normed*
  (not just recommended). The banner may only reappear after a rejection
  if (a) the configuration materially changes, (b) the visitor clears
  their cookies, or (c) at least six months have passed.
  → Maps directly onto Keksmeister's ``consentMaxAgeDays`` default of
  **180** (see [consent-logging.md](consent-logging.md)).
- **Close button (X) counts as rejection.** The banner must have a clearly
  visible close affordance, and clicking it must be treated as "no". The
  banner must say so explicitly.
  → Implemented in Keksmeister via the ``closeAsReject`` option on the
  banner. Opt-in (default: off) so operators serving only the German
  market do not get the extra UI without asking.
- **Equal dimensions, emphasis and colour** for accept and reject buttons
  ("comandi e caratteri di uguali dimensioni, enfasi e colori").
  → Implemented via the matched ``--km-primary`` / ``--km-secondary`` solid
  fills.
- **Visually distinct banner** ("percettibile discontinuità") from the
  underlying page — must not blend into content.
- **Analytics without consent** is allowed only when *all three* hold:
  - IP address masked to at least the 4th octet (covers a /24 range).
  - Single site / single app — no cross-site reuse.
  - The third-party measurement provider may not combine the data with
    its own other processing.

If you serve Italian visitors, the IT rules are the binding floor for your
banner design — not the DSK-OH.

### 🇪🇸 Spain (AEPD Cookie Guideline, July 2023 update)

- AEPD updated its cookie guideline on **11 July 2023** with mandatory
  compliance by **11 January 2024**. The update aligns Spain explicitly
  with EDPB Guidelines 03/2022 on deceptive design patterns.
- "El rechazo de las cookies debe ser tan sencillo como su aceptación,
  debiendo estar disponible el botón de «rechazar» en el primer nivel del
  banner." — primary source, AEPD press release.
- Concrete Layer 1 composition required:
  - **(a) Accept** button.
  - **(b) Reject** button (same control type, same prominence, same
    level — not buried as a link).
  - **(c) Link** to the granular settings panel.
- No design "steering" toward acceptance — same EDPB Stirring concept
  that informs the German DSK-OH but here it is explicit AEPD doctrine.
- → Keksmeister already satisfies the Layer 1 composition (accept +
  reject + settings) and visual parity. No code change needed for
  Spanish traffic; the AEPD guideline strengthens the case for the
  visual-parity work already done.

> Refuted in research (do not propagate): a maximum 12-month consent
> retention, a general cookie-wall ban, and a granularity mandate
> attributed to the AEPD all *failed* primary verification against the
> July-2023 press release. They appear in secondary blog posts but not
> in the AEPD source — flag those secondary sources accordingly.

### 🇬🇧 UK (ICO + PECR + DUA Act 2025)

- **PECR 2003** — the UK's transposition of the ePrivacy Directive.
  Substantively close to § 25 TDDDG / CNIL: prior consent for any
  non-strictly-necessary cookie, scrolling is not consent.
- **Data (Use and Access) Act 2025** — Royal Assent June 2025; key
  provisions in force **February 2026**. Introduces *narrow* new exceptions
  to the consent requirement for low-risk analytics, security and fraud-
  detection cookies. **Does not** change the consent paradigm for anything
  else.
- For Keksmeister: no changes are required for UK-only traffic. If you run
  a single banner for EU + UK visitors, design to the stricter rule (DSGVO).

## Consent or Pay (EDPB Opinion 08/2024)

This section is **context, not a Keksmeister feature**. Keksmeister is a
consent banner; it does not implement, sell or model "pay or consent"
flows. Operators considering one need to know how the EDPB has framed it.

- **EDPB Opinion 08/2024** (17 April 2024) was triggered by a joint
  Art. 64(2) request from the Dutch AP, the Norwegian Datatilsynet, and
  the Hamburg DPA (HmbBfDI). It assesses whether consent obtained in
  "consent-or-pay" models on **large online platforms (LOPs)** can be
  *freely given* under DSGVO Art. 4(11) / 7.
- Four criteria for valid consent in this context:
  1. **Conditionality** — consent cannot be a condition for accessing
     the service in the way the model is presented.
  2. **Detriment** — refusing consent must not subject the user to a
     disadvantage that vitiates free choice.
  3. **Imbalance of power** between the controller and the data subject.
  4. **Granularity** — per-purpose consent must remain possible.
- The Opinion explicitly states personal data is **not** a tradeable
  commodity ("personal data cannot be considered as a tradeable
  commodity") and that the fundamental right must not become a feature
  one pays for.
- **Scope is LOPs only.** The Opinion does not directly bind smaller
  publishers; for them the general DSGVO Art. 7(4) coupling prohibition
  still applies, but the LOP-specific reasoning does not transplant
  mechanically.
- Meta Platforms Ireland has challenged the Opinion at the CJEU
  (**T-319/24**); proceedings are pending as of mid-2026.
- The EDPB held a stakeholder event on the next iteration of these
  rules in **November 2024**, and broader Consent-or-Pay guidelines
  with wider scope are on the EDPB **2026–2027 work programme**.

### Refuted reading (do not propagate)

A common but **incorrect** reading of Opinion 08/2024 is that "LOPs
*must* offer a free third alternative without behavioural advertising".
This claim failed primary verification — the Opinion is more nuanced and
mainly asks whether the binary choice is *free*; it does not codify a
free-third-tier obligation. Track the upcoming EDPB guidelines for the
authoritative wording.

## Trigger placement — required for DSGVO Art. 7(3)

DSGVO Art. 7(3) requires withdrawal to be **as easy as giving consent**.
Burying a withdrawal link three menu levels deep, behind a contact form,
or inside the privacy policy is not enough — every DPA treats this as a
violation.

Keksmeister ships ``<keksmeister-trigger>`` for this. **You must place it
on every page** that also carries the banner:

```html
<footer>
  <!-- … other footer links … -->
  <keksmeister-trigger variant="text"></keksmeister-trigger>
</footer>
```

If the trigger is missing on a page, that page does not satisfy Art. 7(3)
— even though the underlying ``ConsentManager`` API still works.

The library cannot enforce this for you. Treat it as a deployment checklist
item alongside the banner element itself.

## EinwV / § 26 TDDDG — German-specific, why Keksmeister is *not* one

The **Einwilligungsverwaltungsverordnung** (EinwV), effective **1 April
2025**, implements § 26 TDDDG and creates an optional, BfDI-certified
role called *anerkannter Einwilligungsverwaltungsdienst* (EVD): a neutral
third-party service that stores consent preferences once and is queried
by websites instead of each running its own banner.

**Keksmeister is not an EVD and does not aim to become one.** It is a
self-hosted library — fully legitimate to deploy on your own site under
§ 25 TDDDG + DSGVO without EinwV certification.

- You can deploy Keksmeister on your own site without involving the BfDI.
- If you want to *offer an EVD* to third parties, you need a separate,
  certified product. Keksmeister is not it.
- As the EVD market matures, an integration that respects a visitor's
  central EVD preference (if any) may become a useful feature. It is not
  implemented today.

The EinwV is a German-only construct. Other member states have no
equivalent framework as of mid-2026.

## Snapshot of compliance choices (Stand 2026-06)

- **No IAB TCF.** The EuGH ruling C-604/22 (March 2024) treats TC-Strings
  as personal data; Keksmeister does not emit, store or consume them, so
  the TCF-related compliance debates do not apply here.
- **Retention of consent proof** — defaults to ~3 years (§§ 195, 199 BGB
  civil limitation), see [consent-logging.md](consent-logging.md). CNIL
  practice tops out around 13 months on the consent record itself; if your
  primary market is France, set ``RETENTION_DAYS`` accordingly on the
  audit server.
- **Re-prompt window** — Keksmeister's ``consentMaxAgeDays`` defaults to
  **180** days, matching the Italian Garante's six-month floor and the
  CNIL six-month operator practice. Operators wanting a longer window must
  set it explicitly.

## What Keksmeister can *not* enforce for you

These are operational obligations no library can solve:

- Hosting the audit log inside the EU.
- Listing the consent in your record of processing activities (Art. 30 DSGVO).
- Naming the receiving service in your privacy policy.
- Keeping ``<keksmeister-trigger>`` on every page.
- Bumping ``revision`` whenever banner texts or categories change so the
  snapshot endpoint records the right version.
- Country-specific tweaks — e.g. localising the banner copy to make the
  close-as-rejection point explicit when serving Italian visitors.

## Refuted claims (housekeeping)

The research that informed this document also identified several
widely-repeated claims that did not hold up under verification. They are
listed here so they do not creep back into the docs by accident:

- "noyb filed 422 / 456 / 516 formal complaints" — specific numbers from
  noyb press releases were **not** confirmable against primary documents.
  The noyb sweeps are real; the specific tallies often quoted in
  secondary blogs are not reliable.
- "The Belgian Market Court (May 2025) confirmed the substantive IAB TCF
  findings" — the procedural quashing is documented, the substantive
  confirmation is **not**. Treat the TCF legal status under Belgian law as
  unsettled.
- "EuGH classified IAB Europe as joint controller under Art. 26 DSGVO" —
  the classification was under **Art. 4(7)** (controller), not Art. 26
  (joint controllership), and a Belgian appellate court has since
  narrowed the scope to the TC-String only.
- "AEPD mandates a 12-month consent retention" / "AEPD bans cookie
  walls outright" / "AEPD mandates per-purpose granularity" — none of
  these claims survive a primary-source check against the AEPD's 11 July
  2023 press release. They appear in legal blogs but are not in the
  AEPD's own publication.
- "EDPB Opinion 08/2024 forces large platforms to offer a free
  ad-free third option" — the Opinion is more nuanced. It assesses
  whether the binary choice is free, not whether a third option is
  mandatory.
