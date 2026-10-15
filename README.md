<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/brand/traackly-logo-on-dark.svg">
  <img src="docs/brand/traackly-logo.svg" width="320" alt="Traackly">
</picture>

**Every request, from order desk to shop floor.**

At a manufacturer I worked for, an order was built to the wrong spec for weeks because a change made after approval never reached the floor.<br>
Traackly is the fix I designed and shipped.

<a href="https://traackly-demo.onrender.com"><img src="https://img.shields.io/badge/Try_the_live_demo-no_sign--up-0073EA?style=for-the-badge" alt="Try the live demo, no sign-up" height="36"></a>

<sub>Pick a role and click around: sample data, resets every few hours. If it's been idle, the first load takes about a minute.</sub>

[▶ Watch the walkthrough (5:54)](WALKTHROUGH.md) · [Read the product teardown](docs/product-teardown.md) · [See the customer research & roadmap](docs/research/customer-research-and-roadmap.pdf) · [Read the case study (PDF)](docs/case-study.pdf) · [Read the PRD](docs/product-marketing/PRD.md)

<a href="WALKTHROUGH.md"><img src="docs/media/walkthrough-preview.gif" width="880" alt="Traackly in 30 seconds: the homepage, a live request board, a new request, the change log, the floor kiosk flagging a change, and the completed request"></a>

<sub>A 30-second preview. Click it for the full walkthrough with voice-over.</sub>

</div>

## The problem I saw

For a year I worked in client operations at a mid-size manufacturer in India. Every client order travelled the same route: from the order desk, to the founder's office for approval, to supply and logistics, and finally to the production floor. All of it ran on email threads and phone calls.

One order, for a railway contractor, needed brush holders, slip rings and commutators. After it was approved, the spec changed. Each edit was approved somewhere in the email chain. The final version never reached Production. The floor built to the outdated spec for weeks before anyone noticed, and the order had to be reworked and delivered late.

Nobody had done anything wrong. Every person approved their slice of the thread correctly. **The failure was structural:** nothing forced the latest version of a request to travel with it.

When I asked the production team about it, they said it happens. It had become "how things work here", so nobody escalated it. A failure that everyone quietly absorbs never builds the pressure needed to fix it.

## The one rule

> **Every edit made after approval must be acknowledged by whoever works on it next, before that work can continue.**

Why this rule, and not the obvious alternatives:

- **"Just notify everyone."** Notifications are what failed. The emails were sent; nobody had to act on them.
- **"Make every change go back for approval."** That rebuilds the approval bottleneck and slows down every change.
- **Acknowledgment** is the narrowest fix. Approvals stay fast, but no one downstream can work on a version they haven't seen. The server enforces it, so it can't be skipped by clicking around the screen.

## How it works

1. **Raise.** A Coordinator raises a structured request: the client, the exact requirement, the department and the priority. It lands on one live board instead of in an inbox.
2. **Approve.** The Authorizer approves it, corrects it, or declines it with a reason.
3. **Schedule.** Logistics sets an estimated completion date, and the job appears on that department's floor kiosk.
4. **Build.** The floor works from one shared kiosk screen per department, with big type, big buttons and a barcode on every job. Floor staff don't need logins.
5. **Change, then acknowledge.** If the request is edited after approval, it turns **Updated**. Logistics and the floor are notified, *Mark done* stays locked until both have acknowledged, and every changed field is logged permanently with its old and new value.

| | |
|---|---|
| <img src="docs/media/homepage.png" alt="Traackly homepage"><br><sub>**The homepage.** What a new visitor sees first.</sub> | <img src="docs/media/board.png" alt="Request board with colour-coded groups and status cells"><br><sub>**One live board per role.** Requests grouped by stage; updates arrive in about a second, without refreshing.</sub> |
| <img src="docs/media/change-log.png" alt="Item panel showing the before and after of a change"><br><sub>**Nothing changes silently.** Every edit after approval is logged field by field, and the log can't be rewritten.</sub> | <img src="docs/media/kiosk-flagged.png" alt="Floor kiosk flagging a changed job"><br><sub>**The floor kiosk.** A changed job is flagged, and *Mark done* stays locked until someone acknowledges it.</sub> |

## Who it's for

- **The Coordinator** at a manufacturing company: the person who raises client requests and routes them across departments. Their job to be done: *"Get this request to the right team, correctly, and not have to chase it later."*
- **The floor supervisor.** Most floor staff never sit at a computer. Each department gets a shared kiosk screen instead of a login per person. That's a structural product decision, not a skin on a desktop tool.

Tools like monday.com, Asana, Trello and Freshservice are priced, designed and onboarded for desk-based teams, with one person, one login and one screen. In a floor-heavy factory, most of the people who need to see a change would never log in. The [competitive teardown](docs/product-marketing/competitive-teardown.md) compares them in detail.

## How I'd measure it

Both metrics come from two timestamps the product already records: when an edit is made, and when it's acknowledged.

- **Primary:** the share of edits made after approval that are acknowledged before work continues. The railway order is a real-world 0%; the target is as close to 100% as possible.
- **Secondary:** time to acknowledge, from the edit to the acknowledgment. It only means something under real production load, not on a quiet day.

## What I know, and what I'm still assuming

My PRD tags every claim, so first-hand evidence never gets mixed up with guesses.

| Confirmed first-hand | Still to validate |
|---|---|
| The railway order was built to an outdated spec for weeks, causing rework and a late delivery. | How often this happens, and what each incident costs in rework hours or days of delay. |
| The production team described it as a known, recurring problem. | Market size, and the claims about how fast this segment is digitising. |
| Kiosk screens are stationed per department, not per person. | Whether floor supervisors find the kiosk easy to use in practice. |
| | Which market to launch in first: India, or broader. |

## My role

I found the problem first-hand and wrote the [PRD](docs/product-marketing/PRD.md): the problem framing, personas, success metrics, user stories and scope. I defined the one rule, and I directed the product, design and brand choices: the board-style interface, the floor kiosk, the "t-check" logo, the homepage and the walkthrough video.

I built the working software with an AI coding assistant (Claude Code), directing it from my PRD rather than writing the code by hand. That is how one product marketer can take an idea from a real problem to a shipped, tested product without an engineering team. The full engineering trail is in this repo for anyone who wants to check it.

## The marketing work

| Document | What it shows |
|---|---|
| [Product teardown](docs/product-teardown.md) | The whole project in one place: problem, positioning, competition, GTM, brand, metrics and every screen |
| [Product requirements (PRD)](docs/product-marketing/PRD.md) | Problem discovery, personas, metrics, user stories and scope, written before the build |
| [Positioning & messaging](docs/product-marketing/positioning.md) | Positioning statement, message house and proof points |
| [Competitive teardown](docs/product-marketing/competitive-teardown.md) | monday.com, Asana, Trello and Freshservice against this segment's needs, with sources |
| [Go-to-market plan](docs/product-marketing/gtm-plan.md) | Ideal customer, channels, pricing hypothesis, launch steps and metrics |
| [Walkthrough](WALKTHROUGH.md) | The 5:54 product video with chapters, plus short cuts for social |
| [Customer research & roadmap (PDF)](docs/research/customer-research-and-roadmap.pdf) | 70 simulated manufacturers (53 Indian SMBs across every state, 17 global): what resonated, what they need next, pricing and the roadmap |
| [Case study (PDF)](docs/case-study.pdf) | The one-page version of this story |
| [Brand kit](docs/brand) | Logo, colours and usage rules |

## Customer research: where Traackly goes next

Before building more, I tested Traackly with 70 simulated manufacturers, India first, to see what resonates and what to build next.

**[Read the full customer research and roadmap (PDF, 25 pages)](docs/research/customer-research-and-roadmap.pdf)**

### How the test was conducted

- **Who.** 70 AI-simulated customer personas:
  - **53 Indian SMBs** covering all 28 states and 5 union territories, from Ludhiana cycle parts and Morbi ceramics to Coimbatore pumps, Howrah foundries and Guwahati fabrication. They were owners, second-generation MDs, production managers and floor supervisors, at companies of 9 to 450 people.
  - **17 manufacturers in 15 other countries**: the US, UK, Germany, Poland, Italy, Mexico, Brazil, Bangladesh, Vietnam, Thailand, China, Japan, the UAE, Kenya and South Africa.
- **What they saw.** Only what a real prospect would see: a one-page product sheet, 14 product screenshots and the live demo link. They did **not** see the PRD, the strategy documents or the story behind the product. They knew it is English-only today, has no Tally or WhatsApp link yet, and has no customers or price yet.
- **How.** Eight regional swarms (North, West, South, Central, East and North-East India, plus two global groups). Each persona reacted on its own, in its own voice, grounded in its local industry: how orders and changes really travel, the devices on the floor, language and payment habits. A final pass combined the results.
- **What it is, and isn't.** These are model-simulated personas, not real customers. Read the results as a structured stress test that shapes the roadmap and picks the first pilots. They are not validation. Every price and frequency is a persona estimate, and the report lists how to check each key finding with real plants.

### What resonated

- **The core rule.** Across all 70 personas, nobody disputed it: when an approved order changes, the floor must acknowledge it before the job is marked done.
- **The yellow CHANGED flag works without reading English.** *"Pila dabba dikha toh samajh gaya kuch badla hai"* (I saw the yellow box, so I knew something had changed), from a floor supervisor in Meerut.
- **The locked *Mark done* and the permanent change log.** Owners valued them as proof in audits, billing disputes and arguments with contractors. *"If wiring team must acknowledge before 'done', the blame game stops,"* said a panel builder in Puducherry.
- **30 of 53 Indian SMBs would take a free pilot today.** Another 17 said maybe.
- **Clear best-fit customers.** Made-to-order manufacturers with 35–300 people and costly misses:

| Cluster | Fit (of 10) | Where |
|---|---|---|
| LT control-panel builders | 7.0 | Chandigarh, Puducherry |
| Flexible and pharma packaging | 6.5 | Silvassa, Baddi |
| Export leather, furniture and sports goods | 6.2 | Kolkata, Kanpur, Jodhpur, Jalandhar |
| Pumps and precision parts | 6.0 | Coimbatore, Rajkot |
| Tier-2 auto (informal schedule changes) | 5.4 | Bhiwadi, Manesar, Hosur, Adityapur |

### The roadmap customers are asking for

In Indian factories, changes rarely arrive as typed text. They come as a drawing, a photo or a WhatsApp message, and the floor reads Hindi or a regional language. The roadmap meets them there:

| When | What | Asked for by |
|---|---|---|
| **Now** (1–2 weeks) | Photo, PDF and drawing attachments, with versions shown in the change diff | ~40 of 53 Indian SMBs, 14 of 17 global |
| | Hindi floor screen, with icons and only the changed value highlighted ("40 → 42") | ~40 of 53 |
| | Quantity and due date as their own flagged fields; pick-a-name or badge entry instead of typing | ~20 and ~8 |
| **Next** (1–2 months) | WhatsApp alerts, and forwarding a WhatsApp message or email to create a change | ~24 |
| | Excel/Tally import, so nobody types an order twice | ~17 |
| | Phone-first floor view that works offline, plus a printed job slip with a barcode for harsh floors | ~14 |
| | Tamil, Marathi, Bengali and Gujarati; custom stages including outside job-workers | ~10+ |
| **Later** | ERP connectors, a compliance edition (individual logins, e-signatures), and global languages | Larger and regulated plants |

**Pricing signal.** Personas estimated about ₹2,500–5,000 a month for a 50–200 person plant. They want a flat price per plant, paid annually with a GST invoice like a Tally renewal, after a free pilot set up on site.

**First pilots.** LT panel builders, flexible packaging in Silvassa, Tier-2 auto in Bhiwadi, export furniture or leather, and drawing-based fabrication in Guwahati or Vizag.

**After India.** The same needs came up abroad: attachments, local language and chat apps. Bangladesh, Kenya, the UAE, UK/US job shops and Poland are the strongest next markets.

**Next step: validate with real plants.** Run a 2-week "change diary" at five factories to see how changes really arrive, then a 4-week pilot with attachments and Hindi switched on. Real numbers from a real shop floor are the next case study.

---

### For engineers

Go API, React client, MongoDB, live updates over WebSockets, and a shared-screen kiosk mode. The acknowledgment rule is enforced on the server, below the HTTP layer, and the change log is append-only at the database level.

- `TestRailwayOrderIncidentEndToEnd` replays the incident above through the real API: raise, approve, schedule, edit, flag, block, acknowledge, unblock.
- `TestChangelogIsAppendOnly` proves that a forged rewrite of history is not stored.

Architecture, setup, quality gates and deployment are in **[TECHNICAL.md](TECHNICAL.md)**.
