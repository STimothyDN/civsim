export function parsePath(path) {
  if (!path) return []

  const pathParts = []
  const regex = /([^\[\.]+)|\[(\d+)\]/g
  let match
  while ((match = regex.exec(path)) !== null) {
    if (match[1]) {
      pathParts.push(match[1])
    } else if (match[2]) {
      pathParts.push(Number(match[2]))
    }
  }
  return pathParts
}

export function getValueAtPath(obj, path) {
  const parts = parsePath(path)
  let current = obj
  for (let part of parts) {
    if (current === undefined || current === null) return undefined
    current = current[part]
  }
  return current
}

export function setValueAtPath(obj, path, value) {
  const parts = parsePath(path)
  if (!obj || parts.length === 0) return false

  let current = obj
  for (let i = 0; i < parts.length - 1; i += 1) {
    current = current[parts[i]]
    if (current === undefined || current === null) return false
  }

  current[parts[parts.length - 1]] = value
  return true
}

export function removeValueAtPath(obj, path) {
  const parts = parsePath(path)
  if (!obj || parts.length === 0) return false

  let current = obj
  for (let i = 0; i < parts.length - 1; i += 1) {
    current = current[parts[i]]
    if (current === undefined || current === null) return false
  }

  delete current[parts[parts.length - 1]]
  return true
}
