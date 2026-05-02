function formatPercent(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return `${Math.round(Math.max(0, Math.min(1, number)) * 100)}%`
}

function eventKey(status = {}) {
  return status.eventType || status.phase || 'working'
}

function progressDetail(status, fallback) {
  const nativePercent = formatPercent(status.nativeProgress)
  if (nativePercent) return `${fallback} ${nativePercent}.`
  return fallback
}

function mapStatus(status, copy) {
  if (!status) return null
  const key = eventKey(status)
  const entry = copy[key] || copy[status.phase] || copy.default
  if (!entry) return status

  return {
    ...status,
    label: entry.label || status.label,
    message: typeof entry.message === 'function' ? entry.message(status) : entry.message,
    detail: typeof entry.detail === 'function' ? entry.detail(status) : entry.detail,
  }
}

const BROADCAST_COPY = {
  'app.preparing': {
    label: 'Assignment',
    message: 'Assigning the decision desk.',
    detail: 'Collecting control calls, swings, active trends, and local focus data.',
  },
  'app.connecting': {
    label: 'Signal',
    message: 'Opening the broadcast line.',
    detail: 'Linking the results board to LM Studio.',
  },
  'chat.start': {
    label: 'Control Room',
    message: 'Decision desk is live.',
    detail: 'The local model has accepted the broadcast brief.',
  },
  'model_load.start': {
    label: 'Signal',
    message: 'Warming the transmission stack.',
    detail: 'LM Studio is loading the requested model.',
  },
  'model_load.progress': {
    label: 'Signal',
    message: 'Warming the transmission stack.',
    detail: (status) => progressDetail(status, 'Model load progress'),
  },
  'model_load.end': {
    label: 'Signal',
    message: 'Transmission stack is ready.',
    detail: 'The model is loaded for the broadcast desk.',
  },
  'prompt_processing.start': {
    label: 'Boards',
    message: 'Stacking the result boards.',
    detail: 'Seat counts, control calls, and regional swings are being processed.',
  },
  'prompt_processing.progress': {
    label: 'Boards',
    message: 'Stacking the result boards.',
    detail: (status) => progressDetail(status, 'Board processing progress'),
  },
  'prompt_processing.end': {
    label: 'Boards',
    message: 'Result boards are locked.',
    detail: 'The decision desk is ready to write copy.',
  },
  'reasoning.start': {
    label: 'Desk Check',
    message: 'Checking the call.',
    detail: 'The desk is reconciling trends against the reported math.',
  },
  'reasoning.delta': {
    label: 'Desk Check',
    message: 'Checking the call.',
    detail: 'Decision logic is still running.',
  },
  'reasoning.end': {
    label: 'Desk Check',
    message: 'Call check complete.',
    detail: 'The broadcast script can move to copy.',
  },
  'message.start': {
    label: 'Copy',
    message: 'Anchor copy is coming in.',
    detail: 'The desk has started writing the broadcast.',
  },
  'message.delta': {
    label: 'Copy',
    message: 'Anchor copy is coming in.',
    detail: (status) => status.detail || 'Broadcast copy is streaming from LM Studio.',
  },
  'message.end': {
    label: 'Copy',
    message: 'Anchor copy is locked.',
    detail: 'The broadcast text is ready for transmission.',
  },
  'chat.end': {
    label: 'Packet',
    message: 'Broadcast packet received.',
    detail: (status) => status.detail || 'Final LM Studio result received.',
  },
  'app.complete': {
    label: 'Packet',
    message: 'Broadcast script received.',
    detail: 'Formatting paragraphs for the transmission screen.',
  },
  error: {
    label: 'Fault',
    message: 'Broadcast signal failed.',
    detail: (status) => status.detail || 'LM Studio returned an error.',
  },
  default: {
    label: 'Signal',
    message: 'Holding the broadcast line.',
    detail: 'Waiting for the local model.',
  },
}

const TICKER_COPY = {
  'app.preparing': {
    label: 'Brief',
    message: 'Preparing the ticker brief.',
    detail: 'Compressing page-specific election data into one paragraph.',
  },
  'app.connecting': {
    label: 'Wire',
    message: 'Opening the ticker wire.',
    detail: 'Linking this page to LM Studio.',
  },
  'chat.start': {
    label: 'Wire',
    message: 'Ticker wire is live.',
    detail: 'The local model has accepted the brief.',
  },
  'model_load.start': {
    label: 'Tape',
    message: 'Spooling the ticker tape.',
    detail: 'LM Studio is loading the requested model.',
  },
  'model_load.progress': {
    label: 'Tape',
    message: 'Spooling the ticker tape.',
    detail: (status) => progressDetail(status, 'Model load progress'),
  },
  'model_load.end': {
    label: 'Tape',
    message: 'Ticker tape is ready.',
    detail: 'The model is loaded for the ticker feed.',
  },
  'prompt_processing.start': {
    label: 'Wire Copy',
    message: 'Reading the county wire.',
    detail: 'Current calls, swings, and active trends are being processed.',
  },
  'prompt_processing.progress': {
    label: 'Wire Copy',
    message: 'Reading the county wire.',
    detail: (status) => progressDetail(status, 'Wire processing progress'),
  },
  'prompt_processing.end': {
    label: 'Wire Copy',
    message: 'Wire brief is locked.',
    detail: 'The ticker sentence is moving to copy.',
  },
  'reasoning.start': {
    label: 'Copy Desk',
    message: 'Choosing the lead item.',
    detail: 'The model is weighing the strongest call or movement.',
  },
  'reasoning.delta': {
    label: 'Copy Desk',
    message: 'Choosing the lead item.',
    detail: 'The ticker lead is still being checked.',
  },
  'reasoning.end': {
    label: 'Copy Desk',
    message: 'Lead item selected.',
    detail: 'Ticker copy can now be written.',
  },
  'message.start': {
    label: 'Copy',
    message: 'Writing the ticker line.',
    detail: 'The one-paragraph ticker is streaming from LM Studio.',
  },
  'message.delta': {
    label: 'Copy',
    message: 'Writing the ticker line.',
    detail: (status) => status.detail || 'Ticker copy is streaming from LM Studio.',
  },
  'message.end': {
    label: 'Copy',
    message: 'Ticker line is locked.',
    detail: 'The page can begin typing the ticker.',
  },
  'chat.end': {
    label: 'Wire',
    message: 'Ticker packet received.',
    detail: (status) => status.detail || 'Final LM Studio result received.',
  },
  'app.complete': {
    label: 'Wire',
    message: 'Ticker copy received.',
    detail: 'Ready to type onto the election ticker.',
  },
  error: {
    label: 'Fault',
    message: 'Ticker wire failed.',
    detail: (status) => status.detail || 'LM Studio returned an error.',
  },
  default: {
    label: 'Wire',
    message: 'Holding the ticker wire.',
    detail: 'Waiting for the local model.',
  },
}

const CLIMATE_COPY = {
  'app.preparing': {
    label: 'Draw',
    message: 'Drawing a new election climate.',
    detail: (status) => status.detail || 'Randomized trend signals are ready for naming.',
  },
  'app.connecting': {
    label: 'Desk',
    message: 'Opening the climate desk.',
    detail: 'Linking the randomized trend package to LM Studio.',
  },
  'chat.start': {
    label: 'Desk',
    message: 'Climate desk is live.',
    detail: 'The local model has accepted the naming brief.',
  },
  'model_load.start': {
    label: 'Desk',
    message: 'Seating the local analyst.',
    detail: 'LM Studio is loading the requested model.',
  },
  'model_load.progress': {
    label: 'Desk',
    message: 'Seating the local analyst.',
    detail: (status) => progressDetail(status, 'Model load progress'),
  },
  'model_load.end': {
    label: 'Desk',
    message: 'Local analyst is ready.',
    detail: 'The model is loaded for climate naming.',
  },
  'prompt_processing.start': {
    label: 'Signals',
    message: 'Indexing climate signals.',
    detail: 'Random trends, parties, and world context are being processed.',
  },
  'prompt_processing.progress': {
    label: 'Signals',
    message: 'Indexing climate signals.',
    detail: (status) => progressDetail(status, 'Signal processing progress'),
  },
  'prompt_processing.end': {
    label: 'Signals',
    message: 'Climate signals indexed.',
    detail: 'The scenario name can now be drafted.',
  },
  'reasoning.start': {
    label: 'Framing',
    message: 'Framing the political weather.',
    detail: 'The model is weighing how the fixed trends combine.',
  },
  'reasoning.delta': {
    label: 'Framing',
    message: 'Framing the political weather.',
    detail: 'The scenario frame is still being checked.',
  },
  'reasoning.end': {
    label: 'Framing',
    message: 'Political weather framed.',
    detail: 'The climate name can move to copy.',
  },
  'message.start': {
    label: 'Nameplate',
    message: 'Writing the climate nameplate.',
    detail: 'Scenario name and description are streaming from LM Studio.',
  },
  'message.delta': {
    label: 'Nameplate',
    message: 'Writing the climate nameplate.',
    detail: (status) => status.detail || 'Scenario metadata is streaming from LM Studio.',
  },
  'message.end': {
    label: 'Nameplate',
    message: 'Climate nameplate is locked.',
    detail: 'The metadata is ready to parse.',
  },
  'chat.end': {
    label: 'Packet',
    message: 'Climate packet received.',
    detail: (status) => status.detail || 'Final LM Studio result received.',
  },
  'app.parsing': {
    label: 'Nameplate',
    message: 'Reading the climate nameplate.',
    detail: 'Extracting the scenario name and one-sentence description.',
  },
  'app.complete': {
    label: 'Nameplate',
    message: 'Election climate named.',
    detail: (status) => status.detail || 'Scenario metadata applied.',
  },
  error: {
    label: 'Fault',
    message: 'Climate naming failed.',
    detail: (status) => status.detail || 'LM Studio returned an error.',
  },
  default: {
    label: 'Desk',
    message: 'Holding the climate desk.',
    detail: 'Waiting for the local model.',
  },
}

export function broadcastLlmStatus(status) {
  return mapStatus(status, BROADCAST_COPY)
}

export function climateLlmStatus(status) {
  return mapStatus(status, CLIMATE_COPY)
}

export function tickerLlmStatus(status) {
  return mapStatus(status, TICKER_COPY)
}
