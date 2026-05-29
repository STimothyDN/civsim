<template>
  <Teleport to="body">
    <div v-if="uiStore.newTemplateModalOpen" class="modal-overlay" @click.self="close">
      <section
        class="modal new-template-modal"
        :class="{ 'new-template-modal--wizard': phase === 'wizard' }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-template-title"
      >
        <header class="modal-header">
          <div>
            <p class="eyebrow">{{ phase === 'wizard' ? `Civilization Wizard · Step ${step + 1} of ${steps.length}` : 'New Template' }}</p>
            <h2 id="new-template-title">{{ phase === 'wizard' ? steps[step].title : 'Create a new civilization' }}</h2>
          </div>
          <button type="button" class="close-btn" aria-label="Close" @click="close">
            <X :size="18" />
          </button>
        </header>

        <!-- CHOICE PHASE -->
        <div v-if="phase === 'choice'" class="new-template-choices">
          <button type="button" class="new-template-choice" @click="chooseScratch">
            <FilePlus2 :size="28" />
            <strong>Start from scratch</strong>
            <span>Load a blank template and build everything yourself in the full editor.</span>
          </button>
          <button type="button" class="new-template-choice new-template-choice--accent" @click="chooseWizard">
            <Wand2 :size="28" />
            <strong>Civilization Wizard</strong>
            <span>A guided walkthrough that steps you through every detail in one place. Save and exit any time.</span>
          </button>
        </div>

        <!-- WIZARD PHASE -->
        <template v-else>
          <nav class="wizard-steps-nav" aria-label="Wizard steps">
            <button
              v-for="(s, i) in steps"
              :key="s.title"
              type="button"
              class="wizard-step-pip"
              :class="{ 'wizard-step-pip--active': i === step, 'wizard-step-pip--done': i < step }"
              @click="step = i"
            >
              <span class="wizard-step-pip__num">{{ i + 1 }}</span>
              <span class="wizard-step-pip__label">{{ s.title }}</span>
            </button>
          </nav>

          <div class="wizard-content">
            <component :is="steps[step].component" />
          </div>

          <footer class="wizard-footer">
            <button type="button" class="btn-ghost" :disabled="step === 0" @click="prev">
              <ChevronLeft :size="16" /> Back
            </button>
            <div class="wizard-footer-spacer"></div>
            <button type="button" class="btn-ghost" @click="saveAndExit">
              Save &amp; exit
            </button>
            <button v-if="step < steps.length - 1" type="button" class="btn-primary" @click="next">
              Next <ChevronRight :size="16" />
            </button>
            <button v-else type="button" class="btn-primary" @click="finish">
              <Check :size="16" /> Finish
            </button>
          </footer>
        </template>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { markRaw, ref, watch } from 'vue'
import { Check, ChevronLeft, ChevronRight, FilePlus2, Wand2, X } from 'lucide-vue-next'
import { useFormStore } from '../../stores/formStore'
import { useElectionStore } from '../../stores/electionStore'
import { useUiStore } from '../../stores/uiStore'
import WizardCountryStep from './wizard/WizardCountryStep.vue'
import WizardReferenceStep from './wizard/WizardReferenceStep.vue'
import WizardProvincesStep from './wizard/WizardProvincesStep.vue'

export default {
  name: 'NewTemplateModal',
  components: { Check, ChevronLeft, ChevronRight, FilePlus2, Wand2, X },
  setup() {
    const uiStore = useUiStore()
    const formStore = useFormStore()

    const phase = ref('choice')
    const step = ref(0)

    const steps = [
      { title: 'Your Civilization', component: markRaw(WizardCountryStep) },
      { title: 'Reference Data', component: markRaw(WizardReferenceStep) },
      { title: 'Provinces & Counties', component: markRaw(WizardProvincesStep) },
    ]

    // Sync the modal phase to the requested mode each time it opens. Opening in
    // 'wizard' mode (via "Edit in Wizard") walks the current template; 'choice'
    // mode shows the scratch/wizard fork for a brand-new template.
    watch(
      () => uiStore.newTemplateModalOpen,
      (open) => {
        if (open) {
          phase.value = uiStore.newTemplateMode === 'wizard' ? 'wizard' : 'choice'
          step.value = 0
        }
      }
    )

    function freshTemplate() {
      formStore.loadDefault()
      useElectionStore().resetScenario()
    }

    function chooseScratch() {
      freshTemplate()
      uiStore.closeNewTemplateModal()
    }

    function chooseWizard() {
      freshTemplate()
      phase.value = 'wizard'
      step.value = 0
    }

    function next() {
      if (step.value < steps.length - 1) step.value += 1
    }
    function prev() {
      if (step.value > 0) step.value -= 1
    }

    function close() {
      uiStore.closeNewTemplateModal()
    }

    function saveAndExit() {
      formStore.persistAutosaveNow()
      uiStore.closeNewTemplateModal()
      uiStore.showToast('Draft saved. You can keep editing in the workspace.', 'success')
    }

    function finish() {
      formStore.persistAutosaveNow()
      uiStore.closeNewTemplateModal()
      uiStore.showToast('Civilization created', 'success')
    }

    return { uiStore, phase, step, steps, chooseScratch, chooseWizard, next, prev, close, saveAndExit, finish }
  },
}
</script>
