export interface CityDefinition {
  id: string;
  name: string;
  state: string;
  description: string;
  sceneBonus: string;   // which aspect of career it helps
  topGenres: string[];
}

export interface RegionGroup {
  id: string;
  label: string;
  description: string;
  cities: CityDefinition[];
}

export const CITIES: CityDefinition[] = [
  {
    id: 'atlanta',
    name: 'Atlanta',
    state: 'GA',
    description: 'The trap capital. If you blow up in Atlanta, the world follows.',
    sceneBonus: 'Hip-hop industry connections',
    topGenres: ['hip-hop', 'r&b'],
  },
  {
    id: 'los-angeles',
    name: 'Los Angeles',
    state: 'CA',
    description: 'Hollywood money meets music industry power. Every genre lives here.',
    sceneBonus: 'Label access and media exposure',
    topGenres: ['pop', 'hip-hop', 'electronic'],
  },
  {
    id: 'new-york',
    name: 'New York',
    state: 'NY',
    description: 'The original rap capital. Critics live here. So does the prestige.',
    sceneBonus: 'Critical respect and media coverage',
    topGenres: ['hip-hop', 'pop', 'r&b'],
  },
  {
    id: 'houston',
    name: 'Houston',
    state: 'TX',
    description: 'Slowed down and screwed. Houston moves different. The culture is unbreakable.',
    sceneBonus: 'Fan loyalty and authentic credibility',
    topGenres: ['hip-hop', 'r&b', 'country'],
  },
  {
    id: 'chicago',
    name: 'Chicago',
    state: 'IL',
    description: 'The Chi breeds grit. Drill music, conscious rap, everything lives here.',
    sceneBonus: 'Authenticity and underground credibility',
    topGenres: ['hip-hop', 'r&b', 'electronic'],
  },
  {
    id: 'miami',
    name: 'Miami',
    state: 'FL',
    description: 'Party culture, Latin influence, and massive club scenes.',
    sceneBonus: 'Latin crossover and viral potential',
    topGenres: ['latin', 'electronic', 'hip-hop'],
  },
  {
    id: 'nashville',
    name: 'Nashville',
    state: 'TN',
    description: 'Country\'s capital. Music row is real. The crossover is always on the table.',
    sceneBonus: 'Country industry access',
    topGenres: ['country', 'pop', 'rock'],
  },
  {
    id: 'detroit',
    name: 'Detroit',
    state: 'MI',
    description: 'Motor City grit. Birthplace of Motown. The scene rewards realness.',
    sceneBonus: 'Authenticity and cult following',
    topGenres: ['hip-hop', 'electronic', 'r&b'],
  },
  {
    id: 'seattle',
    name: 'Seattle',
    state: 'WA',
    description: 'Independent spirit and indie culture. Go against the grain here.',
    sceneBonus: 'Indie credibility and artistic respect',
    topGenres: ['rock', 'electronic', 'indie'],
  },
  {
    id: 'dallas',
    name: 'Dallas',
    state: 'TX',
    description: 'Big city, big ambitions. Country and hip-hop collide here.',
    sceneBonus: 'Broad genre flexibility',
    topGenres: ['hip-hop', 'country', 'r&b'],
  },
];

const intl = (
  id: string,
  name: string,
  country: string,
  description: string,
  sceneBonus: string,
  topGenres: string[],
): CityDefinition => ({ id, name, state: country, description, sceneBonus, topGenres });

const EUROPEAN_CITIES: CityDefinition[] = [
  intl('london', 'London', 'UK', 'The global music capital outside the US. Grime, drill, and pop all start here.', 'International media and label reach', ['hip-hop', 'pop', 'electronic']),
  intl('paris', 'Paris', 'France', 'Fashion, film, and a fierce rap scene. Culture and credibility collide.', 'Crossover prestige and fashion ties', ['hip-hop', 'pop', 'electronic']),
  intl('berlin', 'Berlin', 'Germany', 'The techno heart of the world. Underground energy never sleeps.', 'Electronic scene and festival circuit', ['electronic', 'pop']),
  intl('amsterdam', 'Amsterdam', 'Netherlands', 'Dance music HQ. EDM money and global streaming power.', 'Electronic industry connections', ['electronic', 'pop']),
  intl('stockholm', 'Stockholm', 'Sweden', 'The pop songwriting factory of the planet. Hooks are a science here.', 'Pop songwriting and production', ['pop', 'electronic']),
  intl('madrid', 'Madrid', 'Spain', 'Latin pop power and a booming urbano scene.', 'Latin crossover and streaming', ['latin', 'pop']),
  intl('barcelona', 'Barcelona', 'Spain', 'Festival culture and a Latin-electronic fusion playground.', 'Festival exposure and Latin reach', ['latin', 'electronic', 'pop']),
  intl('milan', 'Milan', 'Italy', 'Fashion-week glamour with a fast-growing rap underground.', 'Brand deals and image building', ['hip-hop', 'pop']),
  intl('dublin', 'Dublin', 'Ireland', 'Small city, huge songwriting legacy. Authenticity travels far.', 'Indie credibility and authenticity', ['rock', 'pop']),
  intl('manchester', 'Manchester', 'UK', 'A working-class music engine. Indie and rave history runs deep.', 'Indie and electronic credibility', ['rock', 'electronic', 'pop']),
  intl('copenhagen', 'Copenhagen', 'Denmark', 'Minimal, cool, and design-driven. Tastemakers watch this scene.', 'Tastemaker buzz and indie respect', ['electronic', 'pop']),
  intl('lisbon', 'Lisbon', 'Portugal', 'A rising hub bridging Europe, Africa, and Brazil.', 'Afro-Latin fusion reach', ['latin', 'electronic', 'r&b']),
  intl('vienna', 'Vienna', 'Austria', 'Classical roots, modern electronic edge. Artistic respect matters.', 'Artistic prestige and craft', ['electronic', 'pop']),
  intl('oslo', 'Oslo', 'Norway', 'Pristine pop and dark experimental sounds in equal measure.', 'Pop polish and artistic risk', ['pop', 'electronic']),
  intl('brussels', 'Brussels', 'Belgium', 'A quiet powerhouse for dance and Afro-European crossover.', 'Electronic and crossover access', ['electronic', 'r&b', 'pop']),
];

const ASIAN_CITIES: CityDefinition[] = [
  intl('tokyo', 'Tokyo', 'Japan', 'A massive, loyal market with its own rules and unmatched fan culture.', 'Devoted fanbase and merch power', ['pop', 'electronic']),
  intl('seoul', 'Seoul', 'South Korea', 'The K-pop machine. Training, polish, and global virality.', 'Production polish and viral reach', ['pop', 'hip-hop', 'electronic']),
  intl('shanghai', 'Shanghai', 'China', 'A huge emerging market with explosive streaming numbers.', 'Massive streaming audience', ['pop', 'hip-hop']),
  intl('mumbai', 'Mumbai', 'India', 'Bollywood gravity and a billion-strong listening base.', 'Film tie-ins and scale', ['pop', 'hip-hop']),
  intl('bangkok', 'Bangkok', 'Thailand', 'Southeast Asia\'s nightlife and pop crossover hub.', 'Regional crossover and touring', ['pop', 'electronic', 'hip-hop']),
  intl('singapore', 'Singapore', 'Singapore', 'A polished gateway between East and West markets.', 'Industry access and stability', ['pop', 'electronic']),
  intl('manila', 'Manila', 'Philippines', 'One of the most music-obsessed cities on earth. Vocals win here.', 'Vocal fanbase and loyalty', ['pop', 'r&b']),
  intl('jakarta', 'Jakarta', 'Indonesia', 'A booming young market with a hungry streaming generation.', 'Young viral audience', ['pop', 'hip-hop', 'electronic']),
  intl('hong-kong', 'Hong Kong', 'Hong Kong', 'East-meets-West glamour with deep industry money.', 'Label money and media', ['pop', 'electronic']),
  intl('dubai', 'Dubai', 'UAE', 'Luxury, global tours, and a magnet for international stars.', 'Luxury branding and touring', ['hip-hop', 'pop', 'electronic']),
];

const AFRICAN_CITIES: CityDefinition[] = [
  intl('lagos', 'Lagos', 'Nigeria', 'The afrobeats epicenter. The sound the whole world is chasing.', 'Afrobeats global momentum', ['pop', 'r&b', 'hip-hop']),
  intl('accra', 'Accra', 'Ghana', 'Highlife roots and a young, viral-ready creative scene.', 'Fresh sound and viral energy', ['pop', 'r&b', 'hip-hop']),
  intl('johannesburg', 'Johannesburg', 'South Africa', 'Amapiano was born here. The groove travels everywhere.', 'Amapiano and dance crossover', ['electronic', 'pop', 'r&b']),
  intl('nairobi', 'Nairobi', 'Kenya', 'East Africa\'s fast-rising hub for hip-hop and gengetone.', 'Regional hip-hop leadership', ['hip-hop', 'pop']),
  intl('cairo', 'Cairo', 'Egypt', 'The Arabic-world media center with a huge young audience.', 'Arabic-market media reach', ['pop', 'hip-hop']),
  intl('cape-town', 'Cape Town', 'South Africa', 'Scenic, indie-leaning, and creatively respected.', 'Indie and artistic credibility', ['rock', 'electronic', 'pop']),
  intl('dakar', 'Dakar', 'Senegal', 'A storied hip-hop and mbalax stronghold. Lyricism is sacred.', 'Lyrical credibility and authenticity', ['hip-hop', 'pop']),
  intl('abidjan', 'Abidjan', 'Ivory Coast', 'Coupé-décalé energy and francophone dancefloor dominance.', 'Francophone dance reach', ['electronic', 'pop', 'hip-hop']),
  intl('kinshasa', 'Kinshasa', 'DR Congo', 'The rumba heartbeat that shaped a continent\'s sound.', 'Deep musical heritage', ['pop', 'r&b']),
  intl('addis-ababa', 'Addis Ababa', 'Ethiopia', 'A singular musical tradition with a growing modern scene.', 'Distinct sound and authenticity', ['pop', 'r&b']),
];

export const REGION_GROUPS: RegionGroup[] = [
  {
    id: 'europe',
    label: 'European',
    description: 'London, Paris, Berlin and 12 more European music cities.',
    cities: EUROPEAN_CITIES,
  },
  {
    id: 'asia',
    label: 'Asian',
    description: 'Tokyo, Seoul, Mumbai and 7 more Asian music cities.',
    cities: ASIAN_CITIES,
  },
  {
    id: 'africa',
    label: 'African',
    description: 'Lagos, Accra, Johannesburg and 7 more African music cities.',
    cities: AFRICAN_CITIES,
  },
];
