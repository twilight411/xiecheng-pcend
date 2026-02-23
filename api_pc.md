  # 易宿酒店预订平台 — PC 管理端接口约定

  > 本文档面向 PC 端管理后台（商户 / 管理员）。字段如有变更，请同步更新 `xiecheng-pcend` 中的 `src/types` 与 `src/services`。  
  > **英文名、城市、房型说明** 的 2.0 约定（请求/响应与前端取数）见 **docs/api_pc_2.0.md**。

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
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

  **说明**

  - 返回的 `token` 需在后续需认证的请求头中携带：`Authorization: Bearer <token>`（如酒店列表商户隔离、创建/更新酒店、审核列表等）。
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

**说明**

- 当前注册接口不返回 token，注册成功后需调用登录接口获取 `token` 后再访问需认证的酒店接口。

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
  - 需认证的接口请在请求头携带：`Authorization: Bearer <登录返回的 token>`。
  - 状态字段 `status` 为字符串，在后端内部映射到数值枚举：
    - `pending`：待审核
    - `online`：已上线（对移动端可见）
    - `offline`：已下线
    - `rejected`：审核不通过

  ### 2.0 获取酒店列表（商户「我的酒店」）

  **请求**

  | 方法 | 路径      | 说明 |
  |------|-----------|------|
  | GET  | /hotels   | 酒店列表（行为依赖是否带 token） |

  **请求头（商户端必带）**

  | 字段            | 类型   | 必填 | 说明 |
  |-----------------|--------|------|------|
  | Authorization   | string | 商户必填 | `Bearer <token>`，登录后返回的 token |

  **Query 参数**（与移动端一致，可选）

  | 字段     | 类型   | 必填 | 说明 |
  |----------|--------|------|------|
  | cityId   | number | 否   | 城市 ID |
  | keyword  | string | 否   | 关键词 |
  | checkIn  | string | 否   | 入住日期 `YYYY-MM-DD` |
  | checkOut | string | 否   | 退房日期 `YYYY-MM-DD` |
  | page     | number | 否   | 页码，默认 1 |
  | pageSize | number | 否   | 每页条数，默认 10 |

  **行为说明**

  - **商户登录后**（请求头带有效 `Authorization` 且角色为 `merchant`）：仅返回**该商户名下**的酒店（含待审核、已上线、已拒绝等全部状态）；新建商户未创建酒店时列表为空。
  - **未带 token 或非商户**：返回全平台已上线酒店（与 C 端/移动端一致，PC 端商户列表请务必带 token）。

  **响应示例**

  与移动端列表格式一致，例如：

  ```json
  {
    "list": [
      {
        "id": "1",
        "name": "某某大酒店（上海店）",
        "address": "上海市浦东新区某路 100 号",
        "starLevel": 5,
        "score": 4.8,
        "minPrice": 399,
        "images": ["https://..."]
      }
    ],
    "page": 1,
    "pageSize": 10,
    "total": 1
  }
  ```

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
  - **编辑页与查看详情依赖**：响应中须包含 `nameEn`、`city`（或 `cityName`）、房型说明。房型说明：后端可在 `roomTypesSummary`（字符串）中返回商户提交的房型文案，编辑页与审核「查看详情」优先用 `roomTypesSummary` 回填/展示；`roomTypes` 可为房间列表数组，二者可同时存在。

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
  | city       | string   | 否   | 城市名称（PC 端当前为手动输入，会传此字段；若后端支持请持久化并在 2.1 中返回） |
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
| PUT  | /hotels/:id | 更新酒店信息（需认证；商户只能改自己的） |

**请求头**：`Authorization: Bearer <token>` 必填。

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

### 2.4 审核列表（管理员 / 商户）

**请求**

| 方法 | 路径           | 说明           |
|------|----------------|----------------|
| GET  | /hotels/review | 酒店审核/管理列表（需认证） |

**请求头**：`Authorization: Bearer <token>` 必填。

**行为说明**

- **管理员**：看到**全部**酒店（可按 status 筛选待审核、已上线等）。
- **商户**：仅看到**自己提交**的酒店。

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
        "city": { "id": 310100, "name": "上海" },
        "cityName": "上海"
      }
    ],
    "meta": { "total": 32, "page": 1, "pageSize": 10 }
  }
  ```

  **说明**：列表项含 **city**（`{ id, name }`）、**cityName**（与 `city.name` 一致）。城市显示名后端优先用 `extra.cityNameDisplay`，无则退回 `cities.name`；前端列表展示用 `item.cityName` 或 `item.city.name` 即可（二者已一致，支持汝城等自定义城市名）。

### 2.5 审核通过

**请求**

| 方法 | 路径                  | 说明         |
|------|-----------------------|--------------|
| POST | /hotels/:id/approve   | 审核通过（**仅管理员**） |

**请求头**：`Authorization: Bearer <token>` 必填；非管理员返回 403。

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
| POST | /hotels/:id/reject   | 审核不通过（**仅管理员**） |

**请求头**：`Authorization: Bearer <token>` 必填；非管理员返回 403。

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
| POST | /hotels/:id/status  | 切换酒店上线 / 下线状态（需认证；管理员可操作任意，商户仅可操作自己的） |

**请求头**：`Authorization: Bearer <token>` 必填。

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
  - **重新提交审核**：商户在「未通过」酒店上修改内容后，先 `PUT /hotels/:id` 再调用本接口传 `{ "status": "pending" }`（带商户 token），即可将状态从 rejected 改为 pending，管理员在审核列表中可见并再次审核。PC 端编辑页「更新并重新提交审核」已按此流程实现。

  ---

  ## 3. 类型与实现位置（PC）

  | 类型名 | 说明         | 定义位置                    |
  |--------|--------------|-----------------------------|
  | User   | 用户信息     | xiecheng-pcend/src/types    |
  | Hotel  | 酒店信息（PC） | xiecheng-pcend/src/types    |

  **接口封装**

  - 认证：`xiecheng-pcend/src/services/auth.js`
  - 酒店管理：`xiecheng-pcend/src/services/hotel.js`

  ---

  ## 4. 后端对接必做（审核与详情）

  以下为 PC 端管理员审核流程的前端依赖，后端需保证满足，否则会出现「无法查看详情、点击通过没反应」等问题。

  **4.1 审核列表与 id 一致性**

  - `GET /hotels/review` 返回的每条酒店必须带有字段 `id`（与库中主键一致，可为数字或字符串）。
  - 该 `id` 必须能用于：
    - `GET /hotels/:id`（管理员查看详情）
    - `POST /hotels/:id/approve`（通过）
    - `POST /hotels/:id/reject`（不通过）
    - `POST /hotels/:id/status`（上线/下线）
  - 即：审核列表里出现的酒店，用其 `id` 去请求上述接口时，**不能返回 404**。

  **4.2 酒店详情 GET /hotels/:id（管理员）**

  - 当请求头带 `Authorization: Bearer <管理员 token>` 且当前用户为管理员时：
  - 必须按 `:id` 返回该酒店详情，**与酒店状态（pending/online/rejected/offline）、与 user_id 归属无关**。
  - 若仅对「当前用户为 owner 或 status=online」才返回 200，其余 404，会导致管理员在审核列表点击「查看详情」或依赖详情的流程时拿到 404，无法查看、影响操作。
  - 建议：管理员身份下，仅根据 `id` 查酒店并返回；不存在再 404。

  **4.3 审核通过 POST /hotels/:id/approve**

  - 仅管理员可调；后端根据 `:id` 将对应酒店状态置为 `online`。
  - 若后端实现是「先 GET 酒店再更新」，需保证管理员能通过 `:id` 查到该酒店（与 4.2 一致），否则会同样返回 404，前端表现为「点击通过没反应」（实际为接口 404，错误提示已在前端展示）。
  - 响应格式见 2.5；列表数组若为 `response.data.data`，前端已按此取值。

  **4.4 状态同步与列表一致性**

  - **商户端「我的酒店」**（GET /hotels，带商户 token）必须返回**最新审核状态**。管理员执行通过/不通过/下线后，该接口应返回更新后的 `status`（如 `online` / `rejected` / `offline`），否则商户列表会一直显示「待审核」。
  - **审核列表**（GET /hotels/review）返回的 `status` 与商户列表一致（同一酒店同一状态）。前端已兼容 `status` 为字符串或数字（如 1=pending, 2=online, 3=rejected, 4=offline）。
  - **商户编辑后重新提交**：PUT /hotels/:id 成功后，管理员审核列表 GET /hotels/review 应能拿到该酒店的最新信息；若列表或详情仍为旧数据，需检查后端是否正确更新并返回。
