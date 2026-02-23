/**
 * 登录态本地存储，与 request 无依赖，避免循环引用。
 * request 拦截器只读 getStoredToken；登录成功后由 auth.login 调用 setStoredAuth。
 */
const STORAGE_USER = 'pc_user'
const STORAGE_TOKEN = 'pc_token'

export function getStoredUser() {
  try {
    const s = localStorage.getItem(STORAGE_USER)
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}

export function getStoredToken() {
  return localStorage.getItem(STORAGE_TOKEN) || ''
}

export function setStoredAuth(user, token) {
  if (user) localStorage.setItem(STORAGE_USER, JSON.stringify(user))
  else localStorage.removeItem(STORAGE_USER)
  if (token) localStorage.setItem(STORAGE_TOKEN, token)
  else localStorage.removeItem(STORAGE_TOKEN)
}

export function clearStoredAuth() {
  localStorage.removeItem(STORAGE_USER)
  localStorage.removeItem(STORAGE_TOKEN)
}
