import { computed, ref, watch } from 'vue'

function mergeOrder(currentOrder, nextKeys) {
  const nextKeySet = new Set(nextKeys)
  const retained = currentOrder.filter((key) => nextKeySet.has(key))
  const retainedSet = new Set(retained)
  return [...retained, ...nextKeys.filter((key) => !retainedSet.has(key))]
}

function moveInOrder(order, source, target) {
  const nextOrder = [...order]
  const fromIndex = nextOrder.indexOf(source)
  const toIndex = nextOrder.indexOf(target)
  if (fromIndex < 0 || toIndex < 0) return null

  nextOrder.splice(fromIndex, 1)
  nextOrder.splice(toIndex, 0, source)
  return nextOrder
}

export function useBuilderCardOrder({ provinceSummaries, regionSummaries, sidebarProvinceOrder }) {
  const regionOrder = ref([])
  const provinceOrder = ref([])
  const hasCustomRegionOrder = ref(false)
  const hasCustomProvinceOrder = ref(false)
  const draggedRegionName = ref(null)
  const dropTargetRegionName = ref(null)
  const draggedProvinceIndex = ref(null)
  const dropTargetProvinceIndex = ref(null)

  const orderedProvinceSummaries = computed(() => {
    const provinceMap = new Map(provinceSummaries.value.map((province) => [province.index, province]))
    const ordered = provinceOrder.value.map((index) => provinceMap.get(index)).filter(Boolean)
    const orderedIndices = new Set(ordered.map((province) => province.index))
    const missing = provinceSummaries.value.filter((province) => !orderedIndices.has(province.index))
    return [...ordered, ...missing]
  })

  const orderedRegionSummaries = computed(() => {
    const regionMap = new Map(regionSummaries.value.map((region) => [region.name, region]))
    const ordered = regionOrder.value.map((name) => regionMap.get(name)).filter(Boolean)
    const orderedNames = new Set(ordered.map((region) => region.name))
    const missing = regionSummaries.value.filter((region) => !orderedNames.has(region.name))
    return [...ordered, ...missing]
  })

  watch(
    () => regionSummaries.value.map((region) => region.name),
    (names) => {
      regionOrder.value = hasCustomRegionOrder.value ? mergeOrder(regionOrder.value, names) : names
    },
    { immediate: true }
  )

  watch(
    sidebarProvinceOrder,
    (indices) => {
      provinceOrder.value = hasCustomProvinceOrder.value ? mergeOrder(provinceOrder.value, indices) : indices
    },
    { immediate: true }
  )

  function onRegionDragStart(event, regionName) {
    draggedRegionName.value = regionName
    dropTargetRegionName.value = regionName
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', regionName)
  }

  function onRegionDragEnter(regionName) {
    if (draggedRegionName.value === null) return
    dropTargetRegionName.value = regionName
  }

  function onRegionDrop(targetRegionName) {
    const sourceRegionName = draggedRegionName.value
    if (sourceRegionName === null || sourceRegionName === targetRegionName) {
      onRegionDragEnd()
      return
    }

    const order = moveInOrder(
      orderedRegionSummaries.value.map((region) => region.name),
      sourceRegionName,
      targetRegionName
    )
    if (!order) {
      onRegionDragEnd()
      return
    }

    regionOrder.value = order
    hasCustomRegionOrder.value = true
    onRegionDragEnd()
  }

  function onRegionDragEnd() {
    draggedRegionName.value = null
    dropTargetRegionName.value = null
  }

  function onProvinceDragStart(event, provinceIndex) {
    draggedProvinceIndex.value = provinceIndex
    dropTargetProvinceIndex.value = provinceIndex
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(provinceIndex))
  }

  function onProvinceDragEnter(provinceIndex) {
    if (draggedProvinceIndex.value === null) return
    dropTargetProvinceIndex.value = provinceIndex
  }

  function onProvinceDrop(targetProvinceIndex) {
    const sourceProvinceIndex = draggedProvinceIndex.value
    if (sourceProvinceIndex === null || sourceProvinceIndex === targetProvinceIndex) {
      onProvinceDragEnd()
      return
    }

    const order = moveInOrder(
      orderedProvinceSummaries.value.map((province) => province.index),
      sourceProvinceIndex,
      targetProvinceIndex
    )
    if (!order) {
      onProvinceDragEnd()
      return
    }

    provinceOrder.value = order
    hasCustomProvinceOrder.value = true
    onProvinceDragEnd()
  }

  function onProvinceDragEnd() {
    draggedProvinceIndex.value = null
    dropTargetProvinceIndex.value = null
  }

  return {
    draggedProvinceIndex,
    draggedRegionName,
    dropTargetProvinceIndex,
    dropTargetRegionName,
    onProvinceDragEnd,
    onProvinceDragEnter,
    onProvinceDragStart,
    onProvinceDrop,
    onRegionDragEnd,
    onRegionDragEnter,
    onRegionDragStart,
    onRegionDrop,
    orderedProvinceSummaries,
    orderedRegionSummaries,
  }
}
