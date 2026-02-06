import request from './request.js'

// 登录接口占位：具体路径与字段后续和后端对齐
export function login(payload) {
  return request.post('/auth/login', payload)
}

// 注册接口占位
export function register(payload) {
  return request.post('/auth/register', payload)
}

// 获取当前登录用户信息
export function fetchCurrentUser() {
  return request.get('/auth/me')
}

