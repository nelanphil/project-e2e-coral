export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string; // ISO date string
  category: string;
  readTime: string;
  accentColor: string; // Tailwind bg class for placeholder image area
}

export const blogPosts: BlogPost[] = [
  {
    slug: "caring-for-sps-corals",
    title: "Caring for Your First SPS Coral",
    excerpt:
      "Small Polyp Stony corals are some of the most rewarding reef inhabitants — but they demand precision. Here's what every beginner should know before adding SPS to their tank.",
    content: `
<p>Small Polyp Stony (SPS) corals represent the pinnacle of reef keeping for many hobbyists. Their vivid colors, intricate branching structures, and dynamic polyp extension make them endlessly captivating. However, they are also the most demanding corals you can keep, requiring stable, high-quality water and consistent lighting.</p>

<h2>Water Parameters</h2>
<p>SPS corals thrive in the following parameter ranges:</p>
<ul>
  <li><strong>Temperature:</strong> 76–78°F (24–26°C)</li>
  <li><strong>Salinity:</strong> 1.025–1.026 specific gravity</li>
  <li><strong>Alkalinity:</strong> 8–9 dKH</li>
  <li><strong>Calcium:</strong> 420–440 ppm</li>
  <li><strong>Magnesium:</strong> 1300–1400 ppm</li>
  <li><strong>Nitrate:</strong> 1–5 ppm</li>
  <li><strong>Phosphate:</strong> 0.03–0.08 ppm</li>
</ul>

<h2>Lighting Requirements</h2>
<p>SPS corals typically require high-intensity lighting with a spectrum in the 14,000–20,000K range. LED fixtures from reputable brands like Radion, Hydra, or Orphek are popular choices. Aim for PAR values between 250–400+ depending on the species.</p>

<h2>Flow</h2>
<p>Strong, random, turbulent water flow is essential for SPS health. Powerheads with controllable flow patterns, like the Vortech or Gyre, work well. Aim for 50–100x tank volume per hour of turnover.</p>

<h2>Acclimation Tips</h2>
<p>When introducing a new SPS coral, place it lower in the tank initially and gradually raise it over several weeks. This gives the coral time to adjust to your system's light and flow without bleaching.</p>

<p>Start with hardier species like <em>Acropora millepora</em> or <em>Montipora capricornis</em> before attempting rare collectors' pieces. Patience and consistency are the keys to SPS success.</p>
    `.trim(),
    author: "Jake Morrison",
    date: "2026-02-18",
    category: "Care Guides",
    readTime: "6 min read",
    accentColor: "bg-primary/15",
  },
  {
    slug: "hammer-coral-complete-guide",
    title: "The Beauty of Hammer Corals: A Complete Guide",
    excerpt:
      "Hammer corals are among the most sought-after LPS species in the hobby. Learn how to keep them thriving, what to watch out for, and how to choose a healthy specimen.",
    content: `
<p>Hammer corals (<em>Euphyllia ancora</em>) are beloved for their distinctive T-shaped or anchor-shaped tentacles that sway hypnotically in the current. Available in green, gold, purple, and even ultra-colored morphs, they are a centerpiece species in many reef tanks.</p>

<h2>Water Parameters</h2>
<p>Hammers are more forgiving than SPS but still appreciate stable conditions:</p>
<ul>
  <li><strong>Temperature:</strong> 75–80°F</li>
  <li><strong>Alkalinity:</strong> 8–10 dKH</li>
  <li><strong>Calcium:</strong> 400–450 ppm</li>
  <li><strong>Nitrate:</strong> 5–20 ppm (they can handle moderate nutrients)</li>
</ul>

<h2>Placement</h2>
<p>Place hammer corals in the bottom third of your tank in moderate flow. They dislike strong, direct current — it can prevent polyp extension and stress the coral. Indirect, randomized flow is ideal.</p>

<h2>Lighting</h2>
<p>Medium lighting is best: 50–150 PAR. Under high light, hammers may bleach; under low light, growth stalls and colors fade. A blue-heavy spectrum brings out their fluorescent hues.</p>

<h2>Hammer Coral Disease (Brown Jelly)</h2>
<p>One risk unique to Euphyllia is brown jelly disease, a bacterial infection that can spread quickly through a colony. Isolate any affected frags immediately and treat with iodine dips. Keep flow adequate to prevent tissue degradation.</p>

<h2>Fragging</h2>
<p>Hammers can be fragged by cutting between heads with bone cutters. Each head with a skeleton base will regenerate into a full colony. Allow wounds to heal in a separate tank before returning to the display.</p>
    `.trim(),
    author: "Sara Chen",
    date: "2026-01-30",
    category: "Species Spotlight",
    readTime: "7 min read",
    accentColor: "bg-secondary/15",
  },
  {
    slug: "setting-up-perfect-reef-tank",
    title: "Setting Up the Perfect Reef Tank",
    excerpt:
      "From choosing the right equipment to cycling your system, this step-by-step guide covers everything you need to set up a thriving reef aquarium from scratch.",
    content: `
<p>Building a reef tank from scratch can feel overwhelming, but breaking the process into stages makes it manageable. Whether you're choosing your first 40-gallon breeder or planning a 300-gallon dream build, the fundamentals remain the same.</p>

<h2>Step 1: Choosing Your Tank</h2>
<p>Larger tanks are more forgiving — they buffer against parameter swings. For beginners, a 40–75 gallon system strikes a good balance of cost, space, and stability. Consider rimless tanks with low iron glass for superior clarity.</p>

<h2>Step 2: Filtration</h2>
<p>A modern reef relies on a combination of:</p>
<ul>
  <li><strong>Protein Skimmer</strong> — removes organic waste before it breaks down</li>
  <li><strong>Refugium</strong> — chaeto algae to export nutrients naturally</li>
  <li><strong>Return Pump</strong> — sized at 5–10x tank volume per hour</li>
  <li><strong>Live Rock</strong> — 1–1.5 lbs per gallon for biological filtration</li>
</ul>

<h2>Step 3: Lighting</h2>
<p>Invest in quality lighting early. Cheap fixtures often lead to poor coral coloration and growth. A quality LED unit with a controllable spectrum is the best long-term investment.</p>

<h2>Step 4: Cycling</h2>
<p>Cycle your tank with ammonia before adding any livestock. The process takes 4–8 weeks. Test for ammonia, nitrite, and nitrate to confirm the cycle is complete before adding corals or fish.</p>

<h2>Step 5: Water Chemistry</h2>
<p>Start testing all major parameters weekly. Build a log of your readings so you can spot trends before they become problems. Consistency beats perfection.</p>
    `.trim(),
    author: "Marcus Webb",
    date: "2026-01-14",
    category: "Getting Started",
    readTime: "8 min read",
    accentColor: "bg-accent/15",
  },
  {
    slug: "understanding-alkalinity",
    title: "Understanding Alkalinity in Reef Aquariums",
    excerpt:
      "Alkalinity is one of the most critical parameters in a reef tank — and one of the most misunderstood. This in-depth guide explains what it is, why it matters, and how to keep it stable.",
    content: `
<p>Alkalinity (also called carbonate hardness or dKH) measures the buffering capacity of your water — its ability to resist changes in pH. In a reef tank, alkalinity is primarily consumed by stony corals as they build their calcium carbonate skeletons.</p>

<h2>Why Alkalinity Matters</h2>
<p>Without adequate alkalinity, corals cannot grow and their existing skeletons can dissolve. Swings in alkalinity (even between two "acceptable" values) cause more stress than a stable slightly-off reading. Stability is paramount.</p>

<h2>Target Range</h2>
<p>Most reef keepers aim for 8–9.5 dKH. SPS-dominant tanks often run 7.5–8.5 to prevent potential issues at higher levels. LPS and soft coral tanks can tolerate 9–11 dKH.</p>

<h2>How to Maintain Alkalinity</h2>
<p>There are several methods to replenish alkalinity consumed by corals:</p>
<ul>
  <li><strong>Two-Part Dosing</strong> — separate calcium and alkalinity solutions dosed in equal amounts</li>
  <li><strong>Kalkwasser</strong> — limewater that simultaneously raises both calcium and alkalinity</li>
  <li><strong>Calcium Reactor</strong> — uses CO2 to dissolve aragonite media; ideal for large, heavily stocked systems</li>
  <li><strong>Water Changes</strong> — fresh saltwater restores depleted elements naturally</li>
</ul>

<h2>Testing</h2>
<p>Test alkalinity at least twice a week in an active reef. The Hanna checker (HI755) is a popular digital option. Salifert and Red Sea test kits are reliable manual options. Always test at the same time of day, as pH fluctuations affect readings.</p>
    `.trim(),
    author: "Sara Chen",
    date: "2025-12-20",
    category: "Water Chemistry",
    readTime: "6 min read",
    accentColor: "bg-info/15",
  },
  {
    slug: "top-5-beginner-corals",
    title: "Top 5 Beginner-Friendly Corals",
    excerpt:
      "New to reef keeping? These five hardy, forgiving corals are perfect starting points — beautiful, resilient, and available in many color morphs to suit any aesthetic.",
    content: `
<p>Not all corals are created equal when it comes to difficulty. These five species are consistently recommended for newcomers because they tolerate the occasional parameter swing and reward beginners with rapid growth and vivid color.</p>

<h2>1. Mushroom Corals (Discosoma / Rhodactis)</h2>
<p>Mushrooms are practically indestructible. They thrive in low to moderate light, tolerate higher nutrients, and propagate rapidly. Many stunning color morphs — including metallic reds, blues, and ultra-spotted "Bounce" mushrooms — are available.</p>

<h2>2. Pulsing Xenia</h2>
<p>Xenia is one of the few corals that actively pulses its polyps. It grows quickly in moderate flow and medium light, making it a great "fun" coral for beginners. Just be aware it can become invasive — keep it isolated from rock you want to keep coral-free.</p>

<h2>3. Toadstool Leather (Sarcophyton)</h2>
<p>Toadstools are soft corals that grow into impressive umbrella-shaped colonies. They are highly tolerant of suboptimal parameters and can bounce back from neglect that would kill an SPS. Their leathery texture and flowing polyps make them visually interesting.</p>

<h2>4. Duncan Coral (Duncanopsammia axifuga)</h2>
<p>Duncans feature large, puffy polyps in green, purple, and teal hues. They respond dramatically to feeding and grow quickly when fed small meaty foods like mysis shrimp. Easy to frag and trade.</p>

<h2>5. Green Star Polyps (Pachyclavularia)</h2>
<p>GSP covers rock in a lush, grass-like carpet of bright green polyps. It spreads quickly and handles lower water quality without complaint. A "starter" coral that looks fantastic as a backdrop for more demanding pieces.</p>
    `.trim(),
    author: "Jake Morrison",
    date: "2025-12-05",
    category: "Getting Started",
    readTime: "5 min read",
    accentColor: "bg-success/15",
  },
  {
    slug: "coral-fragging-tips",
    title: "Coral Fragging: Tips and Techniques",
    excerpt:
      "Fragging your own corals is one of the most rewarding parts of the hobby. Learn the tools, techniques, and best practices to successfully propagate your collection.",
    content: `
<p>Fragging — the process of cutting a coral into smaller pieces — is how reef keepers propagate their collection, trade with other hobbyists, and sustain the hobby sustainably. Done correctly, it is stress-free for the coral and yields healthy new colonies.</p>

<h2>Equipment You'll Need</h2>
<ul>
  <li>Bone cutters or a coral bandsaw (for LPS and SPS)</li>
  <li>Razor blade or scalpel (for soft corals)</li>
  <li>Frag plugs or tiles</li>
  <li>Coral glue (super glue gel works well)</li>
  <li>Iodine-based dip (Coral RX, CoralDip)</li>
  <li>Separate frag tank or container</li>
</ul>

<h2>LPS Fragging</h2>
<p>For LPS like hammers, torches, and frogspawn, identify individual heads and cut cleanly between them with bone cutters. Each head attached to a skeleton base will form a new colony. Dip in coral dip for 5–10 minutes and mount on a frag plug with super glue.</p>

<h2>SPS Fragging</h2>
<p>Use bone cutters or a bandsaw to cut branches at least 1–2 inches long. Mount immediately on frag plugs. Keep under lower light for 1–2 weeks as the cut end heals over.</p>

<h2>Soft Coral Fragging</h2>
<p>Many soft corals like leathers and zoanthids can be cut with a razor blade. Zoanthid polyps can be individually removed from the base. Mushrooms can be sliced into quarters, each of which will regenerate into a full mushroom.</p>

<h2>Post-Frag Care</h2>
<p>Keep new frags in lower flow and lower light for the first 1–2 weeks. Watch for infection or recession at cut sites. A separate frag tank lets you monitor without disturbing your main display.</p>
    `.trim(),
    author: "Marcus Webb",
    date: "2025-11-22",
    category: "Techniques",
    readTime: "7 min read",
    accentColor: "bg-warning/15",
  },
  {
    slug: "led-vs-t5-lighting",
    title: "LED vs T5: Lighting for Coral Growth",
    excerpt:
      "The LED vs T5 debate has fueled reef forums for years. We break down the real differences in spectrum, PAR output, heat, and cost to help you make the right choice.",
    content: `
<p>Lighting is the single most important piece of equipment for a coral reef. Both LED and T5 fluorescent fixtures have proven track records, but they excel in different areas. Understanding the trade-offs helps you pick the right system for your goals.</p>

<h2>T5 Fluorescent</h2>
<p><strong>Pros:</strong></p>
<ul>
  <li>Even, spread-out light coverage with minimal shimmer lines</li>
  <li>Proven coral growth results across decades of hobbyist use</li>
  <li>Natural-looking broad spectrum without hot spots</li>
  <li>Lower upfront cost for quality fixtures</li>
</ul>
<p><strong>Cons:</strong></p>
<ul>
  <li>Bulbs must be replaced every 8–12 months</li>
  <li>Generates significant heat</li>
  <li>Cannot be programmed with dawn/dusk cycles easily</li>
  <li>Higher long-term energy cost</li>
</ul>

<h2>LED</h2>
<p><strong>Pros:</strong></p>
<ul>
  <li>Fully programmable schedules and spectrum control</li>
  <li>Low energy consumption and minimal heat output</li>
  <li>Long lifespan (50,000+ hours)</li>
  <li>Stunning shimmer effect from point-source light</li>
</ul>
<p><strong>Cons:</strong></p>
<ul>
  <li>Higher upfront cost for quality units</li>
  <li>Cheap LEDs often underperform rated specs</li>
  <li>Can produce hot spots and uneven coverage</li>
</ul>

<h2>Hybrid Approach</h2>
<p>Many serious reefers combine both: T5 for even coverage and fill-in spectrum, with LEDs for programmability and shimmer. This hybrid approach is particularly popular with SPS tanks.</p>

<h2>Our Recommendation</h2>
<p>For beginners: a quality LED like the AI Hydra or Radion XR15 is the most future-proof investment. For advanced reefers seeking the absolute best coral coloration, a T5 or hybrid setup is worth exploring.</p>
    `.trim(),
    author: "Jake Morrison",
    date: "2025-11-08",
    category: "Equipment",
    readTime: "6 min read",
    accentColor: "bg-error/15",
  },
  {
    slug: "water-flow-patterns",
    title: "Water Flow Patterns for Healthy Corals",
    excerpt:
      "Flow is the invisible force that keeps your coral healthy — delivering nutrients, removing waste, and mimicking the natural reef environment. Here's how to get it right.",
    content: `
<p>Water flow is often the most underappreciated factor in coral health. In the wild, corals experience complex, multi-directional currents that keep them clean, deliver food, and remove metabolic waste. Replicating this in a closed system requires some planning.</p>

<h2>Why Flow Matters</h2>
<ul>
  <li>Delivers dissolved oxygen and nutrients to coral tissue</li>
  <li>Removes detritus and waste products that fuel algae growth</li>
  <li>Prevents temperature stratification in the water column</li>
  <li>Stimulates natural polyp behavior and feeding response</li>
</ul>

<h2>Types of Flow</h2>
<p><strong>Laminar flow</strong> — steady, directional water movement. Good for specific target areas but can cause tissue damage from constant pressure on one spot.</p>
<p><strong>Turbulent/chaotic flow</strong> — random, pulsing, multi-directional movement. Best for most corals and the closest simulation of natural reef conditions.</p>

<h2>Recommended Turnover</h2>
<ul>
  <li><strong>Soft corals:</strong> 20–40x tank volume per hour</li>
  <li><strong>LPS:</strong> 40–60x tank volume per hour</li>
  <li><strong>SPS:</strong> 60–100x+ tank volume per hour</li>
</ul>

<h2>Powerhead Placement</h2>
<p>Place powerheads on opposing sides to create colliding currents in the center of the tank. Angle them slightly upward and away from corals to prevent direct blast. Gyre pumps excel at creating natural, random flow patterns throughout the entire water column.</p>

<h2>Signs of Inadequate Flow</h2>
<p>Watch for detritus accumulation on the sand bed or rocks, closed polyps during light hours, rapid algae growth in dead spots, or unexplained tissue necrosis on coral bases.</p>
    `.trim(),
    author: "Sara Chen",
    date: "2025-10-27",
    category: "Techniques",
    readTime: "5 min read",
    accentColor: "bg-primary/10",
  },
  {
    slug: "calcium-in-coral-health",
    title: "The Role of Calcium in Coral Health",
    excerpt:
      "Calcium is the building block of every stony coral skeleton. Understanding how to test, dose, and balance calcium alongside alkalinity is essential for a thriving reef.",
    content: `
<p>Calcium is one of the three major elements (alongside alkalinity and magnesium) that reef keepers must actively manage. Stony corals — both LPS and SPS — extract calcium from the water to build their calcium carbonate skeletons.</p>

<h2>Target Range</h2>
<p>The natural seawater concentration of calcium is approximately 420 ppm. For a reef tank, aim for 400–450 ppm. Levels below 380 ppm can slow coral growth; levels above 500 ppm risk precipitation with carbonate and can crash your alkalinity.</p>

<h2>The Calcium-Alkalinity Relationship</h2>
<p>Calcium and alkalinity are inextricably linked. They must be dosed in balance — raising one without the other leads to precipitation ("snowstorm") and depletes both. This is why two-part dosing and calcium reactors are designed to raise both simultaneously in the correct ratio.</p>

<h2>How to Dose Calcium</h2>
<ul>
  <li><strong>Two-part:</strong> Dose equal parts of a calcium and alkalinity solution; auto-dosing pumps make this seamless</li>
  <li><strong>Kalkwasser:</strong> Limewater (calcium hydroxide) raises calcium, alkalinity, and pH while precipitating phosphate</li>
  <li><strong>Calcium chloride:</strong> A quick fix for low calcium, but raises chloride over time — not suitable for regular use</li>
  <li><strong>Calcium reactor:</strong> Best for heavy coral loads; dissolves aragonite media with CO2</li>
</ul>

<h2>Testing</h2>
<p>Test calcium at least weekly with a reliable test kit (Red Sea, Salifert, or the Hanna checker HI758). Log your results and calculate daily consumption to determine the correct dosing amount for your system.</p>
    `.trim(),
    author: "Marcus Webb",
    date: "2025-10-10",
    category: "Water Chemistry",
    readTime: "6 min read",
    accentColor: "bg-secondary/10",
  },
  {
    slug: "acclimating-new-corals",
    title: "Acclimating New Corals to Your Tank",
    excerpt:
      "Getting a new coral home is exciting — but the acclimation process is critical. Rush it, and you risk losing a valuable specimen. Here's how to do it right every time.",
    content: `
<p>Proper acclimation is the difference between a coral that thrives and one that declines in the first few weeks. Corals are sensitive to sudden changes in temperature, salinity, and pH, so the transition from shipping bag to your display tank must be gradual.</p>

<h2>Step 1: Inspect on Arrival</h2>
<p>Before anything else, check the water temperature in the bag and compare it to your tank. Look for signs of shipping stress: closed polyps, mucus, or unusual coloration. A healthy coral may close up during shipping — this is normal.</p>

<h2>Step 2: Temperature Acclimation</h2>
<p>Float the sealed bag in your sump or tank for 15–20 minutes to equalize temperature. Never skip this step — thermal shock can cause immediate bleaching.</p>

<h2>Step 3: Salinity Acclimation (Drip Method)</h2>
<p>Pour the coral and shipping water into a bucket. Set up a drip line from your tank and drip at approximately 2 drops per second. Over 30–45 minutes, the bucket water will gradually match your tank's salinity and chemistry.</p>

<h2>Step 4: Dip and Inspect</h2>
<p>Use a coral dip (Coral RX, CoralDip, or potassium permanganate) to treat for pests before introducing to your display. Dip for 5–10 minutes while gently agitating, then inspect for flatworms, nudibranch eggs, or other hitchhikers.</p>

<h2>Step 5: Initial Placement</h2>
<p>Place the new coral lower in the tank than its final destination and in lower flow. Give it 1–2 weeks to settle before moving it higher or into stronger current. This reduces the chance of bleaching from light shock.</p>

<h2>Quarantine</h2>
<p>Ideally, new corals should spend 6–8 weeks in a quarantine tank before entering your display. This protects your existing livestock from pests and disease. A simple quarantine setup with a heater, pump, and light is all you need.</p>
    `.trim(),
    author: "Jake Morrison",
    date: "2025-09-18",
    category: "Getting Started",
    readTime: "5 min read",
    accentColor: "bg-accent/10",
  },
];
