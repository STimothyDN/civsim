<template>
  <div class="wizard-step-body">
    <p class="wizard-step-lead">
      Choose how power is organized in your realm. This determines which government
      tiers exist and how the national legislature is composed — the election
      engine rebuilds its chambers to match.
    </p>

    <StructureSettings />
  </div>
</template>

<script>
import StructureSettings from '../StructureSettings.vue'

export default {
  name: 'WizardStructureStep',
  components: { StructureSettings },
}
</script>
