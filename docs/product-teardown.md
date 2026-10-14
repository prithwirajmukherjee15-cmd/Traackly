<img src="media/teardown/cover.png" alt="Traackly product teardown: Nothing changes silently" width="100%">

# Traackly: Product Teardown

> [!NOTE]
> **A product marketing teardown of a product I found, framed, positioned and shipped.**
> It covers the problem, the customer, positioning, the competition, go-to-market, brand, metrics and the product itself, screen by screen.
> Every claim is tagged **CONFIRMED** (seen first-hand), **ASSUMPTION** (reasoned but untested) or **OPEN QUESTION** (needs data).

| Role | Stage | Built with | Timeline | Status |
|---|---|---|---|---|
| Product marketer and product owner | Working MVP, pre-pilot | Go, React, MongoDB; AI-assisted build (Claude Code) | PRD August 2026 · shipped October 2026 | 🟢 Live demo build · 🟡 No pilot yet · 🔴 Not priced |

<details>
<summary><b>Contents</b>: 8 parts, 39 sections</summary>

- [Executive brief](#executive-brief)
- [Part I. Problem, customer and opportunity](#part-i-problem-customer-and-opportunity)
  - [1. The problem](#1-the-problem) · [2. Root cause](#2-root-cause) · [3. Personas](#3-personas) · [4. Jobs to be done](#4-jobs-to-be-done) · [5. Why now](#5-why-now) · [6. Opportunity and market sizing](#6-opportunity-and-market-sizing)
- [Part II. Positioning and product strategy](#part-ii-positioning-and-product-strategy)
  - [7. Positioning and category](#7-positioning-and-category) · [8. Value proposition canvas](#8-value-proposition-canvas) · [9. The one rule](#9-the-one-rule) · [10. Feature to benefit map](#10-feature-to-benefit-map) · [11. Request lifecycle](#11-request-lifecycle) · [12. Scope: what's in, what's out](#12-scope-whats-in-whats-out)
- [Part III. Competitive landscape](#part-iii-competitive-landscape)
  - [13. Competitive set and method](#13-competitive-set-and-method) · [14. Capability comparison](#14-capability-comparison) · [15. The cost of reaching the floor](#15-the-cost-of-reaching-the-floor) · [16. Where incumbents win](#16-where-incumbents-win) · [17. Claims we can and can't make](#17-claims-we-can-and-cant-make)
- [Part IV. Go-to-market](#part-iv-go-to-market)
  - [18. ICP and beachhead](#18-icp-and-beachhead) · [19. Pricing hypothesis](#19-pricing-hypothesis) · [20. Channels](#20-channels) · [21. Launch phases](#21-launch-phases) · [22. Experiments backlog](#22-experiments-backlog) · [23. Risks and deliberate non-decisions](#23-risks-and-deliberate-non-decisions)
- [Part V. Brand and messaging system](#part-v-brand-and-messaging-system)
  - [24. Brand idea and identity](#24-brand-idea-and-identity) · [25. Message house](#25-message-house) · [26. Voice](#26-voice) · [27. Content and launch assets](#27-content-and-launch-assets)
- [Part VI. Metrics, funnel and objectives](#part-vi-metrics-funnel-and-objectives)
  - [28. North star and instrumentation](#28-north-star-and-instrumentation) · [29. Pilot adoption funnel](#29-pilot-adoption-funnel) · [30. First-quarter OKRs](#30-first-quarter-okrs)
- [Part VII. Product experience and screen flow](#part-vii-product-experience-and-screen-flow)
  - [31. End-to-end screen flow](#31-end-to-end-screen-flow) · [32. Screen by screen](#32-screen-by-screen) · [33. Design decisions](#33-design-decisions)
- [Part VIII. Proof and close](#part-viii-proof-and-close)
  - [34. What this project proves](#34-what-this-project-proves) · [35. Interview stories (STAR)](#35-interview-stories-star) · [36. Ownership and role](#36-ownership-and-role) · [37. Credibility checklist](#37-credibility-checklist) · [38. What I'd do next: 30/60/90](#38-what-id-do-next-306090) · [39. Closing note](#39-closing-note)
- [Sources](#sources)

</details>

> [!TIP]
> **How to read this.**
> - **2 minutes:** the [Executive brief](#executive-brief) and [9. The one rule](#9-the-one-rule).
> - **10 minutes:** add Part I, [14. Capability comparison](#14-capability-comparison) and [32. Screen by screen](#32-screen-by-screen).
> - **Full read:** top to bottom, about 30 minutes. The [5:54 walkthrough video](../WALKTHROUGH.md) covers the product in motion.

---

## Executive brief

### Portfolio positioning

At a manufacturer I worked for, a client order was built to the wrong spec for weeks. A change made after approval was approved correctly in an email thread and never reached the production floor. Nobody was careless. The process had no way to make the latest version of an order travel with it.

I wrote a PRD for the fix, built it with an AI coding assistant, and then did the marketing work around it: positioning, a sourced competitive teardown, a go-to-market plan, a brand and a launch video. This page pulls it all together in one place.

### Product snapshot

| | |
|---|---|
| **What it is** | A live request board for the whole company, from the order desk to the shop floor |
| **Who it's for** | Coordinators and owners at mid-size manufacturers that route client orders across departments over email and phone |
| **The one rule** | Every edit made after approval must be acknowledged by whoever works on it next, before that work can continue |
| **The structural difference** | Floor staff use one shared kiosk screen per department, with no individual logins |
| **Category** | A request and handoff layer for manufacturing, not a project-management suite |
| **Promise** | *Nothing changes silently.* |

### What has been built

| Area | Shipped | Evidence |
|---|---|---|
| Product | Four role-based boards (Coordinator, Authorizer, Logistics, floor kiosk), live updates, append-only change log | [README](../README.md), [walkthrough](../WALKTHROUGH.md) |
| Core mechanic | The server refuses *Mark in progress* and *Mark done* until every downstream owner has acknowledged a change | `TestRailwayOrderIncidentEndToEnd` replays the original incident through the real API |
| Quality | CI on every change: lint, type checks, race-detector tests, architecture tests; server coverage 96.6% | [TECHNICAL.md](../TECHNICAL.md) |
| Strategy | PRD, positioning, competitive teardown, GTM plan | [docs/product-marketing](product-marketing) |
| Brand and content | Logo and brand kit, homepage, 5:54 narrated walkthrough, two 30-second cuts, one-page case study | [brand kit](brand), [case study PDF](case-study.pdf) |

### Product evidence

| | |
|---|---|
| <img src="media/teardown/03-coordinator-board.png" alt="Coordinator board"><br><sub>**The Coordinator's board.** A changed order sits at the top, in amber, with "Awaiting ack: Logistics + Floor".</sub> | <img src="media/teardown/15-kiosk-flagged.png" alt="Kiosk flagging a changed job"><br><sub>**The floor kiosk.** The old and new spec side by side, and one button: *Acknowledge change*.</sub> |

> [!IMPORTANT]
> **Honest read.** The product works and the mechanic is enforced, but nothing here has been tested with a paying customer. The biggest unknowns are how often this failure happens and what each incident costs. Everything in Parts IV and VI is a plan for finding out, not a result.

<sub>Client names in the screenshots (Indian Railways, Bharat Forge, BHEL and others) are illustrative demo data chosen to look realistic. None of them is a customer or has any connection with Traackly.</sub>

---

## Part I. Problem, customer and opportunity

### 1. The problem

For a year I worked in client operations at a mid-size manufacturer in India. Every client order took the same route: the order desk, then the founder's office for approval, then supply and logistics, then the production floor. All of it ran on email threads and phone calls.

One order, for a railway contractor, needed brush holders, slip rings and commutators. After approval, the spec changed. Each edit was approved somewhere in the email chain. The final version never reached Production, and the floor built to the outdated spec for weeks before anyone noticed. **CONFIRMED**

```mermaid
flowchart LR
    A[Order desk raises order] --> B[Founder's office approves]
    B --> C[Logistics plans]
    C --> D[Floor builds v1]
    B -. spec edit approved by email .-> E[Edit lives in a reply thread]
    E -. never forwarded .-x D
    D --> F[Weeks of work on the old spec]
    F --> G[Rework and late delivery]
    style E fill:#FFF4CC,stroke:#FFCB00
    style G fill:#FFE1E1,stroke:#E2445C
```

When I asked the production team about it, they said it happens. **CONFIRMED** That was the most worrying signal: a failure everyone quietly absorbs never builds the pressure needed to fix it.

| Cost of the failure | Status |
|---|---|
| Rework on the order and a late delivery | **CONFIRMED** for this incident |
| How often it happens | **OPEN QUESTION** |
| Cost per incident, in rework hours or days of delay | **OPEN QUESTION**, the top item to validate |

### 2. Root cause

Every person in the chain did their job correctly by their own view of the thread. **The failure was structural:** nothing forced the current state of a request to travel with it.

```mermaid
flowchart TD
    R((Built to the<br/>wrong spec))
    A[No single record of the order] --> R
    B[Approval and execution are separate threads] --> R
    C[Notifications are optional to read] --> R
    D[The floor has no login and no inbox] --> R
    E["'It happens' is treated as normal"] --> R
    style R fill:#FFE1E1,stroke:#E2445C
```

Two things follow from this diagnosis:

1. **Training won't fix it.** Nobody made a mistake, so there is no behaviour to correct.
2. **More notifications won't fix it.** The emails were sent. Nothing required anyone to act on them.

### 3. Personas

| | **The Coordinator** (primary) | **The floor supervisor** (secondary) | **The founder's office** (buyer) |
|---|---|---|---|
| Role | Raises client orders and routes them across departments | Runs a department's jobs on the shop floor | Approves orders; pays for rework when they go wrong |
| Tech comfort | Fluent; already uses supply and logistics software **CONFIRMED** | Works at a shared screen, not a personal computer **CONFIRMED** | Comfortable with business software **ASSUMPTION** |
| Pain today | Orders get edited mid-flight; no way to confirm the final version reached the floor | Can't tell whether the spec in hand is the latest one | Late deliveries and rework that no one escalated |
| Needs from Traackly | One live board; no more chasing | Today's spec, clearly flagged when it changed; no extra admin | Confidence that the floor builds what was approved |
| Demo persona | Meera Iyer | Sunil Patil (Production) | Founder's Office |

> [!NOTE]
> **The detail that shaped the product.** Kiosk screens are stationed per department, not per person. **CONFIRMED** Most project tools assume one person, one login, one desk. On a factory floor that assumption breaks: most of the people who need to see a change never sit at a computer.

### 4. Jobs to be done

| Who | Job to be done | Today's workaround | How Traackly does the job |
|---|---|---|---|
| Coordinator | "Get this request to the right team, correctly, and not have to chase it later." | Email, phone calls, follow-ups | A structured request on one live board |
| Authorizer | "Approve fast, and fix a request without restarting the process." | Reply-all with corrections | Approve, edit or decline in one panel; edits are logged and flagged automatically |
| Logistics | "Plan against the real spec, not an old one." | Re-read the whole thread | Changed requests jump to the top of the queue; re-confirming the timeline is the acknowledgment |
| Floor supervisor | "Know exactly what to build, and know when it changed." | Printed sheet, word of mouth | A kiosk job card with the spec, a barcode and a clear CHANGED flag |

### 5. Why now

**ASSUMPTION**, from the PRD, not yet backed by external sources:

- Manufacturing SMBs have already adopted digital tools for payments, accounting and inventory.
- The layer that connects departments, the thing that tracks a request as it moves between teams, has lagged behind.
- So the gap is one of timing, not technology: the digital literacy is already there (the Coordinator uses supply software every day), but nothing affordable targets the handoff.

> [!WARNING]
> The market-shift claims above are reasoning, not data. The PRD flags them as an **OPEN QUESTION** to source before any external pitch. They're kept out of the README and the case study for that reason.

### 6. Opportunity and market sizing

**OPEN QUESTION.** I haven't sized the market, and I won't put a number here that I can't defend. This is the method I'd use, bottom up:

| Step | What to count | Where the data would come from |
|---|---|---|
| 1. Segment | Manufacturers in the beachhead sub-sector (for example electrical and rotating-machine parts) in one industrial cluster | Industry association member lists, government MSME registries |
| 2. Fit filter | Those that build to client spec and run 3+ departments, with a separate production floor | Interviews, association surveys |
| 3. Pain filter | Those that had at least one order built to an outdated spec in the last year | Phase 0 validation interviews |
| 4. Value | Sites × the price a site would pay, anchored to the cost of one reworked order | Pilot pricing tests |

Serviceable market is step 3 × step 4 within the cluster. The cluster comes first because one good pilot can travel by referral there.

---

## Part II. Positioning and product strategy

### 7. Positioning and category

> **For** coordinators and owners at mid-size manufacturing companies
> **who** route client orders across departments over email and phone,
> **Traackly is** a live request board for the whole company, from the order desk to the shop floor,
> **that** makes every change made after approval reach the people building the job, and blocks work until they've acknowledged it.
> **Unlike** email threads and desk-first project tools like monday.com, Asana and Trello,
> **Traackly** reaches the factory floor through shared department kiosks, so the people who never log in still see the latest spec.

**Category: a request and handoff layer for manufacturing.** Against "project management", Traackly is a short feature list next to giants. Against "the email thread that built the wrong order", it's the only thing in the room that closes the gap.

```mermaid
quadrantChart
    title Where each tool sits
    x-axis Built for the desk --> Built for the floor
    y-axis Notifies on change --> Enforces acknowledgment
    quadrant-1 Traackly's space
    quadrant-2 Configurable enforcement
    quadrant-3 Desk tools that notify
    quadrant-4 Floor reach, no rule
    Email and WhatsApp: [0.35, 0.08]
    Trello: [0.2, 0.18]
    Asana: [0.15, 0.25]
    monday.com Pro: [0.25, 0.6]
    Freshservice: [0.3, 0.45]
    Traackly: [0.85, 0.9]
```

<sub>Placement is my reading of the sourced facts in [Part III](#part-iii-competitive-landscape), not a measured score.</sub>

### 8. Value proposition canvas

| Customer profile | | Value map | |
|---|---|---|---|
| **Jobs** | Get an order built right, on time, without chasing | **Products and services** | Live boards per role, floor kiosk, append-only change log |
| **Pains** | Specs change silently; rework; late delivery; blame between teams | **Pain relievers** | Changes turn the request **Updated**; work is blocked until acknowledged; who changed what is logged forever |
| **Gains** | Fewer calls; proof of what was approved and when; a floor that trusts its sheet | **Gain creators** | One board instead of the inbox; the floor sees the old and new spec side by side; no logins to manage for floor staff |

### 9. The one rule

> **Every edit made after approval must be acknowledged by whoever works on it next, before that work can continue.**

| Option | What happens | Why not |
|---|---|---|
| "Just notify everyone" | The change is announced | Notifications are what failed. The emails were sent; nobody had to act on them. |
| "Send every change back for approval" | The change is re-approved | Rebuilds the approval bottleneck and slows every change |
| **Acknowledge before continuing** | The next person must confirm they've seen the change before their work can move | **The narrowest fix.** Approvals stay fast, and no one downstream can work on a version they haven't seen. |

The rule is enforced by the server, below the HTTP layer, so it can't be skipped by clicking around the screen.

```mermaid
sequenceDiagram
    autonumber
    participant A as Authorizer
    participant T as Traackly server
    participant L as Logistics
    participant K as Floor kiosk
    A->>T: Edit an approved request
    T->>T: Log each changed field (old → new), set status Updated
    T-->>L: Notify, and jump the request to the top of the queue
    T-->>K: Flag the job as CHANGED (if it has reached the floor)
    K->>T: Mark done
    T--xK: 409 blocked: acknowledgment pending
    L->>T: Re-confirm timeline (acknowledges)
    K->>T: Acknowledge change
    T-->>K: Job is actionable again
```

### 10. Feature to benefit map

| Feature | What it does | Benefit to the customer | Message pillar |
|---|---|---|---|
| Acknowledgment gate | Blocks *Mark in progress* and *Mark done* until downstream owners acknowledge | Nobody builds to a stale spec | Every change reaches the floor |
| Field-by-field change log | Records each changed field with its old and new value; append-only | Proof of what changed, when and by whom | Trust layer |
| Live boards per role | Each role sees its own queue, updated in about a second | Nobody chases anyone | One live board instead of the inbox |
| Department kiosk | One shared screen per department, big type, barcodes, no logins | The floor sees today's spec without anyone managing accounts | Built for the shop floor |
| Offline acknowledgment queue | A tap made offline syncs when the connection returns | Works on a floor with patchy Wi-Fi | Built for the shop floor |
| Conflict protection | A second simultaneous save is stopped and shown the latest version | No silent overwrites | Trust layer |
| Invite-only roles | Every route checks the role on the server | Access matches the org chart | Trust layer |

### 11. Request lifecycle

```mermaid
stateDiagram-v2
    [*] --> Raised: Coordinator raises
    Raised --> Authorization: Authorizer approves
    Raised --> Declined: Declined with a reason
    Authorization --> InProgress: In the same step
    InProgress --> Updated: Edited after approval
    Updated --> InProgress: Every downstream owner acknowledged
    InProgress --> Completed: Floor marks done
    Updated --> Updated: Mark done refused (409)
    Completed --> [*]
    Declined --> [*]
    InProgress: In progress
```

The **Updated** state is the product. Everything else on the board exists to make it visible.

### 12. Scope: what's in, what's out

| In the MVP | Deliberately out (from the PRD) | Why it's out |
|---|---|---|
| Request creation and routing | Multi-language support | Not needed to prove the rule; deferred to v2 |
| Authorization with automatic edit logging | Client-facing status portal | Internal handoffs first; external visibility later |
| Downstream notification and change log | Analytics and trend reporting | The dashboard is real-time status, not BI |
| Kiosk with job cards, barcodes and acknowledgment | Integrations (accounting, ERP) | Prove the rule before connecting it to anything |
| Coordinator status dashboard | Pricing and billing | No price until pilots measure the value |

> [!TIP]
> **Scope discipline was the hardest call.** A solo build has no second person to catch drift. Every feature had to pass one test: does it help prove the one rule works?

---

## Part III. Competitive landscape

### 13. Competitive set and method

The PRD named four tools that a manufacturer would try first: **monday.com, Asana, Trello and Freshservice**. The real incumbent is **email and WhatsApp**, so it's in the comparison too.

**Method.** Vendor pricing pages, help centres and terms, accessed **14 October 2026**. Community-forum answers are labelled *(forum)*. Anything I couldn't confirm is marked *Not verified*. Prices are USD per seat per month, billed annually. The full teardown with every source link is [here](product-marketing/competitive-teardown.md).

### 14. Capability comparison

| Need | **Traackly** | Email / WhatsApp | monday.com | Asana | Trello | Freshservice |
|---|---|---|---|---|---|---|
| One record per order | 🟢 | 🔴 | 🟢 | 🟢 | 🟢 | 🟢 |
| Approval step | 🟢 Built in | 🔴 | 🟡 Status column + automations | 🟢 Advanced+ | 🟡 Power-Ups | 🟢 Rich chains |
| Notify on change after approval | 🟢 Automatic | 🟡 If someone remembers | 🟢 Automations | 🟢 Rules | 🟢 Automation | 🟢 Workflow Automator |
| **Block work until acknowledged** | 🟢 **By default** | 🔴 | 🟡 **Approximable on Pro**, per board | 🔴 Dependencies only warn *(forum)* | 🔴 Can only move the card back afterwards | 🟡 Gates automation, not manual status changes |
| Field-level history kept | 🟢 Permanent, append-only | 🔴 | 🟡 1 week to 5 years by plan | 🟡 Audit API Enterprise+, 90 days | 🟡 Field detail Not verified | 🟡 Audit log Enterprise, 6 months |
| Shared floor screen, no per-person login | 🟢 Department kiosk | 🔴 | 🔴 Viewers are read-only | 🔴 Terms forbid account sharing | 🔴 Logins are personal | 🔴 Terms forbid sharing; kiosk is for raising tickets |

<sub>🟢 meets the need · 🟡 partly, or with setup · 🔴 doesn't. Sources in [the full teardown](product-marketing/competitive-teardown.md#sources).</sub>

### 15. The cost of reaching the floor

An illustrative site: **5 office users and 40 floor workers**, each of whom must be able to acknowledge a change. My arithmetic from list prices, not vendor quotes.

| Tool and tier | Seats needed | Monthly cost | Blocks until acknowledged? |
|---|---|---|---|
| monday.com Pro ($19) | 45 | about **$855** | Approximately, with per-board setup |
| Asana Advanced ($24.99) | 50 (sold in tens) | about **$1,250** | No |
| Trello Premium ($10) | 45 | about **$450** | No |
| Freshservice Growth ($49) | 45 agents | about **$2,205** | Partially |
| **Traackly** | 5 office logins + department kiosks | Not yet priced | **Yes, by default** |

> [!IMPORTANT]
> **The insight.** At every incumbent, the cost of an acknowledgment chain grows with headcount, and the people driving that cost are floor workers who rarely touch a computer. That makes per-seat pricing a weakness I can position against, and it's why the pricing hypothesis in [19](#19-pricing-hypothesis) is per site, not per seat.

### 16. Where incumbents win

A fair teardown says where we lose:

- **Breadth.** All four run projects, timelines and portfolios. Traackly does one job.
- **Approval depth.** Freshservice's parallel approval groups and rules (everyone, anyone, majority) are richer than Traackly's single Authorizer step.
- **monday.com can get close.** A capable admin on Pro can build a reasonable imitation of the rule, board by board.
- **Ecosystems.** Thousands of integrations and marketplaces. Traackly has none yet.
- **Trust and security.** Years of enterprise investment, AI features and brand recognition.
- **Price for office-only teams.** If nobody on the floor needs access, Trello at $5 and the free tiers are hard to beat.

### 17. Claims we can and can't make

| ✅ Can say (sourced) | ❌ Must not say |
|---|---|
| "Traackly makes acknowledging post-approval changes the default behaviour, not a configuration project." | That incumbents "can't" block work at all. monday.com Pro can approximate it. |
| "Your floor doesn't need a login per worker: one shared screen per department." | That incumbents "lose your history". Some retention limits are Not verified. |
| "Every change is kept permanently, field by field, and the history can't be rewritten." | Any "X% cheaper" figure. Traackly has no price yet. |

---

## Part IV. Go-to-market

### 18. ICP and beachhead

| Attribute | Profile | Basis |
|---|---|---|
| Industry | Discrete manufacturing that builds to client spec: engineering components, electrical parts, industrial spares | **CONFIRMED** for one company; **ASSUMPTION** for the segment |
| Size | Mid-size: a founder's office that approves orders, plus separate sales, logistics and production teams | **CONFIRMED** |
| Workflow today | Orders cross three or more departments over email and phone | **CONFIRMED** |
| Floor | Most production staff don't sit at a computer | **CONFIRMED** |
| Buying trigger | A recent order built to an outdated spec, or a client complaint about one | **ASSUMPTION** |
| Digital baseline | Already uses accounting or inventory software | **ASSUMPTION** |

**Who buys, who champions, who uses.** The founder's office or plant head pays, because the cost of rework lands on them. The Coordinator champions it day to day. Logistics and the floor use it, and must never feel it as extra work.

**Beachhead (ASSUMPTION):** India first, one industrial cluster, one sub-sector. I know the workflow and vocabulary of this segment first-hand, clustered manufacturers talk to each other, and one sub-sector means one set of example orders for every demo. Geography itself is an **OPEN QUESTION** in the PRD.

### 19. Pricing hypothesis

**ASSUMPTION, to test in pilots: price per site and per department kiosk, not per user.**

| Principle | Reasoning |
|---|---|
| Don't charge per seat | Per-seat pricing punishes exactly the people Traackly reaches: floor staff who never log in. They'd be the first thing a buyer cuts. |
| Unlimited office users, a fee per kiosk | Matches how value is created: every department that sees the latest spec |
| Anchor to the cost of one reworked order | If one wrong build costs more than a year of Traackly, the decision is easy. That makes cost per incident the most important number to measure. |
| Price after the pilot, not before | Use willingness-to-pay questions in pilot interviews (for example, a Van Westendorp price-sensitivity survey) rather than guessing |

### 20. Channels

| Phase | Channel | Why | Status |
|---|---|---|---|
| Design partners | Founder-led outreach through personal manufacturing contacts | Trust beats reach for the first 3 shops | **ASSUMPTION** |
| Early growth | Industry associations and trade fairs in the cluster | Owners gather there; a live kiosk demo shows the rule in 30 seconds | **ASSUMPTION** |
| Early growth | LinkedIn content: the railway-order story, the one rule, pilot results | Builds credibility with owners and plant heads before sales calls | **ASSUMPTION** |
| Scale | Accounting and ERP implementation consultants | Trusted advisers already in the building; Traackly doesn't compete with what they sell | **ASSUMPTION** |
| Scale | Referrals with a written case study | One manufacturer vouching for another beats any ad | **ASSUMPTION** |

All channels get ranked by cost per qualified conversation once tested.

### 21. Launch phases

```mermaid
gantt
    title Illustrative launch plan (dates are a sketch, not a commitment)
    dateFormat YYYY-MM-DD
    axisFormat %b %Y
    section 0. Validate
    Validation interviews (frequency, cost per incident) :p0, 2026-11-02, 4w
    section 1. Design partners
    Free pilots, 1 to 3 manufacturers, one product line  :p1, after p0, 8w
    section 2. First proof
    Case study and reference call                        :p2, after p1, 4w
    First paid conversion                                :milestone, after p2, 0d
    section 3. Repeat
    Cluster sales via associations, events, referrals    :p3, after p2, 12w
```

| Phase | Exit criteria |
|---|---|
| **0. Validate** | Frequency and cost per incident estimated; at least 3 of 5 interviewees describe it as recurring |
| **1. Design partners** | Kiosk in daily use; primary metric measured against the email baseline |
| **2. First proof** | One partner converts to paid; one agrees to be a public reference |
| **3. Repeat** | Same pitch, same demo, a predictable sales cycle |

### 22. Experiments backlog

| # | Hypothesis | Test | Success signal | Priority |
|---|---|---|---|---|
| E1 | Post-approval changes go missing often enough to matter | 5–8 interviews with operations people at manufacturers | 3 of 5 describe a recurring incident and can estimate its cost | 🔴 First |
| E2 | Floor supervisors can acknowledge a change without training | Hallway test of the kiosk with 3 supervisors | Each acknowledges a change in under 10 seconds, unprompted | 🔴 First |
| E3 | Owners respond to the cost of rework more than to "visibility" | Two LinkedIn post variants: rework cost vs. visibility | Higher reply rate from owners and plant heads | 🟡 Next |
| E4 | A live kiosk demo converts better than slides at trade fairs | Stand demo vs. brochure conversations | More follow-up meetings booked per conversation | 🟡 Next |
| E5 | Per-site pricing beats per-seat in buyer perception | Price-sensitivity questions in pilot exit interviews | Buyers name per-site as fairer, unprompted | 🟢 Later |
| E6 | Consultants will refer Traackly | Offer 3 ERP consultants a referral fee | One qualified intro within 60 days | 🟢 Later |

### 23. Risks and deliberate non-decisions

| Risk | Mitigation |
|---|---|
| The problem is real but too rare to pay for | Phase 0 measures frequency and cost before any selling |
| The floor sees acknowledgment as extra admin | One tap, and only on changed jobs; test kiosk usability in phase 1 |
| Teams keep email running alongside Traackly | The Coordinator dashboard must save chasing time from week one; track the share of orders raised in Traackly |
| "We'll just build this in monday.com" | Show the floor problem: every acknowledging worker needs a paid seat, and the block is a per-board configuration project |

> [!NOTE]
> **Deliberate non-decisions.** Some questions are left open on purpose, because answering them now would mean inventing data:
> - **Price.** Not set until pilots measure the cost of one reworked order.
> - **Geography.** India first is a recommendation, not a decision.
> - **Market size.** A method, not a number (see [6](#6-opportunity-and-market-sizing)).
> - **Integrations.** None until the rule is proven on its own.

---

## Part V. Brand and messaging system

### 24. Brand idea and identity

**Brand idea: Nothing changes silently.** Every brand choice points back to the moment a change is acknowledged.

<img src="brand/brand-sheet.png" alt="Traackly brand sheet: logo on light and dark, icon sizes, colours" width="880">

| Element | Choice | Why |
|---|---|---|
| The mark | A lowercase "t" whose crossbar becomes an amber tick | It says the name and the product's one rule at once: every edit, acknowledged |
| Wordmark | **traackly**, lowercase, with the double **aa** in blue | Makes the unusual spelling stick |
| Acknowledge Amber `#FFCB00` | The tick, and "changed, needs acknowledgment" in the app | The brand colour and the product's most important state are the same thing |
| Traackly Blue `#0073EA` | Symbol tile, primary actions | Familiar, trustworthy work-tool blue |
| Done Green `#00C875` | Completed work | Universal "done" |
| Kiosk Navy `#181B34` | The floor kiosk's dark, high-contrast mode | Readable from a distance on a bright floor |
| Type | Poppins for the wordmark and headings, Figtree for the interface | Friendly and geometric, legible at kiosk sizes |

Full usage rules are in the [brand kit](brand).

### 25. Message house

**Umbrella:** *Nothing changes silently.*

| Pillar | What we say | Proof in the product |
|---|---|---|
| **Every change reaches the floor** | A spec that changes after approval is flagged to Logistics and the floor, and work can't be marked done until they've acknowledged it | The server refuses *Mark in progress* and *Mark done* until each downstream owner acknowledges |
| **One live board instead of the inbox** | Everyone sees the current state of every request | One board per role, updating in about a second |
| **Built for the shop floor, not the desk** | One shared screen per department: big buttons, barcodes, no logins | Station-linked kiosks; acknowledgments queue offline |

**Trust layer under all three:** the change log can't be rewritten, two people editing at once can't overwrite each other, and access is invite-only by role.

| Audience | Lead with |
|---|---|
| Owner / founder's office | "The order your floor builds is always the order you approved, including the changes." |
| Coordinator | "Raise it once. See where it is. Stop chasing." |
| Logistics | "Every change lands on your queue; confirming the timeline is your acknowledgment." |
| Floor supervisor | "The screen shows today's spec. If it changed, it tells you before you build." |

### 26. Voice

| We sound like | We don't sound like |
|---|---|
| A plant head who's seen it go wrong | A SaaS landing page |
| order, job, spec, change, the floor, acknowledge | workflow orchestration, synergy, single pane of glass |
| "built to the wrong spec" | "spec propagation inefficiency" |
| "acknowledge" (one deliberate tap) | "approve again" (it isn't a re-approval) |
| brush holders, slip rings, a railway order | tasks, tickets, projects |

**Taglines:** *Every request, from order desk to shop floor.* (primary) · *Every edit. Acknowledged.* (the rule in three words) · *Nothing changes silently.* (the promise)

### 27. Content and launch assets

| Asset | Purpose | Where |
|---|---|---|
| Homepage | First impression; the rule and the roles in one scroll | In the app, `/` |
| 5:54 narrated walkthrough | The whole product in motion, with chapters | [WALKTHROUGH.md](../WALKTHROUGH.md) |
| 30-second cut (16:9) and LinkedIn cut (4:5) | Social and outreach | [traackly-30s.mp4](media/traackly-30s.mp4), [traackly-30s-linkedin.mp4](media/traackly-30s-linkedin.mp4) |
| One-page case study | Applications and leave-behinds | [case-study.pdf](case-study.pdf) |
| README case study | The repo's front door | [README](../README.md) |
| This teardown | The full reasoning, for anyone who wants depth | You're here |

---

## Part VI. Metrics, funnel and objectives

### 28. North star and instrumentation

**North star: the share of post-approval edits acknowledged before work continues.** The railway order is a real-world 0%. The target is as close to 100% as possible.

```mermaid
flowchart TD
    NS["North star<br/>% of post-approval edits acknowledged<br/>before work continues"]
    NS --> A["Time to acknowledge<br/>(edit → acknowledgment)"]
    NS --> B["Orders raised in Traackly<br/>vs. over email"]
    NS --> C["Kiosk acknowledgments<br/>per changed job"]
    A --> T1[(Edit timestamp)]
    A --> T2[(Acknowledgment timestamp)]
    C --> T2
    style NS fill:#E5F1FD,stroke:#0073EA
```

| Input | Instrumentation status |
|---|---|
| Edit timestamp, per field | 🟢 Recorded in the append-only change log |
| Acknowledgment timestamp, per owner | 🟢 Recorded on every acknowledgment |
| Share of orders raised in Traackly vs. email | 🔴 Needs a baseline count from the pilot site |
| Cost per incident | 🔴 Needs interviews; the product can't measure it |

> [!TIP]
> Both product metrics come from **two timestamps the product already records**. That was a PRD decision: keep instrumentation minimal so the metrics can be shown in a prototype, before any live deployment.

**Time to acknowledge** only means something under real production load. **ASSUMPTION** A fast acknowledgment on a quiet day can hide the real risk, so it needs measuring on a busy week, not a quiet one.

### 29. Pilot adoption funnel

Targets are **ASSUMPTIONS** to calibrate in the first pilot.

```mermaid
flowchart LR
    A[Site signed up] --> B[Team invited<br/>and kiosks linked]
    B --> C[First request raised<br/>in week 1]
    C --> D[First change acknowledged<br/>on the floor]
    D --> E[Most new orders<br/>raised in Traackly]
    E --> F[Converts to paid]
```

| Stage | Metric | What "good" looks like (hypothesis) |
|---|---|---|
| Setup | Kiosks linked per department | Every department with a floor has a kiosk in week 1 |
| Activation | Days to the first request raised | Within the first week |
| Aha moment | First change acknowledged on the floor | Within the first two weeks |
| Habit | Share of new client orders raised in Traackly | Most of them by week 6 |
| Floor engagement | Acknowledgments per changed job | Every changed job, none bypassed |
| Outcome | Orders built to an outdated spec | Zero during the pilot |
| Revenue | Pilot to paid | One of the first three partners |

### 30. First-quarter OKRs

```mermaid
flowchart TD
    O["Objective<br/>Prove the one rule is worth paying for"]
    O --> K1["KR1: 5+ validation interviews,<br/>with cost per incident estimated"]
    O --> K2["KR2: 1 pilot live with a<br/>daily-use kiosk"]
    O --> K3["KR3: Acknowledgment rate measured<br/>against the email baseline"]
    O --> K4["KR4: 1 written case study<br/>with a named reference"]
    style O fill:#FFF4CC,stroke:#FFCB00
```

Why KR1 comes before KR2: there's no point running a pilot if interviews show the problem is rare. The interviews also produce the cost-per-incident number that the pricing depends on.

---

## Part VII. Product experience and screen flow

### 31. End-to-end screen flow

```mermaid
flowchart TD
    H[Homepage] --> L[Log in, invite-only]
    L --> C[Coordinator board]
    L --> AQ[Authorization queue]
    L --> LQ[Logistics queue]
    SL[Station link from the Authorizer] --> K[Department kiosk]
    C -->|New request| AQ
    AQ -->|Approve| LQ
    LQ -->|Save timeline| K
    AQ -->|Edit after approval| U{{Updated}}
    U --> LQ
    U --> K
    K -->|Acknowledge change| D[Mark done]
    D --> C
    style U fill:#FFF4CC,stroke:#FFCB00
```

```mermaid
journey
    title A floor supervisor's day with a changed job (expected experience, ASSUMPTION)
    section Start of shift
      Open the kiosk queue: 4: Supervisor
      See one job flagged CHANGED: 3: Supervisor
    section The change
      Read the old and new spec side by side: 4: Supervisor
      Tap Acknowledge change: 5: Supervisor
    section Finish
      Build to the new spec: 5: Supervisor
      Mark done: 5: Supervisor
```

### 32. Screen by screen

Each screen has the same three notes: what it's for, what it gets right, and what I'd change next.

#### Homepage

<img src="media/teardown/01-homepage.png" alt="Traackly homepage" width="880">

- **For:** a first-time visitor, usually an owner or plant head.
- **Gets right:** the headline names the scope (order desk to shop floor), and the hero board shows an **Updated** row in amber, so the rule is visible before any reading.
- **I'd change:** the industry strip lists sectors, not customers. After a pilot it should carry a real logo and one number.

#### Log in

<img src="media/teardown/02-login.png" alt="Log in page" width="880">

- **Gets right:** it says what kind of product this is ("Accounts are invite-only… Floor kiosks connect with a station link"), which answers the "do my floor staff need accounts?" objection on the login screen itself.
- **I'd change:** add an SSO option for owners who live in Google Workspace.

#### Coordinator board

<img src="media/teardown/03-coordinator-board.png" alt="Coordinator board grouped by stage" width="880">

- **For:** the Coordinator, the daily champion.
- **Gets right:** the changed order is pinned at the top in amber, with "Awaiting ack: Logistics + Floor", so the one thing that needs attention is impossible to miss.
- **I'd change:** a daily digest email for Coordinators who don't keep the board open.

| | |
|---|---|
| <img src="media/teardown/04-filter.png" alt="Quick filters"><br><sub>**Filter.** Status, department and priority filters, monday-style.</sub> | <img src="media/teardown/05-kanban.png" alt="Kanban view"><br><sub>**Kanban.** The same requests as cards, for people who think in columns.</sub> |
| <img src="media/teardown/06-new-request.png" alt="New request form"><br><sub>**New request.** Client, requirement, department and priority. The form says up front that changes after approval are flagged.</sub> | <img src="media/teardown/07-bulk-select.png" alt="Bulk selection"><br><sub>**Bulk select.** Export several requests at once.</sub> |

#### Authorizer

| | |
|---|---|
| <img src="media/teardown/08-authorizer-queue.png" alt="Authorization queue"><br><sub>**Authorization queue.** Everything awaiting review, in one group.</sub> | <img src="media/teardown/09-review-panel.png" alt="Review panel"><br><sub>**Review.** Approve, decline with a reason, or correct the request first.</sub> |
| <img src="media/teardown/10-team.png" alt="Manage team"><br><sub>**Team.** Invite-only access by role; deactivating someone ends their sessions.</sub> | <img src="media/teardown/11-kiosk-link.png" alt="Kiosk station link"><br><sub>**Kiosk stations.** One station link per department, shown once and treated like a password (blurred here).</sub> |

- **Gets right:** approving is one click, so the rule doesn't slow the Authorizer down. The rule only costs anything when something changes.
- **I'd change:** approval rules beyond a single Authorizer (for example, a second approver above an order value). Freshservice does this well today.

#### Editing after approval

<img src="media/teardown/16-edit-warning.png" alt="Edit warning before saving a change" width="880">

- **Gets right:** before saving, the Authorizer is told exactly what will happen: the request turns Updated, every changed field is logged, and Logistics and the floor must acknowledge. No surprises.
- **I'd change:** let the Authorizer add a one-line reason for the change, shown on the kiosk.

#### Logistics

| | |
|---|---|
| <img src="media/teardown/12-logistics-queue.png" alt="Logistics queue"><br><sub>**Logistics queue.** "Changed after authorization — review & revise timeline" sits above new work.</sub> | <img src="media/teardown/13-set-timeline.png" alt="Set timeline"><br><sub>**Set timeline.** Saving the date sends the job to the department's kiosk.</sub> |

- **Gets right:** re-confirming the timeline *is* the acknowledgment, so Logistics gets no extra step.

#### The floor kiosk

| | |
|---|---|
| <img src="media/teardown/14-kiosk-queue.png" alt="Kiosk job queue"><br><sub>**Job queue.** "1 changed — review before continuing". The changed job is outlined in amber.</sub> | <img src="media/teardown/15-kiosk-flagged.png" alt="Kiosk flagged job"><br><sub>**Flagged job.** Old spec struck through, new spec in green, and one red button.</sub> |

- **For:** the floor supervisor at a shared screen.
- **Gets right:** dark, high-contrast, big type, a barcode on every job, a name-or-badge field instead of a login, and an offline queue for acknowledgments.
- **I'd change:** test it with real supervisors before adding anything ([E2](#22-experiments-backlog)). Language support (Hindi, Marathi and others) is the most likely first request, and the PRD defers it to v2.

#### The change log

<img src="media/teardown/17-activity-log.png" alt="Activity log with before and after" width="880">

- **Gets right:** each changed field shows the old value struck through and the new one in green, with who and when. It's append-only at the database level, so it can't be rewritten.
- **I'd change:** a printable change summary for client disputes.

#### Mobile

<img src="media/teardown/18-mobile-board.png" alt="Coordinator board on a phone" width="300">

- **Gets right:** the Coordinator's board works on a phone, for the moments they're away from the desk.

### 33. Design decisions

| Decision | Alternative considered | Why this way |
|---|---|---|
| Board-style UI borrowed from monday.com's design language | A custom, minimal interface | Coordinators may already know this pattern, so there's less to learn |
| A separate dark kiosk mode | The same UI on a bigger screen | Distance, glare and gloves are a different context from a desk |
| Amber = "changed, needs acknowledgment", everywhere | Red for changes | Red means error. A change isn't an error, it's something to read. |
| Disable the button *and* refuse on the server | UI-only blocking | A UI rule can be bypassed. The promise only holds if the server enforces it. |
| No per-person login on the floor | Individual floor accounts | That's the assumption that breaks every incumbent on a floor-heavy site |

---

## Part VIII. Proof and close

### 34. What this project proves

| Skill a product marketing role needs | Evidence in this repo |
|---|---|
| Customer and problem discovery | A first-hand incident, framed with a root cause and every claim tagged ([PRD](product-marketing/PRD.md)) |
| Positioning | A positioning statement, a narrow category choice and a message house ([positioning](product-marketing/positioning.md)) |
| Competitive intelligence | Four vendors compared on pricing, docs and terms, with dated sources, including where they win ([teardown](product-marketing/competitive-teardown.md)) |
| Go-to-market planning | ICP, beachhead, pricing hypothesis, channels, phased launch ([GTM plan](product-marketing/gtm-plan.md)) |
| Messaging and content | Homepage, narrated walkthrough, social cuts, one-page case study |
| Brand | A logo that encodes the product's rule, a palette tied to product states ([brand kit](brand)) |
| Metrics thinking | A north star built from data the product already records |
| Working with product and engineering | A shipped, tested product built from my own PRD |
| Intellectual honesty | CONFIRMED / ASSUMPTION / OPEN QUESTION on every claim |

### 35. Interview stories (STAR)

**1. Turning a normalised failure into a product**
- **Situation:** At a manufacturer I worked for, an order was built to an outdated spec for weeks after a post-approval change never reached the floor.
- **Task:** Understand why, when everyone had done their job correctly.
- **Action:** I traced the failure to structure, not people: nothing forced the latest version to travel with the order. I wrote a PRD around one rule and tagged every claim by how well I knew it.
- **Result:** A working product that enforces the rule, plus an honest list of what still needs validating.

**2. Choosing the narrow fix**
- **Situation:** The obvious fixes were more notifications or re-approving every change.
- **Task:** Close the gap without slowing approvals down.
- **Action:** I compared the options and chose acknowledgment by the next person in the chain, enforced by the server.
- **Result:** Approvals stay one click; the only added step is a single tap, and only on changed jobs.

**3. A teardown that admits where we lose**
- **Situation:** It's tempting to claim incumbents "can't" do something.
- **Task:** Build a competitive story that would survive a sceptical buyer.
- **Action:** I checked pricing pages, help docs and terms of service, and found monday.com Pro can approximate the rule.
- **Result:** I repositioned around the floor: per-seat pricing and individual logins, which none of the four solves, and listed the claims we must not make.

**4. Shipping without an engineering team**
- **Situation:** I'm a marketer, not an engineer.
- **Task:** Prove the idea with something real, not slides.
- **Action:** I directed an AI coding assistant from my PRD, and made the product, design and brand calls myself.
- **Result:** A tested, CI-checked product and a full launch kit, built by one person.

### 36. Ownership and role

| I did | With help from |
|---|---|
| Found the problem and wrote the PRD: framing, personas, metrics, user stories, scope | |
| Defined the one rule and the kiosk model | |
| Directed the product, design and brand: board UI, kiosk, the "t-check" logo, homepage, video | An AI coding assistant (Claude Code) built the software and assets to my direction |
| Positioning, competitive teardown, GTM plan, this teardown | Research and drafting assisted by the same AI assistant; every claim checked against the PRD or a dated source |

> [!NOTE]
> I'm open about the AI-assisted build because it's part of the point: one product marketer can take an idea from a real problem to a shipped, tested product. The full engineering trail is in the repo for anyone who wants to check it.

### 37. Credibility checklist

- [x] The problem was seen first-hand, and the story is told without naming the company
- [x] Every claim is tagged CONFIRMED, ASSUMPTION or OPEN QUESTION
- [x] The core mechanic is enforced on the server and covered by an end-to-end test of the original incident
- [x] Competitor facts come from vendor pages and terms, dated 14 October 2026
- [x] The teardown says where incumbents win
- [x] No invented market size, revenue or customer numbers
- [ ] Validation interviews: frequency and cost per incident
- [ ] A pilot with one manufacturer
- [ ] A price, tested with buyers
- [ ] A named customer reference

### 38. What I'd do next: 30/60/90

| Days | Focus | Output |
|---|---|---|
| **0–30** | Validate | 5–8 interviews; cost per incident estimated; kiosk hallway test with 3 supervisors |
| **31–60** | Pilot | One manufacturer, one product line, kiosks in daily use; acknowledgment rate vs. email baseline |
| **61–90** | Prove | Pilot case study with real numbers; first pricing conversation; one reference call |

Multi-language support, a client portal and analytics stay deferred until the rule is proven, exactly as the PRD's roadmap says.

### 39. Closing note

> [!TIP]
> The most useful thing I learned from this project wasn't technical. It was the discipline of separating what I've seen from what I believe. The railway order is **CONFIRMED**. Almost everything about the market is still an **ASSUMPTION**. A good product marketer's job is to know which is which, say so out loud, and design the next step to find out.

---

## Sources

- **First-hand:** the railway-order incident and the per-department kiosks, as written in the [PRD](product-marketing/PRD.md) (August 2026).
- **Competitors:** vendor pricing pages, help centres and terms for monday.com, Asana, Trello and Freshservice, accessed 14 October 2026. Every link is in the [competitive teardown](product-marketing/competitive-teardown.md#sources).
- **Product:** screenshots from the shipped build, with demo data, captured 14 October 2026. Client names in them are illustrative.

<sub>Related: [README](../README.md) · [PRD](product-marketing/PRD.md) · [Positioning](product-marketing/positioning.md) · [Competitive teardown](product-marketing/competitive-teardown.md) · [GTM plan](product-marketing/gtm-plan.md) · [Walkthrough](../WALKTHROUGH.md) · [Technical overview](../TECHNICAL.md)</sub>
