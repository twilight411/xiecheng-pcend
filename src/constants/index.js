// 用户角色
export const USER_ROLES = {
  MERCHANT: 'merchant',
  ADMIN: 'admin',
}

// 审核状态（与后端 API 一致）
export const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'online',   // 后端“通过”即 online
  REJECTED: 'rejected',
  OFFLINE: 'offline',
}

// 通用分页大小
export const PAGE_SIZE = 10

