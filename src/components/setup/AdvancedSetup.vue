<template>
  <div class="advanced-setup">
    <!-- LIVE RESULTS PREVIEW — recomputes instantly as the matrix is tuned -->
    <section class="live-preview">
      <header class="live-preview__head">
        <h3>Live National Result</h3>
        <p>Updates instantly as you tune the model below.</p>
      </header>

      <div v-if="hasResults" class="party-result-cards">
        <div
          v-for="party in parties"
          :key="party.id"
          class="party-result-card"
          :style="{ '--party-color': party.color }"
        >
          <div class="party-result-card__head">
            <span class="party-result-card__swatch" :style="{ background: party.color }"></span>
            <strong>{{ party.abbreviation }}</strong>
            <small>{{ party.name }}</small>
          </div>
          <div class="party-result-card__stats">
            <div class="prc-stat">
              <span class="prc-stat__label">Assembly</span>
              <span class="prc-stat__pct">{{ pct(assemblyShares[party.id]) }}</span>
              <span class="prc-stat__seats">{{ assemblySeats[party.id] || 0 }} seats</span>
            </div>
            <div class="prc-stat">
              <span class="prc-stat__label">Council</span>
              <span class="prc-stat__pct">{{ pct(councilShares[party.id]) }}</span>
              <span class="prc-stat__seats">{{ councilSeats[party.id] || 0 }} seats</span>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="live-preview__empty">Add province data to preview live election results here.</p>

      <PowerBalanceStrip v-if="hasResults" :results="results" :party-meta="partyMeta" />
    </section>

    <div class="advanced-tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="advanced-tab"
        :class="{ 'advanced-tab--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- POLITICAL MODEL: feature × party affinity matrix -->
    <section v-if="activeTab === 'model'" class="setup-panel">
      <header class="setup-panel__head">
        <h3>Political Model</h3>
        <p>Each party's score is its base support plus the weighted sum of these feature affinities. Positive pulls the party up; negative pushes it down. Defaults reproduce the bundled example.</p>
      </header>

      <!-- WEIGHT GENERATORS -->
      <div class="generators">
        <div class="generators__buttons">
          <button type="button" class="btn-generate" @click="applyWeights('balanced')">
            Balanced Weights <InfoTip :text="TIPS.genBalanced" />
          </button>
          <button type="button" class="btn-generate" @click="applyWeights('data-driven')">
            Data Driven Weights <InfoTip :text="TIPS.genDataDriven" />
          </button>
          <button type="button" class="btn-generate" @click="applyWeights('random')">
            Randomize Weights <InfoTip :text="TIPS.genRandom" />
          </button>
        </div>
        <p class="generators__note">These overwrite all matrix weights below from your input data. Balanced respects each party's Major / Minor tier.</p>

        <div class="tier-row">
          <span class="tier-row__label">Party tiers <InfoTip :text="TIPS.tier" /></span>
          <div v-for="party in parties" :key="party.id" class="tier-chip">
            <span class="tier-chip__swatch" :style="{ background: party.color }"></span>
            <span class="tier-chip__abbr">{{ party.abbreviation }}</span>
            <div class="tier-toggle" role="group" :aria-label="`${party.name} tier`">
              <button
                type="button"
                :class="{ 'tier-toggle__btn--active': party.tier !== 'minor' }"
                @click="store.setPartyTier(party.id, 'major')"
              >Major</button>
              <button
                type="button"
                :class="{ 'tier-toggle__btn--active': party.tier === 'minor' }"
                @click="store.setPartyTier(party.id, 'minor')"
              >Minor</button>
            </div>
          </div>
        </div>
      </div>

      <div class="scope-tabs">
        <button
          v-for="scope in scopes"
          :key="scope"
          type="button"
          class="scope-tab"
          :class="{ 'scope-tab--active': activeScope === scope }"
          @click="activeScope = scope"
        >{{ scopeLabel(scope) }}</button>
      </div>

      <div class="matrix-wrap">
        <table class="matrix">
          <thead>
            <tr>
              <th class="matrix__feature">Feature</th>
              <th v-for="party in parties" :key="party.id" :style="{ color: party.color }">{{ party.abbreviation }}</th>
            </tr>
          </thead>
          <tbody>
            <tr class="matrix__bias">
              <td class="matrix__feature">
                <strong>Base support</strong>
                <InfoTip :text="BIAS_TIP" />
              </td>
              <td v-for="(party, pi) in parties" :key="party.id">
                <div class="bias-cell">
                  <input
                    type="range" :min="BIAS_MIN" :max="BIAS_MAX" step="0.01"
                    :value="clampBias(party.bias?.[activeScope])"
                    :aria-label="`${party.name} base support`"
                    @input="setNum(`config.parties[${pi}].bias.${activeScope}`, $event)"
                  />
                  <input
                    type="number" step="0.01"
                    class="bias-num"
                    :value="party.bias?.[activeScope] ?? 0"
                    @input="setNum(`config.parties[${pi}].bias.${activeScope}`, $event)"
                  />
                </div>
              </td>
            </tr>
            <template v-for="group in groups" :key="group">
              <tr class="matrix__group"><td :colspan="parties.length + 1">{{ group }}</td></tr>
              <tr v-for="feature in featuresInGroup(group)" :key="feature.key">
                <td class="matrix__feature">
                  {{ feature.label }}
                  <InfoTip :text="featureTip(feature)" />
                </td>
                <td v-for="(party, pi) in parties" :key="party.id">
                  <input
                    type="number" step="0.01"
                    :value="affinity(party, feature.key)"
                    @input="setNum(`config.parties[${pi}].affinities.${activeScope}.${feature.key}`, $event)"
                  />
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>

    <!-- VOTER BLOCS -->
    <section v-else-if="activeTab === 'blocs'" class="setup-panel">
      <header class="setup-panel__head">
        <h3>Voter Blocs</h3>
        <p>Targeted support: voters matching a rule (origin country, province group, or religion) lean toward a party. Replaces the old hardcoded identity voters.</p>
      </header>

      <div v-for="(bloc, i) in voterBlocs" :key="i" class="bloc-card">
        <div class="bloc-row">
          <label>Label <InfoTip :text="TIPS.blocLabel" /><input :value="bloc.label" @input="setText(`config.voterBlocs[${i}].label`, $event)" /></label>
          <label>Party <InfoTip :text="TIPS.blocParty" />
            <select :value="bloc.party" @change="setText(`config.voterBlocs[${i}].party`, $event)">
              <option v-for="p in parties" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </label>
          <button type="button" class="icon-danger" :aria-label="`Remove ${bloc.label}`" @click="store.removeVoterBloc(i)"><Trash2 :size="15" /></button>
        </div>
        <div class="bloc-row">
          <label>Match by <InfoTip :text="TIPS.blocMatch" />
            <select :value="sourceKind(bloc)" @change="setSourceKind(i, $event.target.value)">
              <option value="originalCountry">Origin country</option>
              <option value="group">Province group</option>
              <option value="religion">Religion</option>
            </select>
          </label>
          <label v-if="sourceKind(bloc) !== 'religion'">Contains (comma-separated) <InfoTip :text="TIPS.blocContains" />
            <input :value="sourceValue(bloc)" @input="setSourceValue(i, bloc, $event.target.value)" />
          </label>
          <template v-else>
            <label>Religion <InfoTip :text="TIPS.blocReligion" /><input :value="bloc.source?.religion || ''" @input="setText(`config.voterBlocs[${i}].source.religion`, $event)" /></label>
          </template>
        </div>
        <div class="bloc-row bloc-strength">
          <label v-for="scope in scopes" :key="scope">{{ scopeLabel(scope) }} strength <InfoTip :text="TIPS.blocStrength" />
            <input type="number" step="0.01" :value="bloc.strength?.[scope] ?? 0" @input="setNum(`config.voterBlocs[${i}].strength.${scope}`, $event)" />
          </label>
        </div>
      </div>

      <button type="button" class="btn-primary" @click="store.addVoterBloc()"><Plus :size="16" /> Add Voter Bloc</button>
    </section>

    <!-- CHAMBERS & TITLES -->
    <section v-else-if="activeTab === 'chambers'" class="setup-panel">
      <header class="setup-panel__head">
        <h3>Chambers &amp; Titles</h3>
        <p>Name the legislative chambers and leader titles at each level. Use <code>{place}</code> as a placeholder for a region or province name.</p>
      </header>

      <div class="chamber-grid">
        <div class="chamber-col">
          <h4>Lower House <InfoTip :text="TIPS.lowerHouse" /></h4>
          <label>National name <InfoTip :text="TIPS.chamberNationalName" /><input :value="chambers.lower?.nationalName" @input="setText('config.chambers.lower.nationalName', $event)" /></label>
          <label>Regional template <InfoTip :text="TIPS.chamberTemplate" /><input :value="chambers.lower?.regionalTemplate" @input="setText('config.chambers.lower.regionalTemplate', $event)" /></label>
          <label>Provincial template <InfoTip :text="TIPS.chamberTemplate" /><input :value="chambers.lower?.provincialTemplate" @input="setText('config.chambers.lower.provincialTemplate', $event)" /></label>
          <label>National leader title <InfoTip :text="TIPS.leaderTitle" /><input :value="chambers.lower?.leaderTitles?.national" @input="setText('config.chambers.lower.leaderTitles.national', $event)" /></label>
          <label>Regional leader title <input :value="chambers.lower?.leaderTitles?.regional" @input="setText('config.chambers.lower.leaderTitles.regional', $event)" /></label>
          <label>Provincial leader title <input :value="chambers.lower?.leaderTitles?.provincial" @input="setText('config.chambers.lower.leaderTitles.provincial', $event)" /></label>
        </div>
        <div class="chamber-col">
          <h4>Upper House <InfoTip :text="TIPS.upperHouse" /></h4>
          <label>National name <InfoTip :text="TIPS.chamberNationalName" /><input :value="chambers.upper?.nationalName" @input="setText('config.chambers.upper.nationalName', $event)" /></label>
          <label>Regional template <InfoTip :text="TIPS.chamberTemplate" /><input :value="chambers.upper?.regionalTemplate" @input="setText('config.chambers.upper.regionalTemplate', $event)" /></label>
          <label>Provincial template <InfoTip :text="TIPS.chamberTemplate" /><input :value="chambers.upper?.provincialTemplate" @input="setText('config.chambers.upper.provincialTemplate', $event)" /></label>
          <label>National leader title <InfoTip :text="TIPS.leaderTitle" /><input :value="chambers.upper?.leaderTitles?.national" @input="setText('config.chambers.upper.leaderTitles.national', $event)" /></label>
          <label>Regional leader title <input :value="chambers.upper?.leaderTitles?.regional" @input="setText('config.chambers.upper.leaderTitles.regional', $event)" /></label>
          <label>Provincial leader title <input :value="chambers.upper?.leaderTitles?.provincial" @input="setText('config.chambers.upper.leaderTitles.provincial', $event)" /></label>
        </div>
      </div>
    </section>

    <!-- REPRESENTATIVE NAMING -->
    <section v-else-if="activeTab === 'naming'" class="setup-panel">
      <header class="setup-panel__head">
        <h3>Representative Naming</h3>
        <p>Names for elected representatives are drawn from your <strong>home culture</strong>, plus optional minority/foreign cultures that appear where they match a province (by origin country or group) or are tied to a party. Enter one name per line.</p>
      </header>

      <div class="naming-culture naming-culture--home">
        <h4>Home culture <InfoTip :text="TIPS.homeCulture" /></h4>
        <label class="naming-field">Culture label
          <input :value="naming.homeCulture?.label" @input="setText('config.naming.homeCulture.label', $event)" />
        </label>
        <div class="naming-banks">
          <label>Given names — male <InfoTip :text="TIPS.givenNames" />
            <textarea :value="nameListText(naming.homeCulture?.givenMale)" @input="setNameList('config.naming.homeCulture.givenMale', $event)"></textarea>
          </label>
          <label>Given names — female
            <textarea :value="nameListText(naming.homeCulture?.givenFemale)" @input="setNameList('config.naming.homeCulture.givenFemale', $event)"></textarea>
          </label>
          <label>Surnames <InfoTip :text="TIPS.surnames" />
            <textarea :value="nameListText(naming.homeCulture?.surnames)" @input="setNameList('config.naming.homeCulture.surnames', $event)"></textarea>
          </label>
        </div>
        <div class="naming-actions">
          <button
            type="button"
            class="btn-generate btn-generate--llm"
            :disabled="generatingKey === 'home'"
            @click="generateNames('home', 'config.naming.homeCulture', naming.homeCulture)"
          >
            <Sparkles :size="14" />
            {{ generatingKey === 'home' ? 'Generating…' : 'Generate names (LM Studio)' }}
            <InfoTip :text="TIPS.generateNames" />
          </button>
        </div>
      </div>

      <h4>Minority &amp; foreign cultures <InfoTip :text="TIPS.cultures" /></h4>
      <div v-for="(culture, i) in (naming.cultures || [])" :key="i" class="naming-culture">
        <div class="naming-culture__head">
          <input class="naming-culture__label" :value="culture.label" @input="setText(`config.naming.cultures[${i}].label`, $event)" />
          <button type="button" class="icon-danger" :aria-label="`Remove ${culture.label}`" @click="store.removeCulture(i)"><Trash2 :size="15" /></button>
        </div>

        <div class="naming-rules">
          <label>Appears where <InfoTip :text="TIPS.cultureMatch" />
            <select :value="cultureMatchKind(culture)" @change="setCultureMatchKind(i, $event.target.value)">
              <option value="none">Only via party / ambient</option>
              <option value="originalCountry">Origin country contains</option>
              <option value="group">Province group contains</option>
            </select>
          </label>
          <label v-if="cultureMatchKind(culture) !== 'none'">Match text (comma-separated)
            <input :value="cultureMatchValue(culture)" @input="setCultureMatchValue(i, culture, $event.target.value)" />
          </label>
          <label>Ambient chance <InfoTip :text="TIPS.cultureAmbient" />
            <input type="number" step="0.01" min="0" max="1" :value="culture.ambient ?? 0" @input="setNum(`config.naming.cultures[${i}].ambient`, $event)" />
          </label>
          <label>Surname blend <InfoTip :text="TIPS.surnameBlend" />
            <input type="number" step="0.05" min="0" max="1" :value="culture.surnameBlend ?? 0" @input="setNum(`config.naming.cultures[${i}].surnameBlend`, $event)" />
          </label>
        </div>

        <div class="naming-parties">
          <span class="naming-parties__label">Party ties <InfoTip :text="TIPS.cultureParties" /></span>
          <label v-for="p in parties" :key="p.id" class="naming-party-chip">
            <input type="checkbox" :checked="(culture.parties || []).includes(p.id)" @change="toggleCultureParty(i, culture, p.id)" />
            <span :style="{ color: p.color }">{{ p.abbreviation }}</span>
          </label>
        </div>

        <div class="naming-banks">
          <label>Given names — male
            <textarea :value="nameListText(culture.givenMale)" @input="setNameList(`config.naming.cultures[${i}].givenMale`, $event)"></textarea>
          </label>
          <label>Given names — female
            <textarea :value="nameListText(culture.givenFemale)" @input="setNameList(`config.naming.cultures[${i}].givenFemale`, $event)"></textarea>
          </label>
          <label>Surnames (blank = use home) <InfoTip :text="TIPS.cultureSurnames" />
            <textarea :value="nameListText(culture.surnames)" @input="setNameList(`config.naming.cultures[${i}].surnames`, $event)"></textarea>
          </label>
        </div>
        <div class="naming-actions">
          <button
            type="button"
            class="btn-generate btn-generate--llm"
            :disabled="generatingKey === `culture-${i}`"
            @click="generateNames(`culture-${i}`, `config.naming.cultures[${i}]`, culture)"
          >
            <Sparkles :size="14" />
            {{ generatingKey === `culture-${i}` ? 'Generating…' : 'Generate names (LM Studio)' }}
            <InfoTip :text="TIPS.generateNames" />
          </button>
        </div>
      </div>

      <button type="button" class="btn-primary" @click="store.addCulture()"><Plus :size="16" /> Add Culture</button>
    </section>

    <!-- CALCULATION PARAMETERS -->
    <section v-else-if="activeTab === 'calc'" class="setup-panel">
      <header class="setup-panel__head">
        <h3>Calculation Parameters</h3>
        <p>Tune the population scaling curve, prelate seat ladder, and election-year cadence. Defaults match the original engine.</p>
      </header>

      <h4>Election Year</h4>
      <div class="field-grid">
        <label>First election year <InfoTip :text="TIPS.yearBase" /><input type="number" :value="calc.electionYear?.base" @input="setNum('config.calculations.electionYear.base', $event)" /></label>
        <label>Years per cycle <InfoTip :text="TIPS.yearIncrement" /><input type="number" :value="calc.electionYear?.increment" @input="setNum('config.calculations.electionYear.increment', $event)" /></label>
      </div>

      <h4>Provincial Population Scaling <InfoTip :text="TIPS.popScaling" /></h4>
      <div class="field-grid">
        <label>Pop divisor <InfoTip :text="TIPS.popDivisor" /><input type="number" step="0.1" :value="pop.popDivisor" @input="setNum('config.calculations.provincialPopulation.popDivisor', $event)" /></label>
        <label>Pop power <InfoTip :text="TIPS.popPower" /><input type="number" step="0.01" :value="pop.popPower" @input="setNum('config.calculations.provincialPopulation.popPower', $event)" /></label>
        <label>Scale <InfoTip :text="TIPS.popScale" /><input type="number" step="0.01" :value="pop.scale" @input="setNum('config.calculations.provincialPopulation.scale', $event)" /></label>
        <label>Base multiplier <InfoTip :text="TIPS.popBaseMultiplier" /><input type="number" :value="pop.baseMultiplier" @input="setNum('config.calculations.provincialPopulation.baseMultiplier', $event)" /></label>
        <label>Exponent base <InfoTip :text="TIPS.popExponent" /><input type="number" step="0.01" :value="pop.exponentBase" @input="setNum('config.calculations.provincialPopulation.exponentBase', $event)" /></label>
      </div>

      <h4>Prelate Seat Tiers <InfoTip :text="TIPS.prelateTiers" /></h4>
      <table class="tiers">
        <thead><tr><th>Min provincial population</th><th>Seats</th><th></th></tr></thead>
        <tbody>
          <tr v-for="(tier, ti) in prelateTiers" :key="ti">
            <td><input type="number" :value="tier.min" @input="setNum(`config.calculations.prelateTiers[${ti}].min`, $event)" /></td>
            <td><input type="number" :value="tier.seats" @input="setNum(`config.calculations.prelateTiers[${ti}].seats`, $event)" /></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ELECTION RULES -->
    <section v-else-if="activeTab === 'rules'" class="setup-panel">
      <header class="setup-panel__head">
        <h3>Election Rules</h3>
        <p>Seat apportionment method and entry thresholds per chamber, plus how strongly local results blend with the national climate.</p>
      </header>

      <h4>Apportionment Method <InfoTip :text="TIPS.apportionment" /></h4>
      <div class="field-grid">
        <label v-for="key in apportionmentKeys" :key="key">{{ humanize(key) }}
          <select :value="elections.apportionment?.[key]" @change="setText(`config.elections.apportionment.${key}`, $event)">
            <option value="dhondt">D'Hondt</option>
            <option value="sainteLague">Sainte-Laguë</option>
            <option value="modifiedSainteLague">Modified Sainte-Laguë</option>
            <option v-if="key === 'nationalPrelates'" value="provinceByProvinceDhondt">Province-by-province D'Hondt</option>
          </select>
        </label>
      </div>

      <h4>Vote Blend (local vs. national climate) <InfoTip :text="TIPS.voteBlend" /></h4>
      <div class="field-grid">
        <label>Provincial assembly local weight <InfoTip :text="TIPS.voteBlend" />
          <input type="number" step="0.05" min="0" max="1" :value="elections.voteBlend?.provincialAssemblyLocalWeight" @input="setNum('config.elections.voteBlend.provincialAssemblyLocalWeight', $event)" />
        </label>
        <label>National assembly local weight <InfoTip :text="TIPS.voteBlend" />
          <input type="number" step="0.05" min="0" max="1" :value="elections.voteBlend?.nationalAssemblyLocalWeight" @input="setNum('config.elections.voteBlend.nationalAssemblyLocalWeight', $event)" />
        </label>
      </div>
    </section>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { Plus, Sparkles, Trash2 } from 'lucide-vue-next'
import { useFormStore } from '../../stores/formStore'
import { useCivilizationStore } from '../../stores/civilizationStore'
import { useElectionResults } from '../../composables/useElectionResults'
import { FEATURE_GROUPS, featuresForScope } from '../../domain/elections/features/featureCatalog'
import { generatePoliticalModel } from '../../domain/elections/weightGenerators'
import { requestCultureNames } from '../../domain/elections/narrativePlanner'
import PowerBalanceStrip from '../elections/PowerBalanceStrip.vue'
import InfoTip from './InfoTip.vue'

const SCOPES = ['county', 'province', 'national']
const SCOPE_LABELS = { county: 'County', province: 'Province', national: 'National' }
const APPORTIONMENT_KEYS = ['provincialAssembly', 'provincialPrelates', 'nationalAssembly', 'nationalPrelates']

// Sensible tuning range for base support. The number box still accepts any value.
const BIAS_MIN = -0.5
const BIAS_MAX = 1.5

const TIPS = {
  blocLabel: 'A human-readable name for this voter bloc. Shown here only.',
  blocParty: 'Which party these voters lean toward.',
  blocMatch: 'How a province qualifies: by its origin country, its region/group, or a religion present there.',
  blocContains: 'Comma-separated text matched (case-insensitive substring) against the province\'s origin country or group.',
  blocReligion: 'The religion whose followers form this bloc. Support is scaled by that religion\'s share of the province.',
  blocStrength: 'How strongly matching voters at this level swing toward the party. Higher means a bigger boost; 0 disables it at this level.',
  lowerHouse: 'The popularly-apportioned chamber (e.g. an assembly).',
  upperHouse: 'The second chamber (e.g. a council/senate).',
  chamberNationalName: 'Name shown for this chamber at the national level.',
  chamberTemplate: 'Name for a region\'s or province\'s chamber. Use {place} where the region/province name should appear.',
  leaderTitle: 'Title given to the leader/head of this chamber at this level.',
  yearBase: 'The calendar year of the first (baseline) election.',
  yearIncrement: 'Number of years that pass between elections.',
  popScaling: 'Converts a province\'s raw Civ population into a simulated population used for seats and religion shares. Defaults reproduce the original curve.',
  popDivisor: 'Raw population is divided by this before scaling. Larger = smaller simulated populations.',
  popPower: 'Exponent applied to the divided population. Higher = bigger gap between large and small provinces.',
  popScale: 'Flat multiplier applied after the power step.',
  popBaseMultiplier: 'Large multiplier that sets the overall population magnitude (a small random jitter is added per province).',
  popExponent: 'Final exponent applied to the scaled value (a small random jitter is added per province).',
  prelateTiers: 'Council (prelate) seats awarded by province size: a province at or above a tier\'s threshold gets that many seats.',
  apportionment: 'Seat-allocation formula per chamber. D\'Hondt favors larger parties; Sainte-Laguë is friendlier to smaller parties; Modified Sainte-Laguë raises the first-seat bar slightly.',
  voteBlend: 'How much a result leans on local outcomes vs. the broader national climate. 1 = fully local, 0 = fully climate.',
  genBalanced: 'Pre-fills the matrix so parties come out as evenly matched as the data allows — without exaggerated weights. Major-tier parties target wide, equal support; Minor-tier parties stay focused and smaller.',
  genDataDriven: 'Pre-fills the matrix from the data\'s real cleavages: features that vary most across your provinces get the most weight, so the election mirrors the underlying data distribution.',
  genRandom: 'Pre-fills the matrix with sparse random weights within sane bounds — a quick way to get an unpredictable but playable starting point.',
  tier: 'Major parties are meant for wide appeal; Minor parties are focused niche parties. The Balanced generator keeps minors smaller than majors.',
  homeCulture: 'The default culture your representatives are named from. Most reps use these names unless a minority/foreign culture applies.',
  givenNames: 'One given name per line. Male/female pools alternate by seat so chambers are mixed.',
  surnames: 'One surname per line. Reps are named "given surname".',
  cultures: 'Extra cultures that supply names where they appear — e.g. a conquered region\'s origin culture, or a culture tied to a regional party.',
  cultureMatch: 'When this culture\'s names appear: in provinces whose origin country or group contains the match text. Choose "Only via party / ambient" to skip province matching.',
  cultureAmbient: 'A small chance (0–1) this culture\'s given names appear anywhere, modeling background diversity. 0 = only where matched.',
  surnameBlend: 'Probability (0–1) a member of this culture still carries a home-culture surname (cultural mixing). 1 = always a home surname.',
  cultureParties: 'Representatives elected for the checked parties lean toward this culture\'s names, regardless of province.',
  cultureSurnames: 'One surname per line. Leave blank to always use the home culture\'s surnames for this culture.',
  generateNames: 'Uses your local LM Studio model to invent names from the culture label, replacing the banks that currently have names (empty banks are left empty). Requires LM Studio running with CORS enabled.',
}

export default {
  name: 'AdvancedSetup',
  components: { Plus, Sparkles, Trash2, PowerBalanceStrip, InfoTip },
  setup() {
    const store = useFormStore()
    const civStore = useCivilizationStore()
    const { results, partyMeta, hasData } = useElectionResults()
    const activeTab = ref('model')
    const activeScope = ref('province')
    const generatingKey = ref(null)

    const parties = computed(() => civStore.parties)
    const voterBlocs = computed(() => civStore.voterBlocs)
    const chambers = computed(() => civStore.chambers)
    const calc = computed(() => civStore.calculations)
    const pop = computed(() => calc.value.provincialPopulation || {})
    const prelateTiers = computed(() => calc.value.prelateTiers || [])
    const elections = computed(() => civStore.electionParams)
    const naming = computed(() => civStore.naming || {})

    // ── Live national result (reactive to matrix edits) ──
    const hasResults = computed(() => hasData.value && !!results.value?.national)
    const assemblyShares = computed(() => results.value?.national?.assembly?.vote_shares || {})
    const assemblySeats = computed(() => results.value?.national?.assembly?.seats || {})
    const councilShares = computed(() => results.value?.national?.prelates?.vote_shares || {})
    const councilSeats = computed(() => results.value?.national?.prelates?.seats || {})
    function pct(value) {
      const n = Number(value)
      return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : '—'
    }

    const GENERATOR_LABELS = { balanced: 'Balanced weights', 'data-driven': 'Data-driven weights', random: 'Randomized weights' }
    function applyWeights(mode) {
      const partyList = parties.value
      if (!store.currentData || !partyList.length) return
      if (!Array.isArray(store.currentData.provinces) || !store.currentData.provinces.length) {
        store.showToast('Add province data first to generate weights from it.', 'error')
        return
      }
      const model = generatePoliticalModel(mode, store.currentData, partyList)
      const withIds = model.map((m, i) => ({ id: partyList[i].id, ...m }))
      store.applyPoliticalModel(withIds)
      store.showToast(`${GENERATOR_LABELS[mode] || 'Weights'} applied`, 'success')
    }

    function clampBias(value) {
      const n = Number(value) || 0
      return Math.max(BIAS_MIN, Math.min(BIAS_MAX, n))
    }
    function featureTip(feature) {
      return `Weight for "${feature.label}". Positive values pull this party up where ${feature.label.toLowerCase()} is high; negative values push it down. 0 means no effect.`
    }

    function setNum(path, event) {
      const raw = event.target.value
      store.setValueAtPath(path, raw === '' ? 0 : Number(raw))
    }
    function setText(path, event) {
      store.setValueAtPath(path, event.target ? event.target.value : event)
    }
    function affinity(party, key) {
      return party.affinities?.[activeScope.value]?.[key] ?? 0
    }
    function featuresInGroup(group) {
      return featuresForScope(activeScope.value).filter((f) => f.group === group)
    }
    function scopeLabel(scope) { return SCOPE_LABELS[scope] }
    function humanize(key) {
      return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
    }

    // Voter bloc source helpers.
    function sourceKind(bloc) {
      const s = bloc.source || {}
      if (s.religion) return 'religion'
      if (s.selector?.groupIncludes) return 'group'
      return 'originalCountry'
    }
    function sourceValue(bloc) {
      const s = bloc.source?.selector || {}
      const list = s.originalCountryIncludes || s.groupIncludes || []
      return Array.isArray(list) ? list.join(', ') : ''
    }
    function setSourceKind(i, kind) {
      const source = kind === 'religion'
        ? { religion: '' }
        : kind === 'group'
          ? { selector: { groupIncludes: [] } }
          : { selector: { originalCountryIncludes: [] } }
      store.setValueAtPath(`config.voterBlocs[${i}].source`, source)
    }
    function setSourceValue(i, bloc, value) {
      const list = value.split(',').map((v) => v.trim()).filter(Boolean)
      const key = sourceKind(bloc) === 'group' ? 'groupIncludes' : 'originalCountryIncludes'
      store.setValueAtPath(`config.voterBlocs[${i}].source`, { selector: { [key]: list } })
    }

    // Naming helpers.
    function nameListText(arr) {
      return Array.isArray(arr) ? arr.join('\n') : ''
    }
    function setNameList(path, event) {
      const list = String(event.target.value || '')
        .split(/[\n,]/)
        .map((v) => v.trim())
        .filter(Boolean)
      store.setValueAtPath(path, list)
    }
    function cultureMatchKind(culture) {
      const s = culture.selector
      if (!s || (!s.groupIncludes && !s.originalCountryIncludes)) return 'none'
      return s.groupIncludes ? 'group' : 'originalCountry'
    }
    function cultureMatchValue(culture) {
      const s = culture.selector || {}
      const list = s.originalCountryIncludes || s.groupIncludes || []
      return Array.isArray(list) ? list.join(', ') : ''
    }
    function setCultureMatchKind(i, kind) {
      const selector = kind === 'none'
        ? null
        : kind === 'group'
          ? { groupIncludes: [] }
          : { originalCountryIncludes: [] }
      store.setValueAtPath(`config.naming.cultures[${i}].selector`, selector)
    }
    function setCultureMatchValue(i, culture, value) {
      const list = value.split(',').map((v) => v.trim()).filter(Boolean)
      const key = cultureMatchKind(culture) === 'group' ? 'groupIncludes' : 'originalCountryIncludes'
      store.setValueAtPath(`config.naming.cultures[${i}].selector`, { [key]: list })
    }
    function toggleCultureParty(i, culture, partyId) {
      const current = Array.isArray(culture.parties) ? culture.parties.slice() : []
      const next = current.includes(partyId) ? current.filter((id) => id !== partyId) : [...current, partyId]
      store.setValueAtPath(`config.naming.cultures[${i}].parties`, next)
    }

    // Ask LM Studio to (re)generate name banks for a culture from its label.
    // Regenerates the banks that currently hold names; if none do, fills the
    // given-name banks (a culture needs given names; empty surnames = use home).
    async function generateNames(key, basePath, culture) {
      if (generatingKey.value) return
      const label = String(culture?.label || '').trim()
      let targets = ['givenMale', 'givenFemale', 'surnames'].filter(
        (c) => Array.isArray(culture?.[c]) && culture[c].length > 0
      )
      if (!targets.length) targets = ['givenMale', 'givenFemale']

      generatingKey.value = key
      store.showToast(`Generating names for "${label || 'culture'}" with LM Studio…`, 'info')
      try {
        const result = await requestCultureNames({ label, categories: targets })
        let applied = 0
        for (const category of targets) {
          if (Array.isArray(result[category]) && result[category].length) {
            store.setValueAtPath(`${basePath}.${category}`, result[category])
            applied += result[category].length
          }
        }
        if (applied) store.showToast(`Generated ${applied} names for "${label || 'culture'}".`, 'success')
        else store.showToast('LM Studio returned no usable names.', 'error')
      } catch (err) {
        store.showToast(`LM Studio name generation failed: ${err?.message || err}`, 'error')
      } finally {
        generatingKey.value = null
      }
    }

    return {
      store, parties, voterBlocs, chambers, calc, pop, prelateTiers, elections, naming,
      results, partyMeta, hasResults,
      assemblyShares, assemblySeats, councilShares, councilSeats, pct,
      tabs: [
        { id: 'model', label: 'Political Model' },
        { id: 'blocs', label: 'Voter Blocs' },
        { id: 'chambers', label: 'Chambers & Titles' },
        { id: 'naming', label: 'Representative Naming' },
        { id: 'calc', label: 'Calculations' },
        { id: 'rules', label: 'Election Rules' },
      ],
      scopes: SCOPES,
      groups: FEATURE_GROUPS,
      apportionmentKeys: APPORTIONMENT_KEYS,
      activeTab, activeScope,
      setNum, setText, affinity, featuresInGroup, scopeLabel, humanize,
      sourceKind, sourceValue, setSourceKind, setSourceValue,
      nameListText, setNameList, cultureMatchKind, cultureMatchValue,
      setCultureMatchKind, setCultureMatchValue, toggleCultureParty,
      generateNames, generatingKey,
      featureTip, clampBias, applyWeights,
      TIPS, BIAS_MIN, BIAS_MAX, BIAS_TIP: 'The party\'s starting score before any feature weighting. Raise it to strengthen the party everywhere; lower it to weaken it. Slider covers the usual range; type any value in the box.',
    }
  },
}
</script>

<style scoped>
.advanced-setup { display: flex; flex-direction: column; gap: 1rem; }
.advanced-tabs, .scope-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.advanced-tab, .scope-tab {
  padding: 0.45rem 0.85rem; border-radius: 8px; border: 1px solid var(--border, #2a3344);
  background: transparent; color: var(--text, #cbd5e1); cursor: pointer; font-size: 0.85rem;
}
.advanced-tab--active, .scope-tab--active { background: var(--accent, #6366f1); color: #fff; border-color: transparent; }
.setup-panel { display: flex; flex-direction: column; gap: 0.85rem; }
.setup-panel__head h3 { margin: 0; }
.setup-panel__head p { margin: 0.25rem 0 0; color: var(--muted, #94a3b8); font-size: 0.85rem; max-width: 60ch; }
.matrix-wrap { overflow-x: auto; }
.matrix { border-collapse: collapse; font-size: 0.78rem; min-width: 100%; }
.matrix th, .matrix td { padding: 0.2rem 0.35rem; text-align: center; border-bottom: 1px solid var(--border, #1e2735); }
.matrix__feature { text-align: left; white-space: nowrap; position: sticky; left: 0; background: var(--panel, #0f172a); }
.matrix__group td { text-align: left; font-weight: 600; padding-top: 0.6rem; color: var(--accent, #818cf8); }
.bias-cell { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.bias-cell input[type="range"] { width: 4.6rem; accent-color: var(--accent, #818cf8); cursor: pointer; }
.bias-cell .bias-num { width: 4.2rem; font-weight: 600; }

/* Live results preview */
.live-preview { display: flex; flex-direction: column; gap: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border, #1e2735); }
.live-preview__head h3 { margin: 0; }
.live-preview__head p { margin: 0.2rem 0 0; color: var(--muted, #94a3b8); font-size: 0.8rem; }
.live-preview__empty { color: var(--muted, #94a3b8); font-size: 0.85rem; font-style: italic; }
.party-result-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.5rem; }
.party-result-card {
  border: 1px solid var(--border, #2a3344); border-left: 3px solid var(--party-color, #666);
  border-radius: 8px; padding: 0.5rem 0.6rem; background: var(--bg-input, transparent);
}
.party-result-card__head { display: flex; align-items: center; gap: 0.4rem; }
.party-result-card__head strong { font-size: 0.78rem; }
.party-result-card__head small { color: var(--muted, #94a3b8); font-size: 0.68rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.party-result-card__swatch { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.party-result-card__stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem; margin-top: 0.4rem; }
.prc-stat { display: flex; flex-direction: column; }
.prc-stat__label { font-size: 0.6rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted, #94a3b8); }
.prc-stat__pct { font-size: 0.95rem; font-weight: 700; line-height: 1.1; }
.prc-stat__seats { font-size: 0.66rem; color: var(--text-secondary, #cbd5e1); }
.matrix__feature .info-tip { margin-left: 4px; }

/* Weight generators */
.generators { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.75rem; border: 1px solid var(--border, #2a3344); border-radius: 10px; background: var(--bg-input, transparent); }
.generators__buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.btn-generate {
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 0.5rem 0.9rem; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--accent, #6366f1); background: var(--accent, #6366f1); color: #fff;
  font-size: 0.85rem; font-weight: 600;
}
.btn-generate:hover { filter: brightness(1.08); }
.generators__note { margin: 0; color: var(--muted, #94a3b8); font-size: 0.78rem; }
.tier-row { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; padding-top: 0.5rem; border-top: 1px solid var(--border, #1e2735); }
.tier-row__label { font-size: 0.72rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted, #94a3b8); font-weight: 700; }
.tier-chip { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.2rem 0.4rem; border: 1px solid var(--border, #2a3344); border-radius: 8px; }
.tier-chip__swatch { width: 9px; height: 9px; border-radius: 50%; }
.tier-chip__abbr { font-size: 0.72rem; font-weight: 700; }
.tier-toggle { display: inline-flex; border: 1px solid var(--border, #2a3344); border-radius: 6px; overflow: hidden; }
.tier-toggle button { padding: 0.15rem 0.45rem; font-size: 0.68rem; border: none; background: transparent; color: var(--muted, #94a3b8); cursor: pointer; }
.tier-toggle__btn--active { background: var(--accent, #6366f1); color: #fff; }

/* Representative naming */
.naming-culture { border: 1px solid var(--border, #2a3344); border-radius: 10px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 0.6rem; }
.naming-culture--home { border-color: var(--accent, #6366f1); }
.naming-culture h4 { margin: 0; }
.naming-culture__head { display: flex; align-items: center; gap: 0.5rem; }
.naming-culture__label { flex: 1; padding: 0.4rem; border-radius: 6px; border: 1px solid var(--border, #2a3344); background: transparent; color: var(--text, #e2e8f0); font-weight: 600; }
.naming-field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: var(--muted, #94a3b8); max-width: 280px; }
.naming-field input { padding: 0.4rem; border-radius: 6px; border: 1px solid var(--border, #2a3344); background: transparent; color: var(--text, #e2e8f0); }
.naming-rules { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.6rem; }
.naming-rules label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.78rem; color: var(--muted, #94a3b8); }
.naming-rules input, .naming-rules select { padding: 0.4rem; border-radius: 6px; border: 1px solid var(--border, #2a3344); background: transparent; color: var(--text, #e2e8f0); }
.naming-parties { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.naming-parties__label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted, #94a3b8); font-weight: 700; }
.naming-party-chip { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; font-weight: 700; }
.naming-banks { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.6rem; }
.naming-banks label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.78rem; color: var(--muted, #94a3b8); }
.naming-banks textarea { min-height: 90px; max-height: 160px; resize: vertical; padding: 0.45rem; border-radius: 6px; border: 1px solid var(--border, #2a3344); background: transparent; color: var(--text, #e2e8f0); font-family: inherit; font-size: 0.78rem; }
.naming-actions { display: flex; justify-content: flex-end; }
.btn-generate--llm { background: transparent; color: var(--accent, #818cf8); border-color: var(--accent, #6366f1); }
.btn-generate--llm:hover:not(:disabled) { background: var(--accent, #6366f1); color: #fff; }
.btn-generate--llm:disabled { opacity: 0.6; cursor: progress; }
.matrix input { width: 4.2rem; padding: 0.2rem; text-align: right; border-radius: 5px; border: 1px solid var(--border, #2a3344); background: transparent; color: inherit; }
.field-grid, .chamber-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; }
.field-grid label, .chamber-col label, .bloc-row label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: var(--muted, #94a3b8); }
.field-grid input, .chamber-col input, .bloc-row input, .bloc-row select {
  padding: 0.4rem; border-radius: 6px; border: 1px solid var(--border, #2a3344); background: transparent; color: var(--text, #e2e8f0);
}
.chamber-col { display: flex; flex-direction: column; gap: 0.55rem; }
.bloc-card { border: 1px solid var(--border, #2a3344); border-radius: 10px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.6rem; }
.bloc-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
.bloc-row label { flex: 1; min-width: 140px; }
.bloc-strength label { min-width: 110px; }
.tiers { border-collapse: collapse; }
.tiers th, .tiers td { padding: 0.25rem 0.5rem; text-align: left; }
.tiers input { width: 11rem; padding: 0.35rem; border-radius: 6px; border: 1px solid var(--border, #2a3344); background: transparent; color: inherit; }
.icon-danger { background: transparent; border: none; color: #f87171; cursor: pointer; }
</style>
