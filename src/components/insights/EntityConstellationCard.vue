<template>
  <button
    type="button"
    class="constellation-card"
    :class="{ 'constellation-card--focus': focused, 'constellation-card--lead': lead }"
    :title="name"
    @click="$emit('select')"
  >
    <header class="constellation-head">
      <strong class="constellation-name">{{ name }}</strong>
      <span v-if="badge" class="constellation-badge">{{ badge }}</span>
    </header>
    <div v-if="headlineLabel" class="constellation-headline">
      <small>{{ headlineLabel }}</small>
      <b>{{ headlineValue }}</b>
    </div>
    <div class="constellation-tracks">
      <div v-for="track in tracks" :key="track.label" class="constellation-track" :class="`constellation-track--${track.tone || 'neutral'}`">
        <span>{{ track.label }}</span>
        <div class="constellation-track-bar"><i :style="{ width: `${track.share}%` }"></i></div>
        <small>{{ track.value }}</small>
      </div>
    </div>
    <footer v-if="footer" class="constellation-footer" :title="footer">{{ footer }}</footer>
  </button>
</template>

<script>
export default {
  name: 'EntityConstellationCard',
  emits: ['select'],
  props: {
    name: { type: String, required: true },
    badge: { type: String, default: '' },
    headlineLabel: { type: String, default: '' },
    headlineValue: { type: String, default: '' },
    tracks: { type: Array, default: () => [] },
    footer: { type: String, default: '' },
    focused: { type: Boolean, default: false },
    lead: { type: Boolean, default: false },
  },
}
</script>

<style scoped>
.constellation-card {
  display: flex; flex-direction: column; gap: 8px;
  padding: 12px 14px;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(255,255,255,0.04), transparent);
  border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08));
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  color: inherit;
  font: inherit;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.constellation-card:hover { border-color: rgba(212,168,67,0.5); transform: translateY(-1px); }
.constellation-card--focus { border-color: var(--accent, #d4a843); box-shadow: 0 0 0 1px rgba(212,168,67,0.55); background: linear-gradient(135deg, rgba(212,168,67,0.14), transparent); }
.constellation-card--lead { background: linear-gradient(135deg, rgba(45,212,191,0.12), transparent); border-color: rgba(45,212,191,0.45); }
.constellation-head { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.constellation-name {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
  font-family: 'Cinzel', serif;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  hyphens: auto;
}
.constellation-badge {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, #a9a39a);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.constellation-headline { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 4px 0; border-top: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-bottom: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); min-width: 0; }
.constellation-headline small { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted, #a9a39a); font-weight: 700; flex-shrink: 0; }
.constellation-headline b { font-size: 1rem; color: var(--accent, #d4a843); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.constellation-tracks { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.constellation-track { display: grid; grid-template-columns: 50px 1fr auto; align-items: center; gap: 8px; min-width: 0; }
.constellation-track span { font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted, #a9a39a); font-weight: 700; white-space: nowrap; }
.constellation-track-bar { height: 4px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; min-width: 0; }
.constellation-track-bar i { display: block; height: 100%; background: var(--accent, #d4a843); border-radius: 999px; transition: width 0.3s ease; }
.constellation-track small { font-size: 0.68rem; text-align: right; font-weight: 700; white-space: nowrap; min-width: 0; max-width: 60px; overflow: hidden; text-overflow: ellipsis; }
.constellation-track--good .constellation-track-bar i { background: #4ade80; }
.constellation-track--watch .constellation-track-bar i { background: #facc15; }
.constellation-track--risk .constellation-track-bar i { background: #f87171; }
.constellation-footer {
  font-size: 0.65rem;
  color: var(--text-muted, #a9a39a);
  border-top: 1px dashed var(--border-subtle, rgba(255,255,255,0.08));
  padding-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
