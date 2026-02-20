# 易宿酒店预订平台 — PC 管理端接口约定

> 本文档面向 PC 端管理后台（商户 / 管理员）。字段如有变更，请同步更新 `xiecheng-pcend` 中的 `src/types` 与 `src/services`。

**Base URL**：由 PC 项目 `src/services/request.js` 中的 `BASE_URL` 配置（默认 `http://localhost:3000/api`）。

**公共约定**：

- 请求体：`Content-Type: application/json`
- 响应体：JSON
- 日期格式：`YYYY-MM-DD`（如 `2025-02-01`）
- 若未特殊说明，成功返回格式统一为：

```json
{
  "code": 0,
  "message": "ok",
  "data": { ... },
  "meta": { ... }
}
```

---

## 1. 认证模块（Auth）

对应 PC 端 `src/services/auth.js`：`login` / `register` / `fetchCurrentUser`。

### 1.1 登录

**请求**

| 方法 | 路径        | 说明           |
|------|-------------|----------------|
| POST | /auth/login | 商户/管理员登录 |

**请求体**

| 字段     | 类型   | 必填 | 说明         |
|----------|--------|------|--------------|
| username | string | 是   | 用户名（唯一） |
| password | string | 是   | 登录密码     |

**响应示例**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user": {
      "id": "1",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

**说明**

- 当前版本不返回 token，也不做真正的会话管理，仅用于 PC 端区分角色与展示权限。
- 账号数据来源：`users` 表，seed 默认提供：
  - 管理员：`admin / admin123`
  - 商户：`merchant / merchant123`

### 1.2 注册

**请求**

| 方法 | 路径           | 说明       |
|------|----------------|------------|
| POST | /auth/register | 商户注册账号 |

**请求体**

| 字段     | 类型   | 必填 | 说明           |
|----------|--------|------|----------------|
| username | string | 是   | 用户名（唯一） |
| password | string | 是   | 登录密码       |

**响应示例**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "2",
    "username": "merchant001",
    "role": "merchant"
  }
}
```

**错误约定**

- 用户名已存在：`409 username already exists`，`code` 为 `1003`。

### 1.3 获取当前用户信息

**请求**

| 方法 | 路径    | 说明         |
|------|---------|--------------|
| GET  | /auth/me | 获取当前登录用户信息 |

**响应示例**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "demo_merchant",
    "username": "demo_merchant",
    "role": "merchant"
  }
}
```

**说明**

- 当前版本未接入真实会话，`/auth/me` 返回固定示例用户，PC 端可据此先打通流程。

---

## 2. 酒店管理模块（Hotel）

对应 PC 端 `src/services/hotel.js`：`fetchHotelDetail` / `createHotel` / `updateHotel` / `fetchHotelReviewList` / `approveHotel` / `rejectHotel` / `toggleHotelOnlineStatus`。

统一说明：

- 所有路径前缀均为 `/api`。
- 状态字段 `status` 为字符串，在后端内部映射到数值枚举：
  - `pending`：待审核
  - `online`：已上线（对移动端可见）
  - `offline`：已下线
  - `rejected`：审核不通过

### 2.1 获取酒店详情（管理端视角）

**请求**

| 方法 | 路径        | 说明                     |
|------|-------------|--------------------------|
| GET  | /hotels/:id | 酒店详情（含管理端字段） |

**路径参数**

| 字段 | 类型   | 必填 | 说明   |
|------|--------|------|--------|
| id   | string | 是   | 酒店 ID |

**响应示例**

```json
{
  "id": "1",
  "name": "某某大酒店（上海店）",
  "nameEn": null,
  "address": "上海市浦东新区某路 100 号",
  "starLevel": 5,
  "star": 5,
  "basePrice": 399,
  "openedAt": "2025-02-20",
  "status": "online",
  "facilities": ["免费WiFi", "停车场"],
  "images": ["https://..."],
  "roomTypes": [
    {
      "id": "101",
      "name": "标准大床房",
      "bedType": "大床",
      "price": 399,
      "area": "25㎡",
      "breakfast": "含早"
    }
  ]
}
```

**说明**

- `star` 与 `starLevel` 数值相同，PC 端可直接使用 `star`。
- `basePrice` 来自 `hotels.min_price_cache`，用于管理端表单的“基础房价（起）”。
- `openedAt` 优先取 `extra.openedAt`，否则回退为 `created_at` 的日期。

### 2.2 创建酒店

**请求**

| 方法 | 路径   | 说明         |
|------|--------|--------------|
| POST | /hotels | 创建新酒店（商户） |

**请求体**

| 字段       | 类型     | 必填 | 说明                                     |
|------------|----------|------|------------------------------------------|
| name       | string   | 是   | 酒店名称（中文）                           |
| nameEn     | string   | 否   | 酒店名称（英文）                           |
| address    | string   | 否   | 地址                                     |
| cityId     | number   | 否   | 城市 ID（未传时自动选一城市）               |
| star       | number   | 否   | 星级（3/4/5）                             |
| openedAt   | string   | 否   | 开业日期 `YYYY-MM-DD`                    |
| basePrice  | number   | 否   | 基础房价（起）                            |
| roomTypes  | string   | 否   | 房型说明（文本）                           |
| highlights | string   | 否   | 周边亮点（文本）                           |
| images     | string[] | 否   | 图片 URL 列表；不传则后端生成默认图片（3 张） |

**响应示例**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "51"
  }
}
```

**说明**

- 新建酒店默认状态为 `pending`（待审核），不会出现在移动端对外售卖列表。

### 2.3 更新酒店

**请求**

| 方法 | 路径        | 说明         |
|------|-------------|--------------|
| PUT  | /hotels/:id | 更新酒店信息（商户） |

**请求体**

- 与创建时字段相同，支持部分字段更新；未传字段保持不变。
- 若传 `images: string[]`，则覆盖原有图片（至少第一张作为封面）。

**响应示例**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 1,
    "name": "某某大酒店（上海店）",
    "basePrice": 429,
    "openedAt": "2025-02-20",
    "status": "pending"
  }
}
```

### 2.4 审核列表（管理员）

**请求**

| 方法 | 路径           | 说明           |
|------|----------------|----------------|
| GET  | /hotels/review | 酒店审核列表（仅后台使用） |

**Query 参数**

| 字段     | 类型   | 必填 | 说明                                   |
|----------|--------|------|----------------------------------------|
| page     | number | 否   | 页码，从 1 开始，默认 1               |
| pageSize | number | 否   | 每页条数，默认 10                     |
| status   | string | 否   | `pending` / `online` / `offline` / `rejected` |

**响应示例**

```json
{
  "code": 0,
  "message": "ok",
  "data": [
    {
      "id": "1",
      "name": "某某大酒店（上海店）",
      "address": "上海市浦东新区某路 100 号",
      "star": 5,
      "basePrice": 399,
      "status": "pending",
      "openedAt": "2025-02-20",
      "city": {
        "id": 310100,
        "name": "上海"
      }
    }
  ],
  "meta": {
    "total": 32,
    "page": 1,
    "pageSize": 10
  }
}
```

### 2.5 审核通过

**请求**

| 方法 | 路径                  | 说明         |
|------|-----------------------|--------------|
| POST | /hotels/:id/approve   | 审核通过（管理员） |

**请求体**

| 字段   | 类型   | 必填 | 说明       |
|--------|--------|------|------------|
| remark | string | 否   | 审核备注说明 |

**响应示例**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "1",
    "status": "online"
  }
}
```

**说明**

- 后端会将酒店状态设置为 `online`，同时可在内部记录 `approvalRemark`。

### 2.6 审核不通过

**请求**

| 方法 | 路径                 | 说明           |
|------|----------------------|----------------|
| POST | /hotels/:id/reject   | 审核不通过（管理员） |

**请求体**

| 字段   | 类型   | 必填 | 说明           |
|--------|--------|------|----------------|
| reason | string | 否   | 不通过原因（记录在后台） |

**响应示例**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "1",
    "status": "rejected"
  }
}
```

### 2.7 上线 / 下线

**请求**

| 方法 | 路径                | 说明                   |
|------|---------------------|------------------------|
| POST | /hotels/:id/status  | 切换酒店上线 / 下线状态 |

**请求体**

| 字段   | 类型   | 必填 | 说明                                   |
|--------|--------|------|----------------------------------------|
| status | string | 是   | `online` / `offline` / `pending` / `rejected` |

**响应示例**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "1",
    "status": "offline"
  }
}
```

**说明**

- 建议业务上约定：审核通过后统一使用 `approve` 进入 `online`，后续运营上下线使用 `/status` 接口在 `online` / `offline` 之间切换。

---

## 3. 类型与实现位置（PC）

| 类型名 | 说明         | 定义位置                    |
|--------|--------------|-----------------------------|
| User   | 用户信息     | xiecheng-pcend/src/types    |
| Hotel  | 酒店信息（PC） | xiecheng-pcend/src/types    |

**接口封装**

- 认证：`xiecheng-pcend/src/services/auth.js`
- 酒店管理：`xiecheng-pcend/src/services/hotel.js`
