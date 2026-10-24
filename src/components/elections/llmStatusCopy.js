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

const POLL_BREAKDOWN_COPY = {
  ...BROADCAST_COPY,
  'app.preparing': {
    label: 'Roundtable',
    message: 'Seating the polling panel.',
    detail: 'Collecting national takeaways, prior-election baselines, all-scope poll-of-polls, pollster splits, surprises, and campaign climate.',
  },
  'app.connecting': {
    label: 'Signal',
    message: 'Opening the roundtable feed.',
    detail: 'Linking the polling board to LM Studio.',
  },
  'prompt_processing.start': {
    label: 'Poll Board',
    message: 'Stacking the poll board.',
    detail: 'National polling, prior-election comparisons, all-scope aggregates, surprise polls, trends, and party identities are being processed.',
  },
  'prompt_processing.progress': {
    label: 'Poll Board',
    message: 'Stacking the poll board.',
    detail: (status) => progressDetail(status, 'Poll-board processing progress'),
  },
  'prompt_processing.end': {
    label: 'Poll Board',
    message: 'Poll board is locked.',
    detail: 'The roundtable can move to analysis.',
  },
  'message.start': {
    label: 'Panel',
    message: 'Analyst copy is coming in.',
    detail: 'The roundtable script is streaming from LM Studio.',
  },
  'message.delta': {
    label: 'Panel',
    message: 'Analyst copy is coming in.',
    detail: (status) => status.detail || 'Polling analysis is streaming from LM Studio.',
  },
  'message.end': {
    label: 'Panel',
    message: 'Analyst copy is locked.',
    detail: 'The roundtable text is ready.',
  },
  'app.complete': {
    label: 'Panel',
    message: 'Poll roundtable script received.',
    detail: 'Formatting analyst turns for the breakdown screen.',
  },
  error: {
    label: 'Fault',
    message: 'Poll breakdown feed failed.',
    detail: (status) => status.detail || 'LM Studio returned an error.',
  },
  default: {
    label: 'Signal',
    message: 'Holding the roundtable feed.',
    detail: 'Waiting for the local model.',
  },
}

const NAMING_COPY = {
  'app.preparing': {
    label: 'Archive',
    message: 'Preparing culture naming brief.',
    detail: (status) => status.detail || 'Packaging culture label and requested name banks.',
  },
  'app.connecting': {
    label: 'Archive',
    message: 'Opening the naming archive.',
    detail: (status) => status.detail || 'Linking the culture naming brief to LM Studio.',
  },
  'chat.start': {
    label: 'Archive',
    message: 'Naming historian is live.',
    detail: 'The local model has accepted the culture naming brief.',
  },
  'model_load.start': {
    label: 'Model Load',
    message: 'Loading the local model.',
    detail: 'LM Studio is loading the requested model.',
  },
  'model_load.progress': {
    label: 'Model Load',
    message: 'Loading the local model.',
    detail: (status) => progressDetail(status, 'Model load progress'),
  },
  'model_load.end': {
    label: 'Model Load',
    message: 'Local model is ready.',
    detail: 'The model is loaded for representative naming.',
  },
  'prompt_processing.start': {
    label: 'Prompt',
    message: 'Reading cultural context.',
    detail: 'Processing culture label and name bank rules.',
  },
  'prompt_processing.progress': {
    label: 'Prompt',
    message: 'Reading cultural context.',
    detail: (status) => progressDetail(status, 'Prompt processing progress'),
  },
  'prompt_processing.end': {
    label: 'Prompt',
    message: 'Cultural context locked.',
    detail: 'Ready to draft personal name banks.',
  },
  'reasoning.start': {
    label: 'Onomastics',
    message: 'Shaping cultural naming patterns.',
    detail: 'The model is selecting phonetic and linguistic patterns.',
  },
  'reasoning.delta': {
    label: 'Onomastics',
    message: 'Shaping cultural naming patterns.',
    detail: (status) => status.detail || 'Phonetic patterns are still being checked.',
  },
  'reasoning.end': {
    label: 'Onomastics',
    message: 'Naming patterns selected.',
    detail: 'Moving to name bank generation.',
  },
  'message.start': {
    label: 'Names',
    message: 'Drafting personal name banks.',
    detail: 'Name arrays are streaming from LM Studio.',
  },
  'message.delta': {
    label: 'Names',
    message: 'Drafting personal name banks.',
    detail: (status) => status.detail || 'Name banks are streaming from LM Studio.',
  },
  'message.end': {
    label: 'Names',
    message: 'Name banks received.',
    detail: 'Validating and deduplicating generated names.',
  },
  'chat.end': {
    label: 'Packet',
    message: 'Naming packet received.',
    detail: (status) => status.detail || 'Final LM Studio result received.',
  },
  'app.parsing': {
    label: 'Parsing',
    message: 'Reading generated name banks.',
    detail: (status) => status.detail || 'Extracting and sanitizing names from the response.',
  },
  'app.complete': {
    label: 'Complete',
    message: 'Representative names generated.',
    detail: (status) => status.detail || 'Name banks applied.',
  },
  error: {
    label: 'Fault',
    message: 'Representative naming failed.',
    detail: (status) => status.detail || 'LM Studio returned an error.',
  },
  default: {
    label: 'Archive',
    message: 'Working with the naming historian.',
    detail: 'Waiting for the local model.',
  },
}

const WEIGHTS_COPY = {
  'app.preparing': {
    label: 'Survey',
    message: 'Profiling empire data and party cleavages.',
    detail: (status) => status.detail || 'Packing province features, county signals, voter blocs, and party tiers.',
  },
  'app.connecting': {
    label: 'Signal',
    message: 'Opening the political model channel.',
    detail: (status) => status.detail || 'Linking the political weight matrix to LM Studio.',
  },
  'chat.start': {
    label: 'Architect',
    message: 'Political model architect is live.',
    detail: 'The local model has accepted the narrative weight brief.',
  },
  'model_load.start': {
    label: 'Model Load',
    message: 'Loading the local model.',
    detail: 'LM Studio is loading the requested model.',
  },
  'model_load.progress': {
    label: 'Model Load',
    message: 'Loading the local model.',
    detail: (status) => progressDetail(status, 'Model load progress'),
  },
  'model_load.end': {
    label: 'Model Load',
    message: 'Local model is ready.',
    detail: 'The model is loaded for narrative weight calibration.',
  },
  'prompt_processing.start': {
    label: 'Prompt',
    message: 'Reading empire feature distributions.',
    detail: 'Processing narrative, party tiers, and province/county cleavages.',
  },
  'prompt_processing.progress': {
    label: 'Prompt',
    message: 'Reading empire feature distributions.',
    detail: (status) => progressDetail(status, 'Prompt processing progress'),
  },
  'prompt_processing.end': {
    label: 'Prompt',
    message: 'Empire context locked.',
    detail: 'Ready to calibrate party biases and feature affinities.',
  },
  'reasoning.start': {
    label: 'Calibration',
    message: 'Matching narrative to empire features.',
    detail: 'The model is weighing party coalitions against province and county data.',
  },
  'reasoning.delta': {
    label: 'Calibration',
    message: 'Matching narrative to empire features.',
    detail: (status) => status.detail || 'Calibrating party affinities and base support.',
  },
  'reasoning.end': {
    label: 'Calibration',
    message: 'Coalition structure selected.',
    detail: 'Moving to weight matrix output.',
  },
  'message.start': {
    label: 'Weights',
    message: 'Streaming party weights.',
    detail: 'Base support and feature affinities are streaming from LM Studio.',
  },
  'message.delta': {
    label: 'Weights',
    message: 'Streaming party weights.',
    detail: (status) => status.detail || 'Weight matrix JSON is streaming from LM Studio.',
  },
  'message.end': {
    label: 'Weights',
    message: 'Weight matrix received.',
    detail: 'Validating and mapping weights across scopes.',
  },
  'chat.end': {
    label: 'Packet',
    message: 'Weight packet received.',
    detail: (status) => status.detail || 'Final LM Studio result received.',
  },
  'app.parsing': {
    label: 'Parsing',
    message: 'Reading generated party weights.',
    detail: (status) => status.detail || 'Extracting party biases, feature affinities, and rationales.',
  },
  'app.compiling': {
    label: 'Compiling',
    message: 'Calibrating weights to empire data.',
    detail: (status) => status.detail || 'Mapping feature affinities across county, province, and national scopes.',
  },
  'app.complete': {
    label: 'Complete',
    message: 'Narrative weights applied.',
    detail: (status) => status.detail || 'Party biases and feature affinities updated.',
  },
  error: {
    label: 'Fault',
    message: 'Narrative weight generation failed.',
    detail: (status) => status.detail || 'LM Studio returned an error.',
  },
  default: {
    label: 'Architect',
    message: 'Calibrating narrative weights.',
    detail: 'Waiting for the local model.',
  },
}

const VOTER_BLOCS_COPY = {
  'app.preparing': {
    label: 'Survey',
    message: 'Surveying origin countries, province groups, and religions.',
    detail: (status) => status.detail || 'Packing empire demographics, naming cultures, and party identities.',
  },
  'app.connecting': {
    label: 'Signal',
    message: 'Opening the voter bloc channel.',
    detail: (status) => status.detail || 'Linking the voter bloc builder to LM Studio.',
  },
  'chat.start': {
    label: 'Demographer',
    message: 'Electoral demographer is live.',
    detail: 'The local model has accepted the voter bloc brief.',
  },
  'model_load.start': {
    label: 'Model Load',
    message: 'Loading the local model.',
    detail: 'LM Studio is loading the requested model.',
  },
  'model_load.progress': {
    label: 'Model Load',
    message: 'Loading the local model.',
    detail: (status) => progressDetail(status, 'Model load progress'),
  },
  'model_load.end': {
    label: 'Model Load',
    message: 'Local model is ready.',
    detail: 'The model is loaded for voter bloc generation.',
  },
  'prompt_processing.start': {
    label: 'Prompt',
    message: 'Reading empire origins, regions, and religions.',
    detail: 'Processing narrative, naming cultures, and party identities.',
  },
  'prompt_processing.progress': {
    label: 'Prompt',
    message: 'Reading empire origins, regions, and religions.',
    detail: (status) => progressDetail(status, 'Prompt processing progress'),
  },
  'prompt_processing.end': {
    label: 'Prompt',
    message: 'Demographic context locked.',
    detail: 'Ready to design targeted voter blocs.',
  },
  'reasoning.start': {
    label: 'Coalitions',
    message: 'Mapping narrative constituencies to empire groups.',
    detail: 'The model is matching origin countries, province groups, and religions to parties.',
  },
  'reasoning.delta': {
    label: 'Coalitions',
    message: 'Mapping narrative constituencies to empire groups.',
    detail: (status) => status.detail || 'Evaluating voter bloc selectors and scope strengths.',
  },
  'reasoning.end': {
    label: 'Coalitions',
    message: 'Constituency rules selected.',
    detail: 'Moving to voter bloc output.',
  },
  'message.start': {
    label: 'Blocs',
    message: 'Streaming voter bloc rules.',
    detail: 'Voter bloc definitions are streaming from LM Studio.',
  },
  'message.delta': {
    label: 'Blocs',
    message: 'Streaming voter bloc rules.',
    detail: (status) => status.detail || 'Voter bloc JSON is streaming from LM Studio.',
  },
  'message.end': {
    label: 'Blocs',
    message: 'Voter bloc definitions received.',
    detail: 'Validating selectors, naming cultures, and scope strengths.',
  },
  'chat.end': {
    label: 'Packet',
    message: 'Voter bloc packet received.',
    detail: (status) => status.detail || 'Final LM Studio result received.',
  },
  'app.parsing': {
    label: 'Parsing',
    message: 'Reading generated voter blocs.',
    detail: (status) => status.detail || 'Extracting bloc selectors, target parties, and strengths.',
  },
  'app.compiling': {
    label: 'Compiling',
    message: 'Validating voter blocs against empire data.',
    detail: (status) => status.detail || 'Normalizing origin, group, and religion selectors.',
  },
  'app.complete': {
    label: 'Complete',
    message: 'Narrative voter blocs applied.',
    detail: (status) => status.detail || 'Voter blocs updated.',
  },
  error: {
    label: 'Fault',
    message: 'Voter bloc generation failed.',
    detail: (status) => status.detail || 'LM Studio returned an error.',
  },
  default: {
    label: 'Demographer',
    message: 'Designing narrative voter blocs.',
    detail: 'Waiting for the local model.',
  },
}

const PARTY_PROFILE_COPY = {
  'app.preparing': {
    label: 'Brief',
    message: 'Preparing the party profile brief.',
    detail: (status) => status.detail || 'Packing the description alongside rival parties.',
  },
  'app.connecting': {
    label: 'Signal',
    message: 'Opening the party profile channel.',
    detail: (status) => status.detail || 'Linking the profile brief to LM Studio.',
  },
  'model_load.start': {
    label: 'Model Load',
    message: 'Loading the local model.',
    detail: 'LM Studio is loading the requested model.',
  },
  'model_load.progress': {
    label: 'Model Load',
    message: 'Loading the local model.',
    detail: (status) => progressDetail(status, 'Model load progress'),
  },
  'prompt_processing.progress': {
    label: 'Prompt',
    message: 'Reading the party description.',
    detail: (status) => progressDetail(status, 'Prompt processing progress'),
  },
  'reasoning.delta': {
    label: 'Analyst',
    message: 'Distilling the platform and voter base.',
    detail: (status) => status.detail || 'Weighing ideology, constituencies, and signature causes.',
  },
  'message.delta': {
    label: 'Descriptors',
    message: 'Streaming party descriptors.',
    detail: (status) => status.detail || 'Descriptors are streaming from LM Studio.',
  },
  'app.parsing': {
    label: 'Parsing',
    message: 'Reading generated descriptors.',
    detail: (status) => status.detail || 'Extracting platform phrases.',
  },
  'app.complete': {
    label: 'Complete',
    message: 'Party descriptors applied.',
    detail: (status) => status.detail || 'Descriptors updated.',
  },
  error: {
    label: 'Fault',
    message: 'Descriptor generation failed.',
    detail: (status) => status.detail || 'LM Studio returned an error.',
  },
  default: {
    label: 'Analyst',
    message: 'Profiling the party.',
    detail: 'Waiting for the local model.',
  },
}

export function broadcastLlmStatus(status) {
  return mapStatus(status, BROADCAST_COPY)
}

export function climateLlmStatus(status) {
  return mapStatus(status, CLIMATE_COPY)
}

export function pollBreakdownLlmStatus(status) {
  return mapStatus(status, POLL_BREAKDOWN_COPY)
}

export function tickerLlmStatus(status) {
  return mapStatus(status, TICKER_COPY)
}

export function namingLlmStatus(status) {
  return mapStatus(status, NAMING_COPY)
}

export function weightsLlmStatus(status) {
  return mapStatus(status, WEIGHTS_COPY)
}

export function voterBlocsLlmStatus(status) {
  return mapStatus(status, VOTER_BLOCS_COPY)
}

export function partyProfileLlmStatus(status) {
  return mapStatus(status, PARTY_PROFILE_COPY)
}
