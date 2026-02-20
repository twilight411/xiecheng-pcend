import request from './request.js'

/**
 * 登录。请求体: { username, password }
 * 成功返回: { user: { id, username, role } }，role 为 'admin' | 'merchant'
 */
export async function login(payload) {
  const res = await request.post('/auth/login', payload)
  return res.data
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

