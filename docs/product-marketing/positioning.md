# Traackly — positioning & messaging

How Traackly is positioned, what it says to each audience, and the proof behind every claim. It's built on the [PRD](PRD.md); claims that still need validation are marked **ASSUMPTION**.

## Positioning statement

> **For** coordinators and owners at mid-size manufacturing companies
> **who** route client orders across departments over email and phone,
> **Traackly is** a live request board for the whole company, from the order desk to the shop floor,
> **that** makes every change made after approval reach the people building the job, and blocks work until they've acknowledged it.
> **Unlike** email threads and desk-first project tools like monday.com, Asana and Trello,
> **Traackly** reaches the factory floor through shared department kiosks, so the people who never log in still see the latest spec.

## Category

**A request and handoff layer for manufacturing**, not a project-management suite.

The narrow category is deliberate. Against "project management" Traackly is a small feature list next to giants. Against "the email thread that built the wrong order" it's the only thing in the room that closes the gap.

## The message house

**Umbrella message:** *Nothing changes silently.*

| Pillar | What we say | Proof in the product |
|---|---|---|
| **Every change reaches the floor** | A spec that changes after approval is flagged to Logistics and the floor, and work can't be marked done until they've acknowledged it. | Requests turn **Updated**; *Mark in progress* and *Mark done* are refused by the server until each downstream owner acknowledges. |
| **One live board instead of the inbox** | Everyone sees the current state of every request, so nobody has to chase anyone. | One board per role, updating in about a second; the Coordinator's dashboard reflects every state change without a refresh. |
| **Built for the shop floor, not the desk** | Floor staff get one shared screen per department: big buttons, barcodes and no logins. | Department kiosks connected by a station link; large touch targets; acknowledgments queue offline and sync when the connection returns. |

**Trust layer under all three:** the change log can't be rewritten, two people editing at once can't overwrite each other, and access is invite-only by role.

## Messages by audience

| Audience | What they care about | Lead with |
|---|---|---|
| **Owner / founder's office** (economic buyer) | Rework, late deliveries, client trust | "The order your floor builds is always the order you approved, including the changes." |
| **Coordinator** (daily user, champion) | Not chasing people; not being blamed | "Raise it once. See where it is. Stop chasing." |
| **Logistics** | Timelines that match the real spec | "Every change lands on your queue; confirming the timeline is your acknowledgment." |
| **Floor supervisor** | Knowing exactly what to build; no extra admin | "The screen shows today's spec. If it changed, it tells you before you build." |

## Taglines and lines to reuse

- **Every request, from order desk to shop floor.** (primary tagline)
- **Every edit. Acknowledged.** (the rule, in three words)
- **Nothing changes silently.** (the promise)
- "A change nobody reads is a change nobody makes."

## Objections, and how we answer them

| Objection | Answer |
|---|---|
| "We already use email and WhatsApp; it works." | It works until a change goes missing. The railway order in the PRD was approved correctly at every step and still built wrong. The problem is structural, not personal. |
| "Why not monday.com or Asana?" | They assume every worker has a login and a desk. Most of your floor never will. Traackly reaches them through one shared screen per department. See the [teardown](competitive-teardown.md). |
| "Won't extra acknowledgments slow us down?" | Only changes made after approval need one; approvals themselves stay fast. One tap on the floor costs less than one reworked order. |
| "Our floor staff aren't tech people." | They don't need accounts. The kiosk is one shared screen with big buttons, and the only new action is "Acknowledge change". |

## Words we use, words we avoid

| Use | Avoid |
|---|---|
| order, job, spec, change, the floor, acknowledge | workflow orchestration, synergy, single pane of glass |
| "built to the wrong spec" | "spec propagation inefficiency" |
| "acknowledge" (one deliberate tap) | "approve again" (it isn't a re-approval) |
| concrete examples: brush holders, slip rings, a railway order | generic examples: tasks, tickets, projects |

## What still needs proof

- **ASSUMPTION:** that the problem is common across mid-size manufacturers, not just one company. Validate it with the interviews the PRD plans.
- **ASSUMPTION:** that owners will pay to remove rework risk. Validate it in a pilot, using the cost of a single reworked order as the anchor.
