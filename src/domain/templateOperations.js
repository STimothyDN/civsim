export function addNamedItem(list, name) {
  if (!Array.isArray(list)) return [name]
  list.push(name)
  return list
}

export function removeProvinceGroup(data, index) {
  if (!data || !Array.isArray(data.province_groups)) return null

  const removed = data.province_groups.splice(index, 1)[0]
  if (Array.isArray(data.provinces)) {
    data.provinces.forEach((province) => {
      if (province.group === removed) province.group = null
    })
  }

  return removed
}

export function renameProvinceGroup(data, index, newName) {
  if (!data || !Array.isArray(data.province_groups)) return null

  const oldName = data.province_groups[index]
  data.province_groups[index] = newName

  if (Array.isArray(data.provinces)) {
    data.provinces.forEach((province) => {
      if (province.group === oldName) province.group = newName
    })
  }

  return oldName
}

export function renameGlobalReligion(data, index, newName) {
  if (!data || !Array.isArray(data.global_religions)) return null

  const oldName = data.global_religions[index]
  data.global_religions[index] = newName

  if (Array.isArray(data.provinces)) {
    data.provinces.forEach((province) => {
      if (!Array.isArray(province.religions)) return

      province.religions.forEach((religion) => {
        if (religion.name === oldName) religion.name = newName
      })
    })
  }

  if (data.country?.state_religion === oldName) {
    data.country.state_religion = newName
  }

  return oldName
}

export function setNationalCapital(data, provinceIndex) {
  if (!data || !Array.isArray(data.provinces)) return

  data.provinces.forEach((province, index) => {
    province.is_national_capital = index === provinceIndex
  })
}

export function setRegionalCapital(data, provinceIndex) {
  if (!data || !Array.isArray(data.provinces)) return

  const province = data.provinces[provinceIndex]
  if (!province) return

  const group = province.group
  data.provinces.forEach((candidate, index) => {
    if (candidate.group === group && index !== provinceIndex) {
      candidate.is_regional_capital = false
    }
  })
  province.is_regional_capital = true
}
