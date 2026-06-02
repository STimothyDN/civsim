<template>
  <div class="structure-settings">
    <div class="structure-options">
      <label
        v-for="opt in options"
        :key="opt.id"
        class="structure-option"
        :class="{ 'structure-option--active': structure.id === opt.id }"
      >
        <input
          type="radio"
          name="political-structure"
          :value="opt.id"
          :checked="structure.id === opt.id"
          @change="setId(opt.id)"
        />
        <span class="structure-option__body">
          <strong>{{ opt.label }}</strong>
          <small>{{ opt.description }}</small>
        </span>
      </label>
    </div>

    <div v-if="structure.id === 'federalist'" class="structure-knobs">
      <h4>National Lower House — population-driven</h4>
      <div class="field-grid">
        <label>People per seat (population divisor)
          <input
            type="number"
            min="1"
            step="1000"
            :value="lower.populationDivisor"
            @input="setNum('config.structure.national.lower.populationDivisor', $event)"
          />
          <small class="structure-hint">Total lower-house seats ≈ national population ÷ this number, with at least one seat per province.</small>
        </label>
      </div>

      <h4>National Upper House — small-province parity</h4>
      <div class="field-grid">
        <label>Apportionment basis
          <select :value="upper.basis" @change="setText('config.structure.national.upper.basis', $event)">
            <option value="equalPerProvince">Equal seats per province</option>
            <option value="degressiveTiers">Degressive tiers (by population)</option>
          </select>
        </label>
        <label v-if="upper.basis !== 'degressiveTiers'">Seats per province
          <input
            type="number"
            min="0"
            step="1"
            :value="upper.seatsPerProvince"
            @input="setNum('config.structure.national.upper.seatsPerProvince', $event)"
          />
        </label>
      </div>
      <p v-if="upper.basis === 'degressiveTiers'" class="structure-hint">
        Degressive tiers reuse the prelate seat tiers from the Calculations settings — smaller provinces get proportionally more seats.
      </p>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useFormStore } from '../../stores/formStore'
import { useCivilizationStore } from '../../stores/civilizationStore'
import { POLITICAL_STRUCTURE_LIST } from '../../domain/elections'

export default {
  name: 'StructureSettings',
  setup() {
    const store = useFormStore()
    const civStore = useCivilizationStore()

    const structure = computed(() => civStore.structure || {})
    const lower = computed(() => structure.value.national?.lower || {})
    const upper = computed(() => structure.value.national?.upper || {})
    const options = POLITICAL_STRUCTURE_LIST.map((s) => ({
      id: s.id,
      label: s.label,
      description: s.description,
    }))

    function setId(id) {
      store.setValueAtPath('config.structure.id', id)
    }
    function setNum(path, event) {
      const raw = event.target.value
      store.setValueAtPath(path, raw === '' ? 0 : Number(raw))
    }
    function setText(path, event) {
      store.setValueAtPath(path, event.target ? event.target.value : event)
    }

    return { structure, lower, upper, options, setId, setNum, setText }
  },
}
</script>

<style scoped>
.structure-settings { display: flex; flex-direction: column; gap: 1rem; }
.structure-options { display: grid; gap: 0.6rem; }
.structure-option {
  display: flex; align-items: flex-start; gap: 0.6rem;
  padding: 0.75rem 0.85rem; border-radius: 10px;
  border: 1px solid var(--border, #2a3344); background: var(--bg-input, transparent);
  cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease;
}
.structure-option:hover { border-color: var(--accent, #6366f1); }
.structure-option--active { border-color: var(--accent, #6366f1); background: color-mix(in srgb, var(--accent, #6366f1) 10%, transparent); }
.structure-option input[type="radio"] { margin-top: 0.2rem; accent-color: var(--accent, #6366f1); }
.structure-option__body { display: flex; flex-direction: column; gap: 0.2rem; }
.structure-option__body strong { font-size: 0.9rem; }
.structure-option__body small { color: var(--muted, #94a3b8); font-size: 0.78rem; line-height: 1.35; }
.structure-knobs { display: flex; flex-direction: column; gap: 0.6rem; }
.structure-knobs h4 { margin: 0.4rem 0 0; font-size: 0.82rem; }
.field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.6rem; }
.field-grid label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; color: var(--text, #cbd5e1); }
.field-grid input, .field-grid select {
  padding: 0.4rem 0.5rem; border-radius: 8px; border: 1px solid var(--border, #2a3344);
  background: var(--bg-input, transparent); color: var(--text, #e2e8f0); font-size: 0.85rem;
}
.structure-hint { margin: 0; color: var(--muted, #94a3b8); font-size: 0.74rem; line-height: 1.4; }
</style>
