# Traackly — go-to-market plan

How Traackly would reach its first customers. Like the [PRD](PRD.md), every claim is tagged: **CONFIRMED** (seen first-hand), **ASSUMPTION** (reasoned but untested) or **OPEN QUESTION** (needs data). Nothing here has been tested with paying customers yet. This is the plan for finding out.

## 1. Ideal customer profile

| Attribute | Profile | Basis |
|---|---|---|
| Industry | Discrete manufacturing that builds to client spec: engineering components, electrical parts, industrial spares | **CONFIRMED** for one company; **ASSUMPTION** for the wider segment |
| Size | Mid-size: a founder's office that approves orders, plus separate sales, logistics and production teams | **CONFIRMED** (the PRD's personas) |
| How work flows today | Client orders cross three or more departments over email threads and phone calls | **CONFIRMED** |
| Floor | Most production staff don't sit at a computer | **CONFIRMED** |
| Pain trigger | A recent order built to an outdated spec, or a client complaint about one | **ASSUMPTION**: the most likely moment to buy |
| Digital baseline | Already uses accounting or inventory software, so the team is comfortable with tools | **ASSUMPTION** (the PRD's "why now") |

**Who buys, who uses.** The founder's office or plant head pays (the cost of rework lands on them). The Coordinator champions it day to day. Logistics and the floor are users who must not see it as extra work.

## 2. Beachhead

**OPEN QUESTION:** India first, or broader. The PRD leaves geography open.

**Recommendation (ASSUMPTION):** start in India, in one industrial cluster, in one sub-sector (for example, makers of electrical and rotating-machine parts). The reasons:

- The founder knows the workflow and language of this exact segment first-hand.
- Clustered manufacturers talk to each other, so one good pilot can travel by referral.
- One sub-sector means one set of example orders and one vocabulary, which makes demos land.

## 3. Pricing hypothesis

**ASSUMPTION, to be tested in pilots:** price **per site and per department kiosk, not per user**.

- Per-seat pricing punishes exactly the people Traackly is built to reach: floor staff who never log in. Charging per seat would make the floor the first thing a buyer cuts.
- Per site: unlimited office users, plus a fee for each department kiosk. That matches how the value is created (every department that sees the latest spec).
- **Anchor the price to the cost of one reworked order, not to software benchmarks.** If a single wrong build costs more than a year of Traackly, the purchase is easy. Measuring that cost per incident is the PRD's top open question.
- Desk-first tools charge per seat ([competitive teardown](competitive-teardown.md)); per-site pricing is itself a point of difference.

## 4. Channels

| Phase | Channel | Why |
|---|---|---|
| Design partners | Founder-led outreach through personal manufacturing contacts | Trust matters more than reach for the first 3 shops; the founder has lived the problem |
| Early growth | Industry associations and trade fairs in the beachhead cluster | Owners of mid-size manufacturers gather there; a live kiosk demo on a stand shows the rule in 30 seconds |
| Early growth | LinkedIn content from the founder: the railway-order story, the one rule, pilot results | Tells the story to owners and plant heads; builds credibility before sales calls |
| Scale | Partnerships with accounting/ERP implementation consultants who already serve these companies | They're trusted advisers already in the building, and Traackly doesn't compete with what they sell |
| Scale | Referrals from pilot customers, with a written case study | One manufacturer vouching for another beats any ad |

All channels are **ASSUMPTIONS** to be ranked by cost per qualified conversation once tested.

## 5. Launch plan

| Phase | Goal | Exit criteria |
|---|---|---|
| **0. Validate** | Run the PRD's planned interviews with people who've lived this workflow | Frequency and cost per incident estimated; at least 3 of 5 interviewees say it's a recurring problem |
| **1. Design partners** | Free pilots with 1–3 manufacturers on one product line each, for 6–8 weeks | Kiosk in daily use; the primary metric measured against the email baseline |
| **2. First proof** | Turn pilot results into a case study and a reference call | One partner converts to paid; one agrees to be a public reference |
| **3. Repeat** | Sell into the same cluster via associations, events, LinkedIn and referrals | A repeatable sales motion: the same pitch, the same demo, a predictable cycle length |

## 6. Metrics

**Product (from the PRD):**
- **Primary:** share of post-approval edits acknowledged before work continues. Target: as close to 100% as possible.
- **Secondary:** time to acknowledge, measured under real production load.

**Adoption (pilots):**
- Activation: the first request raised, and the first change acknowledged on the floor, within the first week.
- Habit: share of new client orders raised in Traackly rather than over email.
- Floor engagement: kiosk acknowledgments per changed job; ideally every one, with none bypassed.

**Business (from phase 2):**
- Pilot-to-paid conversion, sales cycle length, and incidents of work built to an outdated spec (target: zero).

## 7. Risks

| Risk | Mitigation |
|---|---|
| The problem is real but not frequent enough to pay for | Phase 0 measures frequency and cost before any selling |
| The floor sees acknowledgment as extra admin | One tap, only on changed jobs; test kiosk usability in phase 1 |
| Teams keep using email alongside Traackly | The Coordinator dashboard must save them chasing time from week one; track the share of orders raised in Traackly |
| "We'll just set this up in monday.com" | Show the floor problem: those tools need a login per worker, and can't block work until a change is acknowledged (see the teardown) |
