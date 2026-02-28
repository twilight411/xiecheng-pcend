# 易宿酒店预订平台 — PC 管理端接口约定

> 本文档面向 PC 端管理后台（商户 / 管理员）。字段如有变更，请同步更新 `xiecheng-pcend` 中的 `src/types` 与 `src/services`。  
> **英文名、城市、房型说明** 的请求/响应与前端对接见 **[api_pc_2.0.md](./api_pc_2.0.md)**。

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

- **商户登录后**（请求头带有效 `Authorization` 且角色为 `merchant`）：仅返回**该商户名下**的酒店（含待审核、已上线、已拒绝等全部状态）；每条带 `status`（`pending`/`online`/`rejected`/`offline`）、**`rejectReason`**（审核不通过时管理员填写的未通过原因，与 POST /hotels/:id/reject 的 reason 一致）、**`updatedAt`**（最近更新时间，ISO 8601 字符串），便于「我的酒店」列表展示未通过原因与最近更新时间列。
- **管理员登录后**（角色为 `admin`）：返回全平台**已上线**酒店，与审核列表互补（审核列表用 GET /hotels/review）。
- **未带 token**：返回全平台已上线酒店（与 C 端/移动端一致）。

**响应格式（带 token 时）**

PC 端带 token 时返回统一结构，便于用 `data` 展示列表：

```json
{
  "code": 0,
  "message": "ok",
  "data": [
      {
        "id": "1",
        "name": "某某大酒店（上海店）",
        "address": "上海市浦东新区某路 100 号",
        "starLevel": 5,
        "score": 4.8,
        "minPrice": 399,
        "images": ["https://..."],
        "status": "online",
        "rejectReason": null,
        "updatedAt": "2025-02-20T08:00:00.000Z"
      }
    ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

（未带 token 时仍为 `{ list, page, pageSize, total }`，与移动端一致。）

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
    "nameEn": "Example Hotel Shanghai",
    "address": "上海市浦东新区某路 100 号",
    "starLevel": 5,
    "star": 5,
    "basePrice": 399,
    "openedAt": "2025-02-20",
    "status": "online",
    "facilities": ["免费WiFi", "停车场"],
    "coverImage": "https://...",
    "carouselImages": ["https://...", "https://..."],
    "images": ["https://..."],
    "roomTypes": [
      {
        "id": "101",
        "name": "标准大床房",
        "bedType": "大床",
        "price": 399,
        "area": "25㎡",
        "breakfast": "含早",
        "image": "https://..."
      }
    ],
    "roomTypesSummary": "豪华大床房 399元/晚 含早；高级双床房 499元/晚",
    "city": { "id": 1, "name": "上海", "countryCode": "CN" },
    "cityName": "上海"
  }
  ```

  **说明**

  - **封面与轮播**：`coverImage` 为酒店封面图（一张），`carouselImages` 为轮播图 URL 数组（含封面顺序）；`images` 与 `carouselImages` 一致，兼容旧版。管理员/移动端详情均可据此展示封面与轮播。
  - **房型图**：`roomTypes[].image` 为对应房型的主图（一张），用于审核与移动端房型列表展示。
  - `star` 与 `starLevel` 数值相同，PC 端可直接使用 `star`。
  - `basePrice` 来自 `hotels.min_price_cache`，用于管理端表单的“基础房价（起）”。
  - `openedAt` 优先取 `extra.openedAt`，否则回退为 `created_at` 的日期。
  - **详情响应需包含**：`nameEn`、`city`（或 `cityName`）、房型说明字符串（如 `roomTypesSummary`），否则编辑页和审核「查看详情」会显示为空；PC 端创建/更新时已提交这些字段，后端需持久化并在本接口返回。
  - **标签与设施**：详情中 `facilities` 来自酒店 **设施**（extra.amenities，自由文本列表）；`tags` 来自 **标签表**（tags + hotel_tags，返回 `{ code, name }`）。设施和标签在后端是两套数据：创建/更新时可分别传 `facilities`（或 `amenities`）和 `tags`，都支持“填”：设施用逗号分隔字符串或数组即可；标签用逗号分隔的**名称或 code**，后端会按 tags 表匹配并关联。

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
  | city       | string   | 否   | 城市名称（PC 端会传；后端支持则按名称解析为 city_id 并持久化，在 2.1 详情中返回 city/cityName） |
  | cityId     | number   | 否   | 城市 ID（与 city 二选一；未传时自动选一城市） |
  | star       | number   | 否   | 星级（3/4/5）                             |
  | openedAt   | string   | 否   | 开业日期 `YYYY-MM-DD`                    |
  | basePrice  | number   | 否   | 基础房价（起）                            |
  | roomTypes  | string   | 否   | 房型说明（文本）                           |
  | roomTypeImages | (string\|null)[] | 否   | 房型主图 URL 数组，与 roomTypes 解析后的房型顺序一致，第 i 个为第 i 个房型的主图（一张），null/空表示不更新该房型图；不传则不改动房型图。一次提交即可落库，无需再调 PATCH 房型图。 |
  | highlights | string   | 否   | 周边亮点（文本）                           |
  | coverImage | string   | 否   | 封面图 URL（一张）；与 carouselImages 二选一或与 images 兼容 |
  | carouselImages | string[] | 否   | 轮播图 URL 数组（不含封面）；与 images 二选一 |
  | images     | string[] | 否   | 图片 URL 列表（第一张为封面，其余为轮播）；不传则后端生成默认图（3 张） |
  | facilities | string / string[] | 否   | 设施（如免费WiFi、停车场）。可传数组，或逗号/中文逗号分隔字符串，后端存为 extra.amenities；详情返回为 facilities |
  | amenities  | string / string[] | 否   | 同 facilities，二选一即可 |
  | tags       | string / string[] | 否   | 酒店标签。可传数组，或逗号/中文逗号分隔字符串；每项为标签 **名称** 或 **code**（如 豪华型、pool），后端按名称/code 匹配 tags 表并写入 hotel_tags；未匹配到的项忽略 |

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
  - **roomTypeImages**：房型主图 URL 数组（与 roomTypes 解析顺序一致），POST 时一并提交即可写入各房型 `room_photos`，无需再调 PATCH 房型图。

### 2.3 更新酒店

**请求**

| 方法 | 路径        | 说明         |
|------|-------------|--------------|
| PUT  | /hotels/:id | 更新酒店信息（需认证；商户只能改自己的） |

**请求头**：`Authorization: Bearer <token>` 必填。

**请求体**

  - 与创建时字段相同，支持部分字段更新；未传字段保持不变。
  - **roomTypeImages**：房型主图 URL 数组（与房型顺序一致），PUT 时一并提交即可写入 `room_photos`，无需再调 PATCH 房型图。
  - 图片可传 `coverImage`（封面）+ `carouselImages`（轮播数组），或 `images`（第一张为封面）。传任一项则整体覆盖酒店图片；不传任何图片字段则保留原图。图片 URL 建议先通过 **POST /api/upload/image** 上传获得。
  - **facilities** / **amenities**：传则覆盖酒店设施列表（可传空数组或空字符串清空）。
  - **tags**：传则覆盖酒店标签关联（可传空数组或空字符串清空）；每项为标签名称或 code，后端按 tags 表匹配。
  - **submittedAt**（可选）：PC 端每次点击「更新并重新提交审核」会带 `submittedAt: ISO 时间戳`，便于后端将「仅修改图片」也视为有更新、并允许随后调用的 **POST /hotels/:id/status** 将状态置为 `pending`。后端可忽略此字段或用于更新 `updated_at`。

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

### 2.4 图片上传（商户/管理员）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/upload/image | 上传单张图片，返回 URL；请求为 multipart/form-data，字段名 `file`，最大 5MB，仅支持 jpeg/png/gif/webp。 |

响应示例：`{ "code": 0, "message": "ok", "data": { "url": "https://host/uploads/xxx.jpg" } }`。该 URL 可直接用于创建/更新酒店的 `images` 或房型的 `imageUrls`。详见 [IMAGE_UPLOAD_FLOW.md](IMAGE_UPLOAD_FLOW.md)。

### 2.5 更新房型图片

| 方法 | 路径 | 说明 |
|------|------|------|
| PATCH | /api/hotels/:hotelId/rooms/:roomId | 更新指定房型的图片列表（需认证；商户仅能改自己酒店的房型）。 |

**请求体**：`{ "imageUrls": ["url1", "url2", ...] }`，URL 来自 POST /api/upload/image。传空数组即清空该房型图片。

**响应**：`{ "code": 0, "message": "ok", "data": <房型对象含 images> }`。房型列表 GET /api/hotels/:hotelId/rooms 中每个房型已包含 `images` 数组。

### 2.6 审核列表（管理员 / 商户）

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
        "city": {
          "id": 310100,
          "name": "上海"
        },
        "cityName": "上海"
      }
    ],
    "meta": {
      "total": 32,
      "page": 1,
      "pageSize": 10
    }
  }
  ```

  **列表项城市字段说明**：每条数据包含 `city`（`{ id, name }`）与 `cityName`（字符串）。城市显示名优先使用商户填写的名称（存于 `extra.cityNameDisplay`，如「汝城」），若无则使用 `cities` 表对应名称。前端展示列表城市时请用 `item.cityName` 或 `item.city.name`。

### 2.7 审核通过

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

### 2.8 审核不通过

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

### 2.9 上线 / 下线

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
  - **商户重新提交审核**：被拒绝后，商户修改内容后可再次提交审核。调用本接口，传 `status: "pending"`，即可将酒店置为待审核；管理员在「待审核」列表中会看到该酒店，可再次通过/拒绝。

### 2.10 审核与推送流程（后端支持情况）

| 步骤 | 操作 | 接口 | 说明 |
|------|------|------|------|
| 1 | 商户提交酒店 | POST /hotels | 新建酒店，状态为 `pending` |
| 2 | 管理员通过 | POST /hotels/:id/approve | 仅管理员；状态变为 `online`，**移动端 GET /hotels 可见** |
| 2' | 管理员不通过 | POST /hotels/:id/reject | 仅管理员；状态变为 `rejected` |
| 3 | 商户看到未通过 | GET /hotels（带商户 token）或 GET /hotels/review | 列表项含 `status`，可展示「未通过」 |
| 4 | 商户修改后重新提交 | PUT /hotels/:id 修改内容后，再 POST /hotels/:id/status 传 `{ "status": "pending" }` | 状态从 `rejected` 改为 `pending` |
| 5 | 管理员看到重新提交 | GET /hotels/review?status=pending | 待审核列表中出现该酒店，可再次通过/拒绝 |
| 6 | 通过后推送到移动端 | 移动端 GET /hotels（无 token） | 只返回 `status=online` 的酒店，审核通过的酒店会出现在移动端 |

  ---

  ## 3. 类型与实现位置（PC）

  | 类型名 | 说明         | 定义位置                    |
  |--------|--------------|-----------------------------|
  | User   | 用户信息     | xiecheng-pcend/src/types    |
  | Hotel  | 酒店信息（PC） | xiecheng-pcend/src/types    |

  **接口封装**

  - 认证：`xiecheng-pcend/src/services/auth.js`
  - 酒店管理：`xiecheng-pcend/src/services/hotel.js`
