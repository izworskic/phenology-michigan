import { BLOOM_EXPANSION_2027 } from './expansion-2027.mjs';
// Operator-access guidance for 2027. Opening hours/prices must be rechecked with each owner.
export const BLOOM_VISIT_GUIDES = Object.freeze({
  "meijer-gardens-cherries": {
    "tickets": "Regular Meijer Gardens admission applies; confirm 2027 adult, child and member rates. Cherry blossoms are part of general garden access, not a separate ticket.",
    "hours": "Follow the garden's posted seasonal opening hours; the Japanese Garden is not an all-hours public park.",
    "parking": "Use the signed garden visitor lots. Allow extra walking time to reach the Japanese Garden and Cherry Tree Promenade.",
    "crowds": "Warm spring weekends can attract blossom photographers; opening time generally gives more breathing room.",
    "tip": "Yoshino and Weeping Higan cherries can peak at different moments. Explore the Japanese Garden paths rather than basing a trip on one tree.",
    "link": "https://www.meijergardens.org/blossoms/"
  },
  "holland-tulips": {
    "tickets": "Many downtown tulip beds are free to view. Windmill Island Gardens and individual Tulip Time experiences can require separate admission; there is no single festival-wide ticket.",
    "hours": "City displays, Windmill Island and ticketed events have different access hours; consult each venue's calendar.",
    "parking": "Use downtown public parking for Centennial Park. Windmill Island warns that festival parking is limited; follow off-site instructions when offered.",
    "crowds": "Tulip Time weekends and parades draw large crowds. A weekday walk through Centennial Park and Window on the Waterfront is easier to pace.",
    "tip": "For free color, walk the public beds. For a windmill and bulb-field experience, consider a ticketed Windmill Island visit. The City Tulip Tracker, not a festival date, helps assess flowering.",
    "link": "https://www.tuliptime.com/events"
  },
  "traverse-city-cherries": {
    "tickets": "Free to view from public roads. Orchard rows and farm driveways are private property; do not enter them without permission.",
    "hours": "Self-guided driving is best in daylight. Commercial stops along the route have their own hours.",
    "parking": "Pull off only at legal public viewing spaces or visitor businesses. Never block agricultural driveways or narrow road shoulders.",
    "crowds": "Old Mission Peninsula roads can be busy during sunny May weekends. Allow extra travel time and avoid abrupt photo stops.",
    "tip": "Drive M-37 north with views of Grand Traverse Bay. Southern and northern orchard zones may be at different stages in the same week.",
    "link": "https://www.traversecity.com/things-to-do/tours/cherry-blossom-tours/"
  },
  "um-peony-garden": {
    "tickets": "Free entry to the W.E. Upjohn Peony Garden at Nichols Arboretum; no peony admission ticket is required.",
    "hours": "The arboretum is generally open sunrise to sunset. Herbaceous peonies tend to be strongest from late May into mid-June, weather dependent.",
    "parking": "Nearby parking is limited. Check Washington Heights meter hours, university lot M-28 rules and any announced shuttle before you set out.",
    "crowds": "This is a major spring destination. Expect others on the garden paths even early during peak weekends.",
    "tip": "Walk the numbered beds slowly to appreciate cultivar differences. Morning and late-day light protect delicate flower colors and bring out fragrance.",
    "link": "https://mbgna.umich.edu/peony-garden-parking-and-directions"
  },
  "mackinac-lilacs": {
    "tickets": "There is no general admission fee to walk the island lilacs, but ferry passage costs money. Some festival events or tours charge separately.",
    "hours": "The streetside flowers can be visited during daylight; ferry departure times, tours and other attractions operate to published schedules.",
    "parking": "Leave your car at your ferry operator's mainland lot in Mackinaw City or St. Ignace; visitors explore the island on foot, bicycle or licensed transport.",
    "crowds": "June festival weekends and ferry-arrival waves get busy. An earlier boat leaves more walking time before the return trip.",
    "tip": "Start in Marquette Park, wander through downtown and extend toward Windermere Point. Fragrance and old, gnarled shrubs define this walk.",
    "link": "https://www.mackinacisland.org/mackinac-island-lilac-festival/"
  },
  "milan-lavender": {
    "tickets": "Ask Lavender Lane Farm about field entry, U-cut fees, festival admission and photography bookings; do not assume summer access is free.",
    "hours": "Farm opening is seasonal and may be limited to weekends. The year-round downtown Milan store is a different location.",
    "parking": "Use the designated visitor area at 12040 Plank Road when the farm is open; do not stop on the rural road for field photographs.",
    "crowds": "Festival afternoons concentrate visitors in a compact field. Expect full sun, active bees and narrow rows.",
    "tip": "Check that flowers remain in the field before leaving. Harvest can change color and fragrance even during the advertised seasonal window.",
    "link": "https://lavenderlanemi.com/local/"
  },
  "frankenmuth-sunflowers": {
    "tickets": "The Flower Festival at Grandpa Tiny's Farm uses paid general admission; special dinners or other activities may have separate tickets.",
    "hours": "Access to the sunflower fields follows the announced event schedule, not an all-summer open-field promise.",
    "parking": "Follow farm festival parking instructions at 7775 Weiss Street; keep staff and agricultural access routes clear.",
    "crowds": "Weekend programming and popular photo areas can produce queues; allow time for field walking and possible weather delays.",
    "tip": "The farm publishes lead-up updates. Over 25 acres of flowers can peak unevenly; check a dated field report as well as the festival schedule.",
    "link": "https://www.grandpatinys.com/frankenmuth-flower-festival"
  },
  "gull-meadow-sunflowers": {
    "tickets": "Sunflower Days uses event tickets; past general admission included a wagon ride, one U-cut flower and access to selected attractions. Special evening events can be separate.",
    "hours": "The sunflower field opens only during scheduled event sessions, which differ from the farm market's hours.",
    "parking": "Park at the farm on Gull Road and check in at the market for the wagon ride. Expect grass, gravel and uneven ground.",
    "crowds": "Busy photo stations should be shared. Limited shade makes water and sun protection important, especially in afternoon heat.",
    "tip": "More than two dozen sunflower varieties can peak at different times. Use the current event guide and a dated crop update before assuming the entire field is flowering.",
    "link": "https://gullmeadowfarms.com/pages/know-before-you-go-sunflower-days"
  },
  "blakes-sunflowers": {
    "tickets": "Blake's Sunflower Festival has been ticketed with online and gate purchase options. Verify 2027 rates, child policies and U-pick costs.",
    "hours": "Festival days and hours can differ from ordinary orchard hours, especially around Labor Day.",
    "parking": "Visit the Orchard & Cider Mill at 17985 Armada Center Road, not another Blake Farms location; follow designated festival parking signs.",
    "crowds": "Holiday weekends and photography periods can be crowded. Add time for vendor areas, entry and photo stops.",
    "tip": "This is the late-August to Labor Day sunflower wave. It is not a guarantee of blooming plants if earlier fields have faded; rely on current organizer updates.",
    "link": "https://blakefarms.com/sunflower-festival/"
  }
});
export const BLOOM_EXPANDED_VISIT_GUIDES = Object.freeze(Object.fromEntries(BLOOM_EXPANSION_2027.map((item) => [item.id, item.visit])));

export const BLOOM_FAQS = Object.freeze([
  {
    "question": "When do cherry blossoms peak in Michigan in 2027?",
    "answer": "Meijer Gardens' ornamental cherries are typically watched in April into early May, while Traverse City orchard bloom is generally a May event. There is no reliable single statewide peak week; varieties, location and spring temperatures change the date. Look for fresh destination-specific observations."
  },
  {
    "question": "Where can I see the best tulip fields in Michigan?",
    "answer": "Holland has public displays at Centennial Park and Window on the Waterfront, plus the ticketed Windmill Island Gardens experience. Consult the City of Holland Tulip Tracker before choosing which beds to visit."
  },
  {
    "question": "Is Tulip Time free and when does it happen?",
    "answer": "Tulip Time is generally an early-May festival. Many streetside and park tulips can be enjoyed free, while specific attractions and events require their own tickets. Check the official 2027 event calendar for confirmed dates."
  },
  {
    "question": "When do Traverse City cherry orchards blossom?",
    "answer": "Usually in May, but the bloom varies across Old Mission and Leelanau peninsulas. A self-guided drive on public roads is free; working orchards remain private property."
  },
  {
    "question": "When does the University of Michigan Peony Garden peak?",
    "answer": "Herbaceous peonies normally provide their major display from Memorial Day to mid-June. The university notes that seasonal timing can shift by around ten days. Nichols Arboretum admission is free; parking is limited."
  },
  {
    "question": "When should I see lilacs on Mackinac Island?",
    "answer": "June is the broad planning window, often near the Lilac Festival. Festival dates are not proof of flowering. The island walk is free, but visitors still need to arrange paid ferry passage."
  },
  {
    "question": "When do Michigan lavender fields bloom?",
    "answer": "Milan Lavender Lane's broad peak window begins in late June and can continue into early August, depending on harvest. Confirm the farm's operating hours and current field condition first."
  },
  {
    "question": "Which Michigan sunflower fields bloom in July, August and September?",
    "answer": "Frankenmuth Flower Festival and Gull Meadow Sunflower Days generally cover late July and August; Blake's in Armada extends into the Labor Day period. All rely on crops and event calendars, so a ticketed weekend does not guarantee peak flowers."
  },
  {
    "question": "Is this tracker claiming flowers are blooming right now?",
    "answer": "No, not merely because a calendar month or colorful map appears. A current GO or WAIT claim requires a recent sourced observation. In the off-season the cards explicitly state that there is no current bloom claim."
  }
]);
export const getBloomVisitGuide = (id) => BLOOM_VISIT_GUIDES[id] || BLOOM_EXPANDED_VISIT_GUIDES[id] || null;
