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
| 🇳🇱 Netherlands | **Telecommunicatiewet Art. 11.7a** + **AP Normuitleg "Intrekken toestemming"** (8 March 2024) | Withdrawal must be informed-up-front, anytime, without detriment, as easy as consent. Active enforcement sweep ongoing. |
| 🇮🇪 Ireland | **DPC Guidance Note** (April 2020) — still the authoritative cookie document | 6-month consent reaffirmation default; lead authority for Meta/Google/TikTok/LinkedIn/Apple in Dublin. |
| 🇦🇹 Austria | **DSB** Google Analytics decision D155.027 (Jan 2022) + **ORF Bescheid D124.0507/24** (28 Oct 2024) | Accept-all and "Only necessary" must be visually identical on Layer 1. |
| 🇧🇪 Belgium | **APD Decision 21/2022** + **Brussels Market Court rulings** (14 May 2025; 9 Jan 2026) | TC-String = personal data, IAB Europe = joint controller **only for TC-String** — not downstream RTB/targeting. €250k fine upheld; action plan annulled and pending redraft. |
| 🇬🇧 UK | **PECR 2003** + **ICO guidance** + **Data (Use and Access) Act 2025** (key provisions in force **Feb 2026**) | Mostly mirrors EU rules; DUA Act adds narrow exceptions for low-risk analytics, security, fraud detection cookies. |

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

## `mode: 'opt-out'` — CCPA/US only, unlawful for EU/EEA visitors

> **⚠️ EU/EEA warning.** ``mode: 'opt-out'`` activates every non-essential
> category by default and only lets the visitor withdraw afterwards. That
> default-active behaviour is exactly what **CCPA/CPRA-style** "right to
> opt out of sale" regimes expect — but it is **unlawful under DSGVO
> Art. 6(1)(a) + ErwGr 32 and ePrivacy Directive Art. 5(3)**, both of which
> require *prior, opt-in* consent before any non-essential cookie is set.
> Every DPA in the "EU consensus" table above enforces the opt-in default;
> the UK's PECR mirrors the same rule. **Never set `mode: 'opt-out'` for
> visitors in the EU/EEA (or the UK).** It is intended purely for CCPA-style
> jurisdictions — e.g. a US-only deployment, or one gated behind a geo-IP
> check that keeps EU/EEA traffic on `mode: 'opt-in'` (the library default).
> Setting it globally on a site with EU/EEA visitors turns every page load
> into cookies-before-consent — the single most commonly enforced violation
> across every DPA covered in this document.

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

### 🇳🇱 Netherlands (AP — Telecommunicatiewet + Normuitleg, March 2024)

- **Telecommunicatiewet Art. 11.7a** — the Dutch ePrivacy transposition,
  identical structure to § 25 TDDDG / Art. 5(3) ePrivacy Directive:
  prior consent for storing or accessing information on the visitor's
  device.
- **AP Normuitleg "Intrekken toestemming bij cookiebanners"** (8 March
  2024) operationalises DSGVO Art. 7(3) for the cookie context. Four
  cumulative requirements:
  1. The visitor must be **informed up front** that consent can be
     withdrawn and how.
  2. Withdrawal must be possible **without detriment**.
  3. Withdrawal must be possible **at any time**.
  4. Withdrawal must be **as easy as giving consent**.
- **Enforcement cadence (verified from AP press releases):**
  - 2024 — five formal investigations opened, all five found
    infringements.
  - April 2025 — first 50 warning letters of a planned 500/year, target
    sectors: online retail, media, insurance.
  - Mid-2025 — over 200 sites warned; ~75% adjusted after the warning;
    investigations opened against the holdouts.
  - The AP continuously monitors roughly 10,000 Dutch websites.
- Most-common failures the AP cites: cookies set **before** consent;
  reject only on Layer 2; pre-checked tracking opt-in; visual
  asymmetry between accept and reject.
- **Cookie walls:** the AP's position is strict — a wall without a
  genuine no-tracking alternative makes consent un-free. This is *stricter*
  than the EDPB Opinion 08/2024, which is more nuanced for LOPs.
- → Keksmeister already covers the four Art. 7(3) requirements via the
  ``<keksmeister-trigger>`` + ``revokeAll()`` API and the visual
  parity work for the reject button. The "informed up front" piece
  depends on banner copy — operators serving Dutch traffic should
  surface the withdrawal availability in the Layer 1 description text.

### 🇮🇪 Ireland (DPC Guidance Note, April 2020)

- The **2020 DPC Guidance Note** is still the authoritative cookie
  document in Ireland — no later replacement has been issued. Several
  concrete requirements stand out, all read from the primary PDF:
  - **"Cookies that do not meet one of the two specific use cases…
    must not be set or deployed on a user's device before you obtain
    their consent."** Covers cookies, pixels, local storage, SDKs,
    fingerprinting, "Like" buttons — not just cookies.
  - **Equal prominence** between accept and reject — a banner with
    only "OK / Got it" is explicitly non-compliant.
  - **"Continued use" wording is not permissible** — scrolling, clicking
    or using the site does not equal consent.
  - **6-month consent reaffirmation default**: "you should ask the user
    to reaffirm their consent no longer than six months after you have
    stored this consent state". Operators can argue for longer, but
    must justify it case by case.
  - **Cookie lifespan must be proportionate to function.** A session
    cookie "with a lifespan of 'forever'" is non-compliant.
  - **No pre-checked boxes / sliders / "ON" defaults** — Planet49
    explicitly cited.
  - **No browser-settings-as-consent.**
  - **Withdrawal as easy as consent** — the DPC suggests a persistent
    on-page control (floating button or footer link).
- **First-party analytics:** the DPC notes consent is still required
  but treats first-party analytics as "unlikely a priority for
  enforcement". Treat this as enforcement guidance, not a legal carve-out.
- **As the lead authority for Meta, Google, TikTok, LinkedIn, Apple, and
  Microsoft EU HQs**, what the DPC accepts as consent for those
  controllers becomes the *de facto* EU floor for everyone else. Recent
  big-ticket fines (LinkedIn €310m Oct 2024 for behavioural-advertising
  consent quality, Meta €390m Jan 2023 for ads-legal-basis) are not
  banner-design fines per se, but they reinforce the equal-prominence
  and granularity-per-purpose lines.
- → Keksmeister's defaults — opt-in, no pre-checked toggles,
  per-category granularity, 180-day default re-prompt window — line up
  with the DPC guidance. The 6-month DPC figure is the source most
  operators will recognise for the ``consentMaxAgeDays`` default; treat
  the **180-day Keksmeister default** as the DPC-aligned setting.

### 🇦🇹 Austria (DSB)

- **Bescheid D155.027 / 2021-0.586.257** (22 Dec 2021, published 13 Jan
  2022) — Google Analytics use without sufficient TOMs violates
  Chapter V DSGVO. The transfer dimension was largely resolved by the
  **EU-US Data Privacy Framework** (July 2023); the cookie dimension
  remains: § 165 TKG 2021 still demands prior consent for analytics
  cookies, DPF or not.
- **ORF Bescheid D124.0507/24** (28 October 2024) — the DSB explicitly
  requires that "Accept all" and "Only necessary" on Layer 1 be
  **visually equivalent**: identical (or near-identical) colour,
  identical font size, identical contrast, no preferred positioning.
  Cookie walls without a genuine alternative are not permitted.
- → Maps onto the same matched-fill button design Keksmeister already
  uses (PR #68 / Garante work). No additional code change needed for
  Austrian traffic.

### 🇧🇪 Belgium (APD/GBA + Brussels Market Court)

The Belgian story is the IAB TCF saga, now substantially clarified:

- **APD Decision 21/2022** (Feb 2022) — €250,000 fine + corrective
  action plan against IAB Europe for TCF DSGVO violations.
- **Brussels Market Court, 14 May 2025** — procedurally annulled the
  APD decision for insufficient reasoning, *but* re-decided the merits
  itself and confirmed:
  - The **TC-String is personal data**.
  - **IAB Europe is a joint controller** under Art. 4(7) + Art. 26
    DSGVO — but **only for the TC-String processing inside the TCF**,
    *not* for downstream RTB, targeting, or analytics.
  - **The €250,000 fine is upheld.**
- **Brussels Market Court, 9 January 2026** — annulled the APD's
  January 2023 validation of IAB Europe's action plan because the APD
  had not given IAB Europe an opportunity to respond and the plan
  reached past IAB Europe's actual controllership. The APD must now
  draft a narrower plan.
- **TCF v2.2 remains usable.** No court has held the TCF illegal; v2.2
  has folded in many of the corrective changes. Operators using a
  TCF-based CMP need documented legal bases plus the post-2025
  scope-limited reading of IAB Europe's role.
- **Wider APD enforcement (2024):** decisions 37/2024 and 38/2024 hit
  media companies for missing Layer-1 reject + colour-highlighted
  accept buttons; decision 131/2024 imposed €350,000 on a digital
  marketing firm for un-grounded profiling; the APD threatened four
  press sites with €25,000 daily fines for persistent dark patterns.
- → Keksmeister does not implement the TCF, so the IAB Europe rulings
  do not impose direct obligations. The 37/2024 + 38/2024 reading
  reinforces the EU consensus on Layer-1 reject and visual parity that
  Keksmeister already satisfies.

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

## Beyond cookies — EDPB Guidelines 02/2023 v2.0 (October 2024)

The EDPB finalised v2.0 of **Guidelines 02/2023 on the technical scope
of Art. 5(3) ePrivacy** on **7 October 2024**. Two consequences matter
for any consent-banner library:

1. **The trigger is "either storage OR access"** — both legs are
   independent. The familiar examples (cookies, ``localStorage``) cover
   storage; the access leg pulls in mechanisms many banners ignore.
2. **In-scope mechanisms** explicitly listed:
   - Cookies (any kind).
   - **Tracking pixels and pixel URLs** — embedded ``<img>`` /
     ``<iframe>`` that load on page render and call back to the
     tracker.
   - **URL tracking** — query-string-based trackers, redirect chains.
   - **IP-address tracking** (under specific conditions).
   - **Device fingerprinting** (building on Art. 29 WP Opinion 9/2014).
   - **Unique identifiers** and IoT-style reporting.
   - **Local processing followed by transmission** of any derived data.
   - The browser cache / transient client-side storage of information.

The EDPB also confirms Art. 5(3) catches **non-personal data**, so the
DSGVO does not have to apply for the consent requirement to bite.

**Implication for Keksmeister.** Today the ``ScriptBlocker`` covers
``<script>`` tags carrying ``data-keksmeister``. That handles JavaScript-
delivered trackers but **does not** intercept pixel-based trackers
embedded as ``<img>``, ``<iframe>``, or ``<link>`` tags, nor stylesheet-
delivered tracking URLs (``background-image: url(tracker)``). Operators
who deploy pixel-only trackers (Meta Pixel without the JS SDK, plain
1x1-image counters, link-based attribution) need to gate those
themselves — either with ``ServiceAdapter``s or by deferring the
elements until consent is granted.

Extending ``ScriptBlocker`` to also lift ``<img>`` / ``<iframe>`` /
``<link>`` elements that carry ``data-keksmeister`` is a logical next
step. Tracked as a follow-up after this PR.

## Snapshot of compliance choices (Stand 2026-06)

- **No IAB TCF.** The EuGH ruling **C-604/22** (7 March 2024) confirmed
  that a TC-String **is personal data** under Art. 4(1) DSGVO when it can
  be linked to an identifier, and that IAB Europe is a **joint
  controller** under Art. 4(7) + Art. 26 — but **only for the TC-String
  processing inside the TCF**, not for downstream RTB, ad targeting or
  analytics. Keksmeister does not emit, store or consume TC-Strings, so
  the related compliance debates do not apply here. The Belgian Market
  Court (14 May 2025) re-decided the IAB case on the merits and
  matched the EuGH reading; see the Belgium section above.
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

## The noyb cookie-banner sweeps (verified figures)

Earlier drafts of this document treated noyb's complaint tallies as
"specific numbers not confirmable" because secondary sources mixed
draft complaints, warnings, and formal complaints. Reading noyb's own
press releases settles this:

| Date | What happened | Verifiable from noyb |
|---|---|---|
| 31 May 2021 | First wave of **560 draft complaints** mailed to companies across 33 countries | "First 560 websites in 33 countries got a (free) draft complaint today" |
| 10 Aug 2021 | **422 formal DSGVO complaints** filed with 10 DPAs after the 30-day cure period | noyb press release "noyb files 422 formal GDPR complaints…" |
| 4 Mar 2022 | Round-1 cumulative total: **456 formal complaints, 20 DPAs**; new draft wave of 270 issued | "noyb had to file a total of 456 complaints with 20 different DPAs" |
| 9 Aug 2022 | **226 formal complaints** filed against users of one specific CMP vendor (OneTrust), 18 DPAs | noyb press release "226 complaints lodged…" |
| 11 Jul 2024 | noyb Consent Banner Report — analytical, not a new round | "How authorities actually decide" |

The figure that gets misquoted most often is **"516 complaints"** — 516
is the number of **companies warned** during the draft phase, not the
number of formal complaints. The formal-complaint number is **422**
(initial filing) or **456** (corrected round-1 total).

## Refuted claims (housekeeping)

The research that informed this document also identified several
widely-repeated claims that did not hold up under verification. They are
listed here so they do not creep back into the docs by accident:

- "noyb filed 516 formal complaints" — 516 is the **warning** count, not
  the complaint count. The verified figures live in the table above.
- "AEPD mandates a 12-month consent retention" / "AEPD bans cookie
  walls outright" / "AEPD mandates per-purpose granularity" — none of
  these claims survive a primary-source check against the AEPD's 11 July
  2023 press release. They appear in legal blogs but are not in the
  AEPD's own publication.
- "EDPB Opinion 08/2024 forces large platforms to offer a free
  ad-free third option" — the Opinion is more nuanced. It assesses
  whether the binary choice is free, not whether a third option is
  mandatory.
