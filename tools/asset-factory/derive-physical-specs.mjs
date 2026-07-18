import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assetTokens } from './deep-spec-semantics.mjs';
import { classifyFinalAsset } from './deep-spec-final-classifier.mjs';

const ROOT = process.cwd();
const FACTORY_ROOT = join(ROOT, 'asset-factory');
const DEEP_PATH = join(FACTORY_ROOT, 'generated', 'deep-asset-specs.json');
const COVERAGE_PATH = join(FACTORY_ROOT, 'generated', 'deep-spec-coverage.json');
const POLICY_PATH = join(FACTORY_ROOT, 'quality-policy.json');
const deep = JSON.parse(readFileSync(DEEP_PATH, 'utf8'));
const coverage = JSON.parse(readFileSync(COVERAGE_PATH, 'utf8'));
const policy = JSON.parse(readFileSync(POLICY_PATH, 'utf8'));

const QUALITY_DEFAULTS = {
  architecture: { minimumMeshObjects: 18, minimumTriangles: 5000, maximumTriangles: 50000, minimumMaterials: 5 },
  vehicle: { minimumMeshObjects: 24, minimumTriangles: 7000, maximumTriangles: 50000, minimumMaterials: 6 },
  character: { minimumMeshObjects: 1, minimumTriangles: 8000, maximumTriangles: 50000, minimumMaterials: 3 },
  furniture: { minimumMeshObjects: 10, minimumTriangles: 1600, maximumTriangles: 24000, minimumMaterials: 3 },
  infrastructure: { minimumMeshObjects: 10, minimumTriangles: 1500, maximumTriangles: 26000, minimumMaterials: 4 },
  road_surface: { minimumMeshObjects: 5, minimumTriangles: 700, maximumTriangles: 18000, minimumMaterials: 3 },
  signage: { minimumMeshObjects: 7, minimumTriangles: 900, maximumTriangles: 18000, minimumMaterials: 4 },
  food: { minimumMeshObjects: 5, minimumTriangles: 1200, maximumTriangles: 18000, minimumMaterials: 4 },
  vegetation: { minimumMeshObjects: 6, minimumTriangles: 1800, maximumTriangles: 30000, minimumMaterials: 3 },
  creature_prop: { minimumMeshObjects: 6, minimumTriangles: 2500, maximumTriangles: 36000, minimumMaterials: 3 },
  generic_prop: { minimumMeshObjects: 7, minimumTriangles: 1000, maximumTriangles: 24000, minimumMaterials: 3 },
};

const CATEGORY_BASE = {
  architecture: {
    profile: 'complete architectural asset',
    dimensions: { width: 12, depth: 10, height: 6 },
    components: ['foundation or structural base', 'primary load-bearing massing', 'public entrance or connection face', 'framed openings', 'roof or upper termination', 'service elevation or access', 'material and weather transitions'],
    materials: ['structural material', 'facade finish', 'framed glass or opening material', 'roof or cap material', 'doors and service hardware'],
    purpose: 'a complete building or structural module with human-scale access, readable massing, and believable construction on every visible side',
  },
  vehicle: {
    profile: 'complete transportation asset',
    dimensions: { width: 2, depth: 4.6, height: 1.7 },
    components: ['load-bearing chassis or hull', 'occupant or cargo volume', 'access point', 'propulsion system', 'steering or control system', 'front and rear or navigation lighting', 'cooling or intake system', 'service and energy interface'],
    materials: ['painted or composite body', 'structural metal', 'glass or protective screen', 'rubber or flexible seals', 'lighting lenses', 'interior or deck material'],
    purpose: 'a practical transportation system with credible occupancy, propulsion, access, lighting, protection, and maintenance logic',
  },
  furniture: {
    profile: 'human-scale furniture or fixture',
    dimensions: { width: 1.4, depth: 0.7, height: 1 },
    components: ['primary use surface or enclosure', 'load-bearing frame', 'legs, pedestal, wall mount, or floor support', 'user contact surface', 'access, storage, or control component', 'joinery and fasteners', 'floor or wall contact details'],
    materials: ['structural frame material', 'primary surface finish', 'hardware', 'flexible or contact material where required'],
    purpose: 'a usable interior object with credible ergonomics, supports, joinery, and interaction clearance',
  },
  infrastructure: {
    profile: 'serviceable infrastructure asset',
    dimensions: { width: 1, depth: 0.7, height: 1.8 },
    components: ['foundation, bracket, or mounting system', 'structural enclosure or support', 'operating surface or working mechanism', 'access door, cover, or service opening', 'control, handle, lens, or connection point', 'power, conduit, drainage, or network path', 'weather, impact, or pressure protection', 'fasteners and identification surface'],
    materials: ['painted or galvanized structure', 'service hardware', 'protective enclosure', 'control, lens, or display material', 'foundation or mounting material'],
    purpose: 'a functional civic, utility, marine, transit, security, or industrial installation whose operation and maintenance are visible',
  },
  road_surface: {
    profile: 'modular traversal surface',
    dimensions: { width: 4, depth: 4, height: 0.35 },
    components: ['walkable or drivable surface', 'edge, curb, rail, or fall boundary', 'connection seams or sockets', 'structural support or terrain anchor', 'drainage or environmental transition', 'markings or gameplay guidance', 'continuous simplified collision surface'],
    materials: ['primary traversal surface', 'edge or barrier material', 'support structure', 'marking or guidance material'],
    purpose: 'a cleanly connecting traversal module with believable support, safe edges, readable direction, and continuous collision',
  },
  signage: {
    profile: 'installed information or display asset',
    dimensions: { width: 1.5, depth: 0.18, height: 1.4 },
    components: ['information panel or display surface', 'border or protective bezel', 'backing structure', 'post, bracket, frame, or portable base', 'fasteners and attachment hardware', 'lettering, symbols, or changeable content layer', 'power, lighting, or service access where required'],
    materials: ['panel or display face', 'structural support', 'border or bezel', 'lettering or content material', 'lighting or lens material where required'],
    purpose: 'a readable sign or display whose panel category, support, viewing angle, and service construction are clear before text is read',
  },
  food: {
    profile: 'prepared food, beverage, ingredient, or package',
    dimensions: { width: 0.28, depth: 0.28, height: 0.22 },
    components: ['recognizable edible or drinkable portion', 'preparation-specific layers or pieces', 'container, wrapper, plate, cup, or serving support', 'closure, rim, handle, or utensil where required', 'surface variation showing preparation and temperature', 'pickup and placement contact'],
    materials: ['food surface materials', 'container or serving material', 'wrapper, lid, or utensil material', 'liquid, sauce, garnish, or emissive temperature cue where relevant'],
    purpose: 'a recognizable serving or package with believable portion, preparation structure, container thickness, and handling context',
  },
  vegetation: {
    profile: 'coherent planted or natural growth asset',
    dimensions: { width: 2, depth: 2, height: 2.5 },
    components: ['root, base, or substrate anchor', 'primary trunk, stem, coral body, or growth mass', 'secondary branching or growth hierarchy', 'leaf, frond, petal, cap, or polyp clusters', 'species-defining silhouette features', 'ground, planter, rock, wall, or seabed transition'],
    materials: ['root, trunk, stem, coral, or fungal base', 'leaf, frond, petal, cap, or polyp material', 'soil, rock, planter, or substrate material'],
    purpose: 'a botanically or ecologically coherent growth with visible anchoring, hierarchy, species silhouette, and environmental integration',
  },
  creature_prop: {
    profile: 'biological or creature-adjacent prop',
    dimensions: { width: 1.2, depth: 0.8, height: 0.8 },
    components: ['primary biological structure', 'attachment or support point', 'secondary anatomical or growth features', 'protective shell, membrane, bone, web, nest, or surface layer', 'opening, joint, root, or internal indication', 'environmental contact and interaction region'],
    materials: ['primary organic material', 'secondary protective or internal material', 'environmental attachment material'],
    purpose: 'a static or semi-animated biological object with coherent anatomy, growth, layering, attachment, and environmental contact',
  },
  generic_prop: {
    profile: 'specialized environmental or interactive prop',
    dimensions: { width: 1, depth: 0.8, height: 1 },
    components: ['object-specific primary body', 'supporting frame, base, or contact structure', 'functional opening, access, or receiving area', 'handle, control, closure, or interaction point', 'secondary functional assembly', 'fasteners, seams, and construction transitions', 'placement contact and service detail'],
    materials: ['primary structural material', 'secondary functional material', 'hardware or closure material', 'transparent, flexible, organic, or emissive material where the object requires it'],
    purpose: 'a recognizable purpose-built object whose silhouette, access, supports, controls, and material assembly explain how it is used',
  },
};

const PROFILES = [
  // Architecture
  { category: 'architecture', name: 'cottage or small house', pattern: /cottage|small_house|fisher_house|home_shell/, dimensions: { width: 10, depth: 8, height: 5.8 }, components: ['graded foundation', 'framed exterior walls', 'front porch or entry stoop', 'human-scale exterior door', 'framed windows', 'pitched roof with eaves', 'chimney or ventilation', 'gutters and drainage', 'utility and service connection'], materials: ['weathered siding or masonry', 'roof shingles or metal roofing', 'framed glass', 'painted doors and trim', 'foundation material'] },
  { category: 'architecture', name: 'wall or facade module', pattern: /wall|facade|storefront|retaining/, dimensions: { width: 4, depth: 0.45, height: 3.2 }, components: ['structural wall panel', 'base or foundation connection', 'left and right module edges', 'top cap, parapet, or roof connection', 'front finish layers', 'rear or interior construction face', 'opening, trim, or utility pass-through where named'], materials: ['structural wall material', 'front finish', 'trim and cap material', 'rear or interior finish'] },
  { category: 'architecture', name: 'door or portal module', pattern: /door|portal|entrance|airlock/, dimensions: { width: 1.4, depth: 0.35, height: 2.5 }, components: ['structural frame', 'door leaf or moving portal', 'threshold or sill', 'hinges, tracks, or actuators', 'handle, reader, or control', 'seals and weather protection', 'wall connection trim'], materials: ['door or portal surface', 'structural frame metal or wood', 'glass or viewing panel', 'hardware and seals'] },
  { category: 'architecture', name: 'window or glazed module', pattern: /window|glass_panel|glazing/, dimensions: { width: 1.6, depth: 0.2, height: 1.5 }, components: ['structural opening frame', 'glass or transparent panel', 'mullions or panel divisions', 'sill and head', 'weather seals', 'wall connection trim', 'interior backing or visible depth'], materials: ['framed glass', 'structural frame', 'seals and trim', 'interior backing material'] },
  { category: 'architecture', name: 'tower or vertical structure', pattern: /tower|spire/, dimensions: { width: 10, depth: 10, height: 28 }, components: ['deep foundation or anchored base', 'primary vertical frame or walls', 'stacked structural levels', 'entrance and vertical circulation', 'windows, vents, or observation openings', 'roof, crown, or antenna termination', 'service access and utility routing'], materials: ['structural concrete, stone, or steel', 'facade finish', 'framed glass or openings', 'roof or crown material', 'service hardware'] },
  { category: 'architecture', name: 'room or interior shell', pattern: /room|interior|corridor/, dimensions: { width: 8, depth: 7, height: 3.2 }, components: ['floor slab or deck', 'perimeter walls', 'ceiling or overhead structure', 'doorways and circulation openings', 'window or service openings', 'wall and floor transitions', 'utility, lighting, or ventilation connection points'], materials: ['floor finish', 'wall finish', 'ceiling finish', 'doors and trim', 'glass or service hardware'] },
  { category: 'architecture', name: 'balcony, canopy, or overhead module', pattern: /balcony|canopy|awning|roof_module/, dimensions: { width: 4, depth: 2.2, height: 1.2 }, components: ['load-bearing deck or roof surface', 'wall or column supports', 'edge beam or fascia', 'rail, drip edge, or weather boundary', 'connection brackets', 'drainage or runoff path', 'underside and service detail'], materials: ['structural frame', 'deck or roof finish', 'rail or fascia material', 'mounting hardware'] },
  // Vehicles
  { category: 'vehicle', name: 'working fishing or service boat', pattern: /fishing_boat|service_boat|patrol_boat|skiff|trawler/, dimensions: { width: 2.7, depth: 6.5, height: 2.4 }, components: ['watertight hull', 'keel and waterline structure', 'working deck', 'operator console or cabin', 'propulsion and steering', 'navigation lights', 'mooring cleats and fenders', 'safety rail and flotation gear', 'storage and service hatches'], materials: ['painted marine hull', 'non-slip deck', 'framed glass or windscreen', 'stainless or galvanized hardware', 'rubber fenders and seals'] },
  { category: 'vehicle', name: 'cart or small utility carrier', pattern: /cart|wagon|trolley/, dimensions: { width: 1.2, depth: 2, height: 1.3 }, components: ['load-bearing frame', 'cargo bed or passenger compartment', 'wheels, tracks, or lift system', 'handle, hitch, or steering control', 'braking or parking hardware', 'protective edges and lights', 'service access'], materials: ['painted metal or wood body', 'structural frame', 'rubber or lift hardware', 'handles and fasteners'] },
  { category: 'vehicle', name: 'scooter or personal transport', pattern: /scooter|bike|bicycle|motorcycle/, dimensions: { width: 0.7, depth: 1.9, height: 1.25 }, components: ['central frame', 'rider deck or saddle', 'steering column and controls', 'front and rear propulsion or wheel assemblies', 'braking system', 'headlight and rear light', 'battery, fuel, or energy service access'], materials: ['painted frame', 'rubber contact surfaces', 'metal hardware', 'lighting lenses', 'seat or grip material'] },
  { category: 'vehicle', name: 'bus, tram, or transit vehicle', pattern: /bus|tram|train|shuttle/, dimensions: { width: 2.6, depth: 11, height: 3.3 }, components: ['structural chassis or rail frame', 'passenger cabin', 'multiple access doors', 'driver or control station', 'propulsion and braking', 'windows and emergency exits', 'headlights, signals, and route display', 'interior seating and handholds', 'service and energy access'], materials: ['painted or composite body', 'structural metal', 'framed glass', 'rubber seals', 'interior flooring and seating', 'lighting lenses'] },
  { category: 'vehicle', name: 'submersible or underwater vehicle', pattern: /submarine|submersible|underwater|bubble_taxi|sea_taxi/, dimensions: { width: 3, depth: 7.5, height: 2.8 }, components: ['pressure-rated hull', 'occupant cabin', 'viewports with reinforced frames', 'thrusters and control surfaces', 'ballast or buoyancy system', 'navigation and safety lights', 'hatches and pressure seals', 'life-support and service panels'], materials: ['pressure-rated metal or composite', 'thick framed glass', 'marine seals', 'thruster hardware', 'interior and lighting materials'] },
  { category: 'vehicle', name: 'yacht or large leisure vessel', pattern: /yacht|large_boat/, dimensions: { width: 4.5, depth: 12, height: 4.5 }, components: ['deep hull and waterline', 'main deck and upper deck', 'enclosed cabin', 'helm and navigation equipment', 'propulsion and steering', 'railings and boarding access', 'navigation lights and antennas', 'mooring and safety equipment', 'engine and service compartments'], materials: ['finished marine hull', 'non-slip deck', 'framed glass', 'stainless hardware', 'upholstery and interior finish'] },
  // Furniture
  { category: 'furniture', name: 'desk or workstation', pattern: /desk|workstation|console_table/, dimensions: { width: 1.6, depth: 0.78, height: 0.76 }, components: ['work surface', 'load-bearing legs or pedestal', 'edge treatment', 'storage or modesty panel', 'cable management', 'equipment clearance', 'floor glides and fasteners'], materials: ['work-surface finish', 'structural frame', 'storage panels', 'hardware and cable fittings'] },
  { category: 'furniture', name: 'table', pattern: /table/, dimensions: { width: 1.7, depth: 0.95, height: 0.76 }, components: ['tabletop with believable thickness', 'load-bearing legs or pedestal', 'aprons or underside bracing', 'edge treatment', 'joinery and fasteners', 'floor glides', 'clear user knee and chair space'], materials: ['tabletop material', 'structural frame or legs', 'joinery hardware'] },
  { category: 'furniture', name: 'bed', pattern: /bed/, dimensions: { width: 1.7, depth: 2.15, height: 1.1 }, components: ['bed frame', 'support legs or platform', 'mattress', 'headboard', 'pillows', 'duvet or blanket', 'bedding seams and material layers'], materials: ['structural bed frame', 'mattress fabric', 'upholstery or headboard finish', 'sheets and bedding'] },
  { category: 'furniture', name: 'chair or seat', pattern: /chair|seat|stool/, dimensions: { width: 0.65, depth: 0.65, height: 1 }, components: ['seat surface or cushion', 'backrest where required', 'load-bearing frame', 'legs, pedestal, or wall mount', 'armrests where named', 'joinery and fasteners', 'floor glides'], materials: ['seat or upholstery material', 'structural frame', 'hardware and glides'] },
  { category: 'furniture', name: 'bench', pattern: /bench/, dimensions: { width: 1.85, depth: 0.72, height: 0.9 }, components: ['multiple-person seat surface', 'back support where named', 'left and right structural frames', 'center or side supports', 'armrests or dividers where required', 'fasteners', 'anchored feet or floor glides'], materials: ['seat slats or upholstery', 'structural frame', 'fasteners and anchors'] },
  { category: 'furniture', name: 'rack or shelving unit', pattern: /rack|shelf|bookcase/, dimensions: { width: 1.3, depth: 0.5, height: 1.8 }, components: ['vertical frame or side panels', 'multiple shelves, hooks, slots, or supports', 'base and anti-tip support', 'back bracing or wall anchors', 'object-retention edges', 'fasteners and joinery', 'clear loading and access space'], materials: ['structural frame', 'shelf or support surfaces', 'mounting and retention hardware'] },
  { category: 'furniture', name: 'cabinet, locker, refrigerator, or freezer', pattern: /cabinet|locker|fridge|freezer|wardrobe|dresser/, dimensions: { width: 0.95, depth: 0.68, height: 1.85 }, components: ['structural enclosure', 'hinged or sliding door', 'handles and latches', 'interior shelves, drawers, hooks, or cold-storage volume', 'hinges and seals', 'ventilation or service area where required', 'base, feet, and anti-tip support'], materials: ['painted or finished enclosure', 'interior liner or shelving', 'hardware and hinges', 'seals or glass where required'] },
  { category: 'furniture', name: 'counter or reception fixture', pattern: /counter|reception|front_desk/, dimensions: { width: 2.4, depth: 0.9, height: 1.15 }, components: ['public-facing counter surface', 'staff work surface', 'load-bearing base or frame', 'storage and cable space', 'accessible service opening', 'front finish and edge trim', 'floor anchors or glides'], materials: ['countertop finish', 'front and side panels', 'structural frame', 'hardware and cable fittings'] },
  { category: 'furniture', name: 'sofa or upholstered seating', pattern: /sofa|couch/, dimensions: { width: 2.1, depth: 0.95, height: 0.9 }, components: ['load-bearing internal frame', 'seat cushions', 'back cushions or upholstered back', 'armrests', 'feet or plinth', 'upholstery seams', 'underside support'], materials: ['upholstery or leather', 'internal frame', 'cushion fabric', 'feet or plinth finish'] },
  // Infrastructure
  { category: 'infrastructure', name: 'terminal, kiosk, station, or console', pattern: /terminal|kiosk|station|console/, dimensions: { width: 0.85, depth: 0.6, height: 1.75 }, components: ['anchored base or structural mount', 'serviceable enclosure', 'screen, control, dispensing, or working surface', 'protective bezel or guard', 'user input or connection point', 'access panel and lock', 'ventilation and cable or conduit routing', 'status lights and identification'], materials: ['painted structural enclosure', 'screen, lens, or control surface', 'hardware and locks', 'protective glass or polymer', 'foundation or mounting material'] },
  { category: 'infrastructure', name: 'machine or powered apparatus', pattern: /machine|apparatus|compressor|filter|generator|pump/, dimensions: { width: 1.1, depth: 0.85, height: 1.7 }, components: ['load-bearing frame or cabinet', 'primary working mechanism', 'motor, pump, drive, or energy module', 'controls and emergency stop', 'intake, outlet, hose, pipe, or material path', 'guards and protective enclosure', 'service panels and ventilation', 'anchored feet and warning labels'], materials: ['painted structural metal', 'mechanical hardware', 'hoses, belts, seals, or flexible parts', 'controls and warning lenses', 'foundation material'] },
  { category: 'infrastructure', name: 'gate, barrier, or fence', pattern: /gate|barrier|fence|turnstile/, dimensions: { width: 3, depth: 0.5, height: 2.2 }, components: ['anchored posts or frame', 'blocking panel, rail, bars, or moving leaf', 'hinges, tracks, pivots, or lift mechanism', 'latch, lock, reader, or control', 'protective end treatment', 'warning or identification surfaces', 'foundation and fasteners'], materials: ['structural metal, wood, or composite', 'moving or blocking surface', 'hardware and controls', 'foundation material'] },
  { category: 'infrastructure', name: 'security camera or scanner', pattern: /camera|scanner|reader|sensor/, dimensions: { width: 0.45, depth: 0.35, height: 0.45 }, components: ['wall, ceiling, pole, or pedestal mount', 'protective housing', 'lens, scanner, reader, or sensor face', 'pan, tilt, hinge, or aiming joint where required', 'status indicator', 'cable and weather seal', 'service cover and fasteners'], materials: ['painted housing', 'glass lens or scanner surface', 'mounting hardware', 'status-light material'] },
  { category: 'infrastructure', name: 'bin, dumpster, or waste receptacle', pattern: /trash|bin|dumpster/, dimensions: { width: 0.8, depth: 0.8, height: 1.2 }, components: ['stable base or wheels', 'waste container or internal liner', 'outer enclosure', 'disposal opening or lid', 'service door, lifting points, or emptying interface', 'handles, hinges, and latches', 'drainage and identification'], materials: ['painted metal or durable polymer', 'internal liner', 'hardware and hinges', 'wheels or anchors'] },
  { category: 'infrastructure', name: 'dock, crane, hoist, or marine service equipment', pattern: /dock|crane|hoist|winch|gantry/, dimensions: { width: 3, depth: 2, height: 3 }, components: ['anchored foundation, piles, or deck mount', 'primary structural frame', 'working arm, drum, lifting point, or service surface', 'cable, chain, rope, or hose path', 'motor, gearbox, or manual control', 'guards and safe working clearance', 'corrosion protection and service access'], materials: ['galvanized or painted marine structure', 'cable, rope, chain, or hose', 'mechanical hardware', 'non-slip deck or foundation'] },
  { category: 'infrastructure', name: 'bucket, trap, net, or fishing equipment', pattern: /bucket|trap|net|fishing_rig/, dimensions: { width: 0.8, depth: 0.8, height: 0.9 }, components: ['primary container, frame, hoop, or mesh body', 'handle, rope, line, or carrying point', 'opening and retention mechanism', 'weights, floats, hinges, or closure', 'reinforced edges and knots or fasteners', 'wet-zone contact and drainage', 'storage or deployment state'], materials: ['marine rope or netting', 'painted, galvanized, or polymer frame', 'handle and closure hardware', 'weights, floats, or liner material'] },
  // Signage
  { category: 'signage', name: 'freestanding or wall sign', pattern: /sign|placard|nameplate/, dimensions: { width: 1.2, depth: 0.16, height: 2.4 }, components: ['shaped sign panel', 'border or reflective trim', 'modeled or changeable content layer', 'post, wall bracket, or portable support', 'rear backing', 'fasteners and mounting collars', 'foundation or wall connection'], materials: ['sign-face material', 'lettering or symbol material', 'structural support', 'reflective, glass, or lighting material where required'] },
  { category: 'signage', name: 'information board or digital display', pattern: /board|display|scoreboard|leaderboard|whiteboard/, dimensions: { width: 1.8, depth: 0.22, height: 1.3 }, components: ['information or display surface', 'protective bezel or border', 'rear housing or backing', 'wall, post, desk, or floor support', 'content, lettering, specimen, or interface layer', 'power, lighting, cable, or service access where required', 'fasteners and viewing-angle support'], materials: ['display, board, or glass face', 'structural housing', 'border or bezel', 'content or lettering material', 'lighting and hardware'] },
  { category: 'signage', name: 'billboard or marquee', pattern: /billboard|marquee|advert/, dimensions: { width: 4, depth: 0.55, height: 3 }, components: ['large display panel', 'structural rear frame', 'posts, wall mount, or canopy support', 'changeable content layer', 'lighting fixtures or emitters', 'service catwalk or access panel', 'foundation, anchors, and cable routing'], materials: ['display face', 'structural metal', 'lettering or digital content', 'lighting lenses', 'foundation material'] },
  // Road and traversal
  { category: 'road_surface', name: 'checkpoint or obstacle-course module', pattern: /checkpoint|course|hazard|reset|timer|zipline|swing/, dimensions: { width: 4, depth: 3, height: 3 }, components: ['traversal or approach surface', 'checkpoint, obstacle, or timing structure', 'edge and fall protection', 'structural supports and anchors', 'start, finish, warning, or guidance marker', 'trigger or interaction socket', 'continuous collision and reset clearance'], materials: ['traversal surface', 'structural supports', 'safety markings', 'control or indicator material'] },
  { category: 'road_surface', name: 'platform or tile module', pattern: /platform|tile|pad/, dimensions: { width: 3, depth: 3, height: 0.35 }, components: ['load-bearing top surface', 'edge profile', 'underside or structural frame', 'module connection points', 'supports or terrain anchors', 'markings or interaction zone', 'continuous simplified collision'], materials: ['primary surface', 'structural edge and underside', 'marking or hazard material'] },
  { category: 'road_surface', name: 'bridge or elevated path', pattern: /bridge|walkway|boardwalk|catwalk|causeway/, dimensions: { width: 4, depth: 10, height: 1.2 }, components: ['continuous deck', 'primary beams, cables, piles, or supports', 'edge rails or barriers', 'entry and exit transitions', 'expansion or module joints', 'drainage and surface treatment', 'simplified walk or drive collision'], materials: ['deck surface', 'structural supports', 'rails and fasteners', 'foundation or anchor material'] },
  // Generic props and containers
  { category: 'generic_prop', name: 'crate, case, or chest', pattern: /crate|case|chest/, dimensions: { width: 1, depth: 0.8, height: 0.75 }, components: ['rigid container body', 'corner frame or reinforced edges', 'lid, door, or opening panel', 'hinges, latches, or lock', 'handles or lifting points', 'base skids, feet, or stacking interface', 'fasteners, seams, and identification markings'], materials: ['wood, metal, or composite container panels', 'structural corner frame', 'hinges, lock, and hardware', 'interior liner where required'] },
  { category: 'generic_prop', name: 'package, pouch, bag, or parcel', pattern: /package|pouch|bag|parcel|sack/, dimensions: { width: 0.5, depth: 0.35, height: 0.4 }, components: ['flexible or rigid package body', 'closure, flap, zipper, tie, or seal', 'handle, strap, or carrying point', 'contents volume and believable deformation', 'label or identification area', 'seams and reinforced corners', 'ground or hand contact surface'], materials: ['fabric, paper, leather, polymer, or cardboard body', 'closure and strap hardware', 'label or printed surface'] },
  { category: 'generic_prop', name: 'small found object', pattern: /boot|junk_can|inventory/, dimensions: { width: 0.38, depth: 0.22, height: 0.32 }, components: ['recognizable object body', 'opening or interior volume', 'sole, rim, edge, or base structure', 'surface seams or construction joints', 'wear and water-contact details', 'pickup and inventory contact point'], materials: ['object-specific primary material', 'secondary trim or interior material', 'wet, worn, or corroded surface variation'] },
  { category: 'generic_prop', name: 'buoy or floating marker', pattern: /buoy|float/, dimensions: { width: 0.75, depth: 0.75, height: 1.3 }, components: ['sealed buoyant body', 'upper marker, light, or flag', 'lower ballast or keel', 'mooring eye and chain connection', 'reflective or identification bands', 'waterline and wear transition', 'service opening where required'], materials: ['painted or polymer buoy body', 'metal mooring hardware', 'reflective and lighting material'] },
  { category: 'generic_prop', name: 'canopy or temporary cover', pattern: /canopy|tent|awning/, dimensions: { width: 4, depth: 4, height: 3 }, components: ['weather-cover surface', 'perimeter or corner frame', 'legs, poles, or wall supports', 'tension cables, brackets, or joints', 'edge, gutter, or drip treatment', 'anchors or weighted feet', 'clear covered activity area'], materials: ['fabric or panel cover', 'structural poles or frame', 'cables, brackets, and anchors'] },
  // Food
  { category: 'food', name: 'drink or beverage', pattern: /drink|beverage|softdrink|coffee|soda|cup/, dimensions: { width: 0.11, depth: 0.11, height: 0.22 }, components: ['cup, bottle, or serving container', 'liquid volume and visible level', 'rim, lid, cap, or straw', 'label or flavor identification', 'condensation, foam, ice, or temperature detail', 'stable base and hand grip'], materials: ['container material', 'liquid material', 'lid, cap, straw, or label material'] },
  { category: 'food', name: 'plated or wrapped meal', pattern: /burger|fries|noodle|bowl|wrap|meal|snack/, dimensions: { width: 0.28, depth: 0.28, height: 0.18 }, components: ['recognizable main food portion', 'separate layers, pieces, or filling', 'plate, bowl, tray, wrapper, or package', 'garnish, sauce, crust, or topping', 'utensil, closure, or handling edge where required', 'preparation and temperature surface variation'], materials: ['food layers and ingredients', 'container or serving material', 'sauce, garnish, wrapper, or utensil material'] },
  // Vegetation
  { category: 'vegetation', name: 'tree, hedge, or shrub', pattern: /tree|hedge|shrub|bush|palm/, dimensions: { width: 3, depth: 3, height: 5 }, components: ['root flare or planted base', 'primary trunk or stems', 'secondary branch hierarchy', 'leaf or frond clusters', 'species-defining crown silhouette', 'soil, planter, or terrain transition'], materials: ['bark or stem material', 'leaf or frond material', 'soil, mulch, planter, or terrain material'] },
  { category: 'vegetation', name: 'coral, kelp, or underwater growth', pattern: /coral|kelp|seaweed|algae/, dimensions: { width: 2, depth: 2, height: 2.5 }, components: ['rock, seabed, or reef anchor', 'primary coral body, stalk, or holdfast', 'secondary branches, fronds, or polyps', 'species-defining tips or leaf structures', 'current-response groups', 'substrate and marine-growth transition'], materials: ['coral, stalk, or holdfast material', 'polyps, fronds, or leaf material', 'rock, sand, or reef substrate'] },
  { category: 'vegetation', name: 'mushroom or fungal cluster', pattern: /mushroom|fungus/, dimensions: { width: 1.2, depth: 1.2, height: 1 }, components: ['mycelium, soil, or substrate base', 'multiple stems or stalks', 'caps with underside structure', 'size and maturity variation', 'cluster silhouette', 'bioluminescent or spore features where named'], materials: ['stem material', 'cap and gill material', 'soil, wood, or rock substrate', 'emissive or spore material where required'] },
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function chooseProfile(asset, category) {
  const fileName = asset.fileName.toLowerCase();
  return PROFILES.find((profile) => profile.category === category && profile.pattern.test(fileName)) || CATEGORY_BASE[category] || CATEGORY_BASE.generic_prop;
}

function materialNames(asset, profile, category) {
  const townProfile = policy.townProfiles?.[asset.town] || policy.townProfiles?.['shared-world'] || {};
  const contextual = (townProfile.palette || []).filter((entry) => entry && entry !== 'contextual');
  return unique([...(profile.materials || []), ...contextual]).slice(0, 10);
}

function geometryQuality(category, profile) {
  const base = QUALITY_DEFAULTS[category] || QUALITY_DEFAULTS.generic_prop;
  const complexityBoost = Math.max(0, (profile.components?.length || 7) - 7);
  return {
    ...base,
    minimumMeshObjects: base.minimumMeshObjects + complexityBoost,
    minimumTriangles: base.minimumTriangles + complexityBoost * 180,
    dimensionTolerance: 0.5,
    groundPivotToleranceMeters: 0.04,
    minimumPreviewCoverage: 0.008,
    maximumPreviewCoverage: 0.9,
    maximumMaterials: 12,
    requiredComponentCoverage: 1,
    automaticRetryLimit: 3,
  };
}

function canonicalDescription(asset, category, profile, components, materials) {
  const context = asset.sourceContext?.previousHeading || asset.sourceSection;
  return `${asset.displayName} is a ${profile.name || profile.profile || category} for ${asset.town}, used in the blueprint area “${context}.” Build it as ${profile.purpose || CATEGORY_BASE[category]?.purpose || CATEGORY_BASE.generic_prop.purpose}. Its silhouette must immediately read as ${asset.displayName}, and the physical assembly must include ${components.join(', ')}. Use ${materials.join(', ')} with construction, wear, mounting, and service detail appropriate to ${asset.town}. The target envelope is approximately ${profile.dimensions.width} meters wide, ${profile.dimensions.depth} meters deep, and ${profile.dimensions.height} meters high, subject only to reviewed functional protrusions.`;
}

function forbiddenFor(category, profileName) {
  return unique([
    ...(policy.prohibitedShortcuts || []),
    `generic primitive substitute for ${profileName}`,
    'flat paint or decals used in place of required physical components',
    'floating supports, impossible load paths, or unexplained environmental contact',
    'wrong human, vehicle, architectural, food, botanical, or equipment scale',
    'one undifferentiated material when the object visibly uses distinct construction categories',
  ]);
}

let derived = 0;
let contaminatedCharacterRepairs = 0;
const derivedByCategory = {};
for (const asset of deep.assets) {
  const category = classifyFinalAsset(asset);
  const weakGeneric = asset.family === 'unsupported_generic';
  const wrongCharacter = asset.family === 'unsupported_character' && category !== 'character';
  if (!weakGeneric && !wrongCharacter) continue;

  const profile = chooseProfile(asset, category);
  const categoryBase = CATEGORY_BASE[category] || CATEGORY_BASE.generic_prop;
  const components = unique([...(profile.components || []), ...(categoryBase.components || [])]).slice(0, 14);
  const materials = materialNames(asset, profile, category);
  const quality = geometryQuality(category, profile);
  const description = canonicalDescription(asset, category, profile, components, materials);

  asset.compactSpecLegacy = {
    family: asset.family,
    description: asset.description,
    dimensionsMeters: asset.dimensionsMeters,
    requiredComponents: asset.requiredComponents,
  };
  asset.description = description;
  asset.canonicalPhysicalDescription = description;
  asset.designIntent = `Make ${asset.displayName} unmistakable from silhouette and primary function. Use the ${profile.name || categoryBase.profile} profile, preserve every named component, and integrate it with the ${asset.town} environment without toy-block proportions, placeholder anatomy, or generic filler.`;
  asset.dimensionsMeters = { ...profile.dimensions };
  asset.requiredComponents = components;
  asset.materials = materials;
  asset.quality = quality;
  asset.functionalNotes = unique([
    'ground, wall, ceiling, waterline, rail, hand, or socket origin must match the placement role',
    'positive Z is the primary viewing or travel direction where direction matters',
    'stateful, animated, illuminated, openable, or serviceable parts remain separately named',
    'collision follows major blocking and interaction surfaces rather than decorative detail',
    'export as an optimized GLB with source, town, category, profile, dimensions, and license metadata',
  ]);
  asset.forbiddenShortcuts = forbiddenFor(category, profile.name || categoryBase.profile);
  asset.physicalSpecDerived = true;
  asset.physicalSpecProfile = profile.name || categoryBase.profile;
  asset.physicalSpecReason = wrongCharacter
    ? 'The compact compiler falsely inferred a character from a species or profession word; the physical object profile replaces anatomy data.'
    : 'The compact compiler had only a generic unsupported placeholder; the deep layer supplies a purpose-built physical profile.';
  asset.physicalSpecDerivedAt = new Date().toISOString();
  derived += 1;
  derivedByCategory[category] = (derivedByCategory[category] || 0) + 1;
  if (wrongCharacter) contaminatedCharacterRepairs += 1;
}

deep.physicalSpecsDerived = derived;
deep.contaminatedCharacterSpecsRepaired = contaminatedCharacterRepairs;
deep.physicalSpecsDerivedByCategory = derivedByCategory;
deep.physicalSpecPassAt = new Date().toISOString();
coverage.physicalSpecsDerived = derived;
coverage.contaminatedCharacterSpecsRepaired = contaminatedCharacterRepairs;
coverage.physicalSpecsDerivedByCategory = derivedByCategory;
coverage.physicalSpecPassAt = deep.physicalSpecPassAt;

writeFileSync(DEEP_PATH, `${JSON.stringify(deep, null, 2)}\n`);
writeFileSync(COVERAGE_PATH, `${JSON.stringify(coverage, null, 2)}\n`);

console.log(`[deep-specs] derived purpose-built physical specifications for ${derived} unsupported assets`);
console.log(`[deep-specs] repaired ${contaminatedCharacterRepairs} non-character assets that inherited anatomy data`);
console.log(`[deep-specs] derived by category: ${Object.entries(derivedByCategory).map(([category, count]) => `${category}=${count}`).join(', ')}`);
