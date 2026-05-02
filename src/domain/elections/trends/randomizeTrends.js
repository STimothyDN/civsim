import { createSeededRng, randomFloat, randomInt, sampleWithoutReplacement, shortId } from '../randomness/seededRandom'

export const RANDOM_TREND_TEMPLATES = [
  // --- National Trends ---
  {
    id: 'national-security-panic',
    label: 'National Security Panic',
    description: 'A sudden external threat or internal crisis drives a massive nationwide swing toward the military/traditionalist establishment.',
    level: 'national',
    party: 'red',
    selector: {},
    magnitudeRange: [0.30, 0.60],
  },
  {
    id: 'economic-golden-age',
    label: 'Economic Golden Age',
    description: 'Unprecedented economic prosperity creates a nationwide wave of support for the incumbent centrist establishment.',
    level: 'national',
    party: 'yellow',
    selector: {},
    magnitudeRange: [0.25, 0.50],
  },
  {
    id: 'technocratic-enlightenment',
    label: 'Technocratic Enlightenment',
    description: 'A series of scientific breakthroughs sparks a nationwide desire for rapid modernization and reform.',
    level: 'national',
    party: 'blue',
    selector: {},
    magnitudeRange: [0.25, 0.55],
  },
  {
    id: 'general-strike',
    label: 'General Strike',
    description: 'Widespread labor unrest paralyzes the nation, heavily boosting the labor party across all districts.',
    level: 'national',
    party: 'orange',
    selector: {},
    magnitudeRange: [0.35, 0.70],
  },

  // --- Provincial/Regional Trends ---
  {
    id: 'capital-region-elitism',
    label: 'Capital Region Elitism',
    description: 'The core capital region consolidates its power, heavily favoring the imperial center.',
    level: 'province',
    party: 'yellow',
    selector: { groupIncludes: 'Capital Region' },
    magnitudeRange: [0.40, 0.80],
  },
  {
    id: 'frontier-separatism',
    label: 'Frontier Separatism',
    description: 'Disaffected, low-loyalty provinces rally fiercely around autonomy and local control.',
    level: 'province',
    party: 'white',
    selector: { maxLoyaltyIndex: 0.4 },
    magnitudeRange: [0.40, 0.90],
  },
  {
    id: 'conquered-province-uprising',
    label: 'Conquered Province Uprising',
    description: 'Recently conquered provinces boil over in a massive rejection of imperial centralism, heavily favoring autonomy.',
    level: 'province',
    party: 'white',
    selector: { isConquered: true },
    magnitudeRange: [0.50, 1.0],
  },
  {
    id: 'religious-revivalism',
    label: 'Religious Revivalism',
    description: 'Provinces with high spiritual focus experience a massive religious revival, turning out heavily for traditionalists.',
    level: 'province',
    party: 'red',
    selector: { minSpiritualIndex: 0.6 },
    magnitudeRange: [0.30, 0.70],
  },
  {
    id: 'american-autonomy-wave',
    label: 'American Autonomy Wave',
    description: 'American regional interests sharpen significantly around autonomy politics.',
    level: 'province',
    party: 'white',
    selector: { groupIncludes: 'American' },
    magnitudeRange: [0.40, 0.90],
  },
  {
    id: 'roman-restorationist-stirring',
    label: 'Roman Restorationist Stirring',
    description: 'Roman identity provinces experience a powerful restorationist revival, dreaming of the old empire.',
    level: 'province',
    party: 'purple',
    selector: { minRomanIdentityIndex: 0.5 },
    magnitudeRange: [0.40, 0.90],
  },

  // --- County Trends ---
  {
    id: 'urban-middle-class-awakening',
    label: 'Urban Middle-Class Awakening',
    description: 'Commercial hubs and affluent neighborhoods swing sharply toward civic reform.',
    level: 'county',
    party: 'blue',
    selector: { minCommercialMiddleClassIndex: 0.6 },
    magnitudeRange: [0.30, 0.60],
  },
  {
    id: 'agrarian-revolt',
    label: 'Agrarian Revolt',
    description: 'Deeply rural and farming counties revolt against urban centers, rallying behind localist autonomy.',
    level: 'county',
    party: 'white',
    selector: { minAgrarianIndex: 0.7 },
    magnitudeRange: [0.40, 0.80],
  },
  {
    id: 'academic-hub-radicalization',
    label: 'Academic Hub Radicalization',
    description: 'University districts and scientific hubs become hotbeds of radical labor and reform politics.',
    level: 'county',
    party: 'orange',
    selector: { minIntellectualIndex: 0.6 },
    magnitudeRange: [0.35, 0.70],
  },
  {
    id: 'military-garrison-loyalty',
    label: 'Military Garrison Loyalty',
    description: 'Counties with heavy military presence vote in lockstep for the traditionalist establishment.',
    level: 'county',
    party: 'red',
    selector: { minMilitaryIndex: 0.6 },
    magnitudeRange: [0.40, 0.90],
  },
  {
    id: 'industrial-labor-surge',
    label: 'Industrial Labor Surge',
    description: 'Heavy industry and mining districts see a massive surge in organized labor turnout.',
    level: 'county',
    party: 'orange',
    selector: { minIndustrialIndex: 0.55 },
    magnitudeRange: [0.25, 0.60],
  },
  {
    id: 'cultural-renaissance',
    label: 'Cultural Renaissance',
    description: 'Districts rich in great works and theater squares experience a renaissance of civic engagement.',
    level: 'county',
    party: 'blue',
    selector: { minCulturalEliteIndex: 0.6 },
    magnitudeRange: [0.35, 0.65],
  },
  {
    id: 'infrastructure-boom',
    label: 'Infrastructure Boom',
    description: 'Heavily developed, rail-connected counties reward the centrist establishment for their investments.',
    level: 'county',
    party: 'yellow',
    selector: { minInfrastructureIndex: 0.7 },
    magnitudeRange: [0.30, 0.60],
  },
  {
    id: 'grievance-politics',
    label: 'Grievance Politics',
    description: 'Working-class counties suffering from low amenities and unhappiness lash out at the establishment.',
    level: 'county',
    party: 'orange',
    selector: { minWorkerGrievanceIndex: 0.55 },
    magnitudeRange: [0.40, 0.80],
  },
  {
    id: 'frontier-loyalist-surge',
    label: 'Frontier Loyalist Surge',
    description: 'Highly loyal frontier and distant provinces double down on their support for the imperial center.',
    level: 'province',
    party: 'yellow',
    selector: { minLoyaltyIndex: 0.8 },
    magnitudeRange: [0.30, 0.60],
  },
]

export function generateRandomTrendPackage({ seed, minTrends = 3, maxTrends = 7, templates = RANDOM_TREND_TEMPLATES } = {}) {
  const rng = createSeededRng(seed || 'random-election')
  const count = randomInt(rng, minTrends, maxTrends)
  const selectedTemplates = sampleWithoutReplacement(rng, templates, count)

  return selectedTemplates.map((template) => {
    const [minMagnitude, maxMagnitude] = template.magnitudeRange
    return {
      id: `${template.id}-${shortId(rng)}`,
      templateId: template.id,
      label: template.label,
      description: template.description || '',
      level: template.level,
      party: template.party,
      selector: template.selector,
      magnitude: randomFloat(rng, minMagnitude, maxMagnitude),
      source: 'random',
    }
  })
}

