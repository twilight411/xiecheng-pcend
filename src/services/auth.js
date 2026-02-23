import request from './request.js'
import { setStoredAuth } from './authStorage.js'

export { getStoredUser, getStoredToken, setStoredAuth, clearStoredAuth } from './authStorage.js'

/**
 * 登录。请求体: { username, password }
 * 成功返回: { user: { id, username, role }, token?: string }，role 为 'admin' | 'merchant'
 * 会保存 user 与 token 到本地，请求拦截器会自动带 Authorization: Bearer <token>
 */
export async function login(payload) {
  const res = await request.post('/auth/login', payload)
  const data = res.data || res
  const user = data.user || data
  const token =
    data.token ||
    data.accessToken ||
    data.access_token ||
    (data.data && (data.data.token || data.data.accessToken || data.data.access_token)) ||
    ''
  setStoredAuth(user, token)
  return data
}

/**
 * 注册。请求体: { username, password }
 * 成功返回: { id, username, role }。用户名已存在时后端返回 code 1003
 */
export async function register(payload) {
  const res = await request.post('/auth/register', payload)
  return res.data
}

/**
 * 获取当前登录用户。成功返回: { id, username, role }
 */
export async function fetchCurrentUser() {
  const res = await request.get('/auth/me')
  return res.data
}

