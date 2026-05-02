export const defaultTemplate = {
  country: {
    basic_info: {
      name: "",
      leader: "",
    },
    total_population: null,
    state_religion: null,
    economy: {
      gold_per_turn: null,
      faith_per_turn: null,
      culture_per_turn: null,
      science_per_turn: null,
    },
  },
  provinces: [],
  province_groups: [],
  global_religions: [],
};

export function createEmptyReligion() {
  return {
    name: "",
    followers: null,
  };
}

export function createEmptyCounty() {
  return {
    name: "",
    tile_id: "",
    distance_from_center: null,
    terrain: "",
    features: {},
    improvement: {
      name: "",
      buildings: {},
      great_works: {},
    },
    resource: null,
    citizens_working: null,
    river: null,
    has_railroad: false,
    appeal: null,
    yields: {
      amenities: null,
      food: null,
      production: null,
      gold: null,
      culture: null,
      science: null,
      faith: null,
      tourism: null,
    },
  };
}

export function createEmptyClosestProvince() {
  return {
    province_name: "",
    distance: null,
  };
}

export function createEmptyClosestProvinces() {
  return Array.from({ length: 5 }, () => createEmptyClosestProvince());
}

function closestProvinceDistance(entry) {
  const value = entry?.distance
  if (value === null || value === undefined || value === '') return Number.POSITIVE_INFINITY
  const distance = Number(value)
  return Number.isFinite(distance) ? distance : Number.POSITIVE_INFINITY
}

export function sortClosestProvinces(value) {
  if (!Array.isArray(value)) return value

  const sorted = value
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const distanceDiff = closestProvinceDistance(a.entry) - closestProvinceDistance(b.entry)
      return distanceDiff || a.index - b.index
    })
    .map(({ entry }) => entry)

  value.splice(0, value.length, ...sorted)
  return value
}

export function createEmptyProvince() {
  return {
    name: "",
    city_id: null,
    is_national_capital: false,
    is_regional_capital: false,
    is_founded: false,
    is_joined: false,
    is_conquered: false,
    population: null,
    loyalty: null,
    growth_percentage: null,
    happiness_percentage: null,
    yields: {
      amenities: null,
      food: null,
      production: null,
      gold: null,
      culture: null,
      science: null,
      faith: null,
    },
    religions: [createEmptyReligion()],
    housing: null,
    net_amenities: null,
    net_food: null,
    closest_provinces: createEmptyClosestProvinces(),
    counties: [createEmptyCounty()],
    group: null,
    original_country: "",
    notes: "",
  };
}

function normalizeClosestProvinces(value) {
  const source = Array.isArray(value) ? value : []
  const normalized = source.map((entry) => {
    if (entry && typeof entry === 'object') {
      return {
        province_name: entry.province_name ?? entry.name ?? "",
        distance: entry.distance ?? null,
      }
    }
    return createEmptyClosestProvince()
  })

  sortClosestProvinces(normalized)
  const closestFive = normalized.slice(0, 5)
  while (closestFive.length < 5) closestFive.push(createEmptyClosestProvince())
  return closestFive
}

export function normalizeIds(data) {
  if (!data || !Array.isArray(data.provinces)) return;
  data.provinces.forEach((province, provinceIndex) => {
    province.city_id = provinceIndex + 1;

    // Migrate old is_capital -> is_national_capital
    if (province.is_capital !== undefined) {
      if (province.is_national_capital === undefined) {
        province.is_national_capital = !!province.is_capital
      }
      delete province.is_capital
    }
    if (province.is_national_capital === undefined) province.is_national_capital = false
    if (province.is_regional_capital === undefined) province.is_regional_capital = false
    if (province.original_country === undefined) province.original_country = ""
    province.closest_provinces = normalizeClosestProvinces(province.closest_provinces)

    if (!Array.isArray(province.counties)) {
      province.counties = [];
    }
    province.counties.forEach((county, countyIndex) => {
      county.tile_id = `tile_${countyIndex + 1}`;
      if (county.name === undefined) county.name = ""
      if (county.distance_from_center === undefined) county.distance_from_center = null
      // ensure new schema defaults exist so older JSON still works
      if (!county.features || typeof county.features !== 'object') county.features = {}
      if (county.resource && typeof county.resource === 'string') {
        county.features[county.resource.trim()] = true
      }
      if (county.river === undefined) county.river = null
      if (county.has_railroad === undefined) county.has_railroad = false
      if (county.appeal === undefined) county.appeal = null
      // migrate old string improvement to new object shape
      if (typeof county.improvement === 'string' || county.improvement === null || county.improvement === undefined) {
        county.improvement = { name: county.improvement || '', buildings: {}, great_works: {} }
      } else if (typeof county.improvement === 'object') {
        if (!county.improvement.buildings) county.improvement.buildings = {}
        if (!county.improvement.great_works) county.improvement.great_works = {}
      }
      if (!county.yields || typeof county.yields !== 'object') {
        county.yields = {
          amenities: null,
          food: null,
          production: null,
          gold: null,
          culture: null,
          science: null,
          faith: null,
          tourism: null,
        }
      }
    });
  });
}

export function createBlankArrayItem(path) {
  if (path === 'provinces') return createEmptyProvince();
  if (path === 'province_groups') return '';
  if (/\.religions$/.test(path)) return createEmptyReligion();
  if (/\.closest_provinces$/.test(path)) return createEmptyClosestProvince();
  if (/\.counties$/.test(path)) return createEmptyCounty();
  return null;
}
