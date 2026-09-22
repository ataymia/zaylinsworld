// Starter Town's release-candidate progression contract. These IDs are saved,
// so they must stay stable even when the presentation or minigames change.

const freeze = (value) => Object.freeze(value);

const subject = (id, title, skill, { foundation = false, description = '' } = {}) => freeze({
  id,
  title,
  skill,
  foundation,
  description,
});

export const STARTER_TOWN_SUBJECTS = freeze([
  subject('basic-math', 'Basic Math', 'smarts', {
    foundation: true,
    description: 'Prices, wages, change, and everyday number sense.',
  }),
  subject('reading-memory', 'Reading & Memory', 'smarts', {
    description: 'Instructions, dialogue details, and recall.',
  }),
  subject('computer-basics', 'Computer Basics', 'smarts', {
    description: 'Digital tasks and a first step toward TechTown.',
  }),
  subject('civics-law', 'Civics & Law', 'legalKnowledge', {
    foundation: true,
    description: 'Traffic rules, fines, rights, and responsibilities.',
  }),
  subject('health-hygiene', 'Health & Hygiene', 'health', {
    foundation: true,
    description: 'Food, rest, hygiene, and safe recovery.',
  }),
  subject('career-basics', 'Career Basics', 'jobReadiness', {
    foundation: true,
    description: 'Job requirements, performance, and promotion.',
  }),
  subject('driver-education', 'Driver Education', 'driving', {
    foundation: true,
    description: 'Signs, signals, right-of-way, and legal driving.',
  }),
  subject('physical-education', 'Physical Education', 'fitness', {
    description: 'Movement, timing, and reaction drills.',
  }),
  subject('arts-rhythm', 'Arts & Rhythm', 'fun', {
    description: 'Beat, expression, and a first step toward Starline City.',
  }),
  subject('world-geography', 'World Geography', 'travelKnowledge', {
    description: 'District reading, town routes, and the connected world.',
  }),
]);

export const STARTER_TOWN_SUBJECTS_BY_ID = freeze(Object.fromEntries(
  STARTER_TOWN_SUBJECTS.map((entry) => [entry.id, entry]),
));

export const FOUNDATION_CERTIFICATE = freeze({
  id: 'starter-foundation',
  title: 'Starter Town Foundation Certificate',
  requiredSubjectIds: freeze(STARTER_TOWN_SUBJECTS.filter((entry) => entry.foundation).map((entry) => entry.id)),
  worktowerPayMultiplier: 1.1,
});

const career = (id, title, locationId, titles) => freeze({ id, title, locationId, titles: freeze(titles) });

export const STARTER_TOWN_CAREERS = freeze([
  career('chicken-spot-crew', 'Chicken Spot Crew', 'chicken-spot', [
    'Crew Trainee', 'Reliable Crew Member', 'Shift Lead', 'Senior Shift Lead',
  ]),
  career('worktower-associate', 'WorkTower Associate', 'worktower', [
    'Office Temp', 'Office Associate', 'Project Associate', 'Senior Associate',
  ]),
  career('garage-hand', 'Garage Hand', 'city-garage', [
    'Shop Helper', 'Garage Hand', 'Service Technician', 'Senior Technician',
  ]),
  career('sanitation-worker', 'Sanitation Worker', 'dreamdrop-sanitation-stop', [
    'Cleanup Worker', 'Route Worker', 'Route Lead', 'District Lead',
  ]),
]);

export const STARTER_TOWN_CAREERS_BY_ID = freeze(Object.fromEntries(
  STARTER_TOWN_CAREERS.map((entry) => [entry.id, entry]),
));

export const CAREER_PROMOTION_SHIFTS = freeze([0, 3, 8, 15]);
export const CAREER_GRADE_ORDER = freeze(['POOR', 'OKAY', 'GOOD', 'EXCELLENT']);

export const STARTER_TOWN_LIFE = freeze({
  townId: 'starter-town',
  schoolId: 'zaylins-prep',
  homeId: 'zaylins-home',
  starterVehicleId: 'starter-kamaro',
  clinicCost: 35,
  clinicHealthGain: 45,
  nurseHealthGain: 25,
});

