import { Button, Card, Col, DatePicker, Divider, Form, Input, InputNumber, Modal, Row, Select, Space, Tag, Typography, Upload, message } from 'antd'
import { REVIEW_STATUS } from '../constants/index.js'
import { MinusCircleOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createHotel, updateHotel, fetchHotelDetail, setHotelStatus, updateRoomImages } from '../services/hotel.js'
import { uploadImage } from '../services/upload.js'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input
const { Option } = Select

const HOTEL_DRAFT_KEY = 'pc_hotel_draft'

/** 仅当为真实 http(s) 地址时视为已上传 URL，避免把 blob 预览地址传给后端 */
function isHttpUrl(s) {
  return typeof s === 'string' && (s.startsWith('http://') || s.startsWith('https://'))
}

/** 为本地未上传的图片文件补充 thumbUrl，便于 Upload 展示预览 */
function normalizeFileListWithPreview(fileList) {
  if (!Array.isArray(fileList)) return fileList
  return fileList.map((file) => {
    const url = file.url || file.thumbUrl
    if (url) return file
    const raw = file.originFileObj ?? file
    if (raw instanceof File) return { ...file, thumbUrl: URL.createObjectURL(raw) }
    return file
  })
}

/** 把后端返回的房型字符串或数组解析为 roomTypesList（与 buildPayload 序列化格式一致）；数组时带回 roomImage 用于回填房型图 */
function parseRoomTypesFromDetail(roomTypes) {
  if (Array.isArray(roomTypes) && roomTypes.length) {
    return roomTypes.map((r, i) => ({
      name: r.name ?? '',
      price: r.price,
      capacity: r.capacity ?? 2,
      breakfast: r.breakfast,
      roomImage: r.image ? [{ uid: `room-img-${i}`, url: r.image, name: 'room.jpg', status: 'done' }] : [],
    }))
  }
  if (typeof roomTypes !== 'string' || !roomTypes.trim()) {
    return [{ name: '', price: undefined, capacity: 2, breakfast: undefined, roomImage: [] }]
  }
  const parts = roomTypes.split(/[；;]/).map((s) => s.trim()).filter(Boolean)
  if (!parts.length) return [{ name: '', price: undefined, capacity: 2, breakfast: undefined, roomImage: [] }]
  return parts.map((part) => {
    const priceMatch = part.match(/(\d+)\s*元\/晚/)
    const price = priceMatch ? Number(priceMatch[1]) : undefined
    const name = priceMatch ? part.slice(0, priceMatch.index).trim() || part : part
    const hasBreakfast = /含早/.test(part)
    const noBreakfast = /不含早/.test(part)
    const breakfast = hasBreakfast ? '含早' : noBreakfast ? '不含早' : undefined
    return { name: name || '', price, capacity: 2, breakfast, roomImage: [] }
  })
}

function formatDate(v) {
  if (!v) return undefined
  if (typeof v.format === 'function') return v.format('YYYY-MM-DD')
  const d = new Date(v)
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10)
}

/** 将「设施」或「标签」的填值转为数组：支持逗号/中文逗号分隔字符串或已是数组；用于 facilities / tags 请求体 */
function parseCommaList(val) {
  if (Array.isArray(val)) return val.map((s) => (s && typeof s === 'object' && (s.name != null || s.code != null) ? (s.name ?? s.code) : String(s)).trim()).filter(Boolean)
  if (val == null || val === '') return undefined
  const str = String(val).trim()
  if (!str) return undefined
  return str.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
}

/** 详情中的 facilities 数组 → 表单填写的逗号分隔字符串 */
function formatFacilitiesForForm(arr) {
  if (!Array.isArray(arr) || !arr.length) return ''
  return arr.map((s) => (s && typeof s === 'object' ? s.name ?? s.code ?? '' : String(s))).filter(Boolean).join(', ')
}

/** 详情中的 tags（{ code, name }[]）→ 表单填写的逗号分隔字符串 */
function formatTagsForForm(arr) {
  if (!Array.isArray(arr) || !arr.length) return ''
  return arr.map((t) => (t && typeof t === 'object' ? (t.name ?? t.code ?? '') : String(t))).filter(Boolean).join(', ')
}

function buildPayload(values, options = {}) {
  const { forDraft } = options
  const openedAt = formatDate(values.openedAt)
  const list = values.roomTypesList || []
  const roomTypes = list
    .filter((r) => r?.name?.trim() || r?.price != null)
    .map((r) => `${(r.name || '房型').trim()} ${r.price != null ? r.price + '元/晚' : ''} ${r.breakfast || ''}`.trim())
    .join('；')
  const highlights = [values.traffic, values.promotions].filter(Boolean).join('\n')
  const name = values.name?.trim()
  const nameEn = values.nameEn != null ? String(values.nameEn).trim() : ''
  const city = values.city != null ? String(values.city).trim() : ''
  const { coverImage, carouselImages, roomTypeImages } = options
  // 设施：自由文本，逗号/中文逗号分隔或已是数组；后端存 extra.amenities，详情返回 facilities
  const facilities = parseCommaList(values.facilities)
  // 标签：名称或 code，逗号分隔或数组；后端按 tags 表匹配并写入 hotel_tags
  const tags = parseCommaList(values.tags)
  // 创建/更新时务必带上 nameEn、city、roomTypes（空字符串也传），便于后端持久化并在 GET /hotels/:id 中返回
  const payload = {
    name: forDraft ? (name || '(未命名酒店)') : (name || undefined),
    nameEn: forDraft ? nameEn || undefined : nameEn,
    address: values.address,
    city: forDraft ? (city || undefined) : city,
    cityId: undefined,
    star: values.star,
    openedAt,
    basePrice: values.basePrice,
    roomTypes: forDraft ? (roomTypes || undefined) : (roomTypes || ''),
    highlights: highlights || undefined,
    facilities: forDraft ? (facilities?.length ? facilities : undefined) : (facilities?.length ? facilities : undefined),
    tags: forDraft ? (tags?.length ? tags : undefined) : (tags?.length ? tags : undefined),
  }
  if (!forDraft) {
    // Banner 图只来自当前表单的封面+轮播，且轮播中不重复包含封面，避免后端 hotel_photos 越写越多
    if (coverImage != null && coverImage !== '') payload.coverImage = coverImage
    const carouselDedup = Array.isArray(carouselImages)
      ? carouselImages.filter((u) => u && u !== coverImage)
      : []
    if (carouselDedup.length) payload.carouselImages = carouselDedup
    if (payload.coverImage == null && !carouselDedup.length) payload.images = []
    // 房型图：与房型顺序一致，一次提交即可落库。有房型行就传数组（null=不更新），保证后端能收到
    if (Array.isArray(roomTypeImages) && roomTypeImages.length > 0) {
      payload.roomTypeImages = roomTypeImages.map((u) => u ?? null)
    }
    // 每次提交带时间戳，便于后端将「仅改图」也视为有更新并允许进入待审核；后端可忽略此字段
    payload.submittedAt = new Date().toISOString()
  }
  return payload
}

function HotelEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(!!id)
  const [detail, setDetail] = useState(null)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const leaveActionRef = useRef(null)
  const [previewImage, setPreviewImage] = useState({ open: false, url: '' })

  const isEdit = Boolean(id)

  useEffect(() => {
    if (!id) {
      try {
        const raw = localStorage.getItem(HOTEL_DRAFT_KEY)
        if (raw) {
          const draft = JSON.parse(raw)
          if (draft && typeof draft === 'object') {
            const expireMs = 7 * 24 * 60 * 60 * 1000 // 草稿有效期 7 天
            const updatedAtMs = draft.updatedAt ? Date.parse(draft.updatedAt) : NaN
            const now = Date.now()
            const isExpired = Number.isFinite(updatedAtMs) && now - updatedAtMs > expireMs
            if (isExpired) {
              // 过期草稿自动清理，避免老数据覆盖最新填写
              localStorage.removeItem(HOTEL_DRAFT_KEY)
            } else {
              if (draft.openedAt && typeof draft.openedAt === 'string') {
                draft.openedAt = dayjs(draft.openedAt).isValid() ? dayjs(draft.openedAt) : undefined
              }
              form.setFieldsValue(draft)
            }
          }
        }
      } catch {}
      return
    }
    fetchHotelDetail(id)
      .then((data) => {
        if (!data) return
        setDetail(data)
        const cityVal = (data.cityName != null && String(data.cityName).trim())
          ? String(data.cityName).trim()
          : (data.city != null && typeof data.city === 'object' ? (data.city.name ?? data.city) : (data.city != null ? String(data.city) : ''))
        const coverUrl = data.coverImage ?? (Array.isArray(data.images) && data.images[0] ? data.images[0] : null)
        let carouselUrls = Array.isArray(data.carouselImages) && data.carouselImages.length
          ? data.carouselImages
          : (Array.isArray(data.images) && data.images.length > 1 ? data.images.slice(1) : [])
        carouselUrls = carouselUrls.filter((u) => u && u !== coverUrl)
        const coverFileList = coverUrl
          ? [{ uid: '-cover', url: coverUrl, name: 'cover.jpg', status: 'done' }]
          : []
        const galleryFileList = carouselUrls.map((url, i) => ({
          uid: `gallery-${i}`,
          url,
          name: `gallery-${i}.jpg`,
          status: 'done',
        }))
        // 优先用 data.roomTypes（数组，含 image）回填，这样刷新后房型图能显示；否则再解析 roomTypesSummary
        const roomTypesSource = Array.isArray(data.roomTypes) && data.roomTypes.length ? data.roomTypes : data.roomTypesSummary
        form.setFieldsValue({
          name: data.name ?? '',
          nameEn: data.nameEn ?? '',
          address: data.address ?? '',
          city: cityVal,
          star: data.star ?? data.starLevel ?? 5,
          openedAt: data.openedAt ? dayjs(data.openedAt) : undefined,
          basePrice: data.basePrice,
          roomTypesList: parseRoomTypesFromDetail(roomTypesSource),
          facilities: formatFacilitiesForForm(data.facilities),
          tags: formatTagsForForm(data.tags),
          cover: coverFileList,
          gallery: galleryFileList,
        })
      })
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [id, form])

  // 供布局头部「返回列表」在离开前调用：有未保存修改时弹出确认
  useEffect(() => {
    window.__hotelEditCanLeave = (go) => {
      if (!form.isFieldsTouched()) {
        go()
        return
      }
      leaveActionRef.current = go
      setLeaveConfirmOpen(true)
    }
    return () => {
      if (window.__hotelEditCanLeave) {
        window.__hotelEditCanLeave = undefined
      }
    }
  }, [form])

  /** 从表单项 file 中取可上传的 File（Antd 可能在 originFileObj） */
  const getFile = (item) => item?.originFileObj ?? item

  /** 在页面内预览图片，避免 blob 被浏览器当成链接打开或跳到搜索引擎 */
  const handlePreview = (file) => {
    const url = file.url ?? file.thumbUrl
    if (url) setPreviewImage({ open: true, url })
  }

  const handleFinish = async (values) => {
    setLoading(true)
    let hide = message.loading(isEdit ? '正在提交更新…' : '正在提交审核…', 0)
    try {
      const coverList = Array.isArray(values.cover) ? values.cover : []
      const galleryList = Array.isArray(values.gallery) ? values.gallery : []
      const roomTypesList = Array.isArray(values.roomTypesList) ? values.roomTypesList : []
      const hasAnyImage = coverList.length > 0 || galleryList.length > 0 || roomTypesList.some((r) => Array.isArray(r?.roomImage) && r.roomImage.length > 0)
      if (hasAnyImage) {
        hide()
        hide = message.loading('正在上传图片…', 0)
      }

      let coverImage = undefined
      const carouselImages = []
      if (coverList.length) {
        const first = coverList[0]
        const file = getFile(first)
        if (isHttpUrl(first?.url)) coverImage = first.url
        else if (file instanceof File) coverImage = await uploadImage(file)
      }
      for (let i = 0; i < galleryList.length; i++) {
        const item = galleryList[i]
        const file = getFile(item)
        if (isHttpUrl(item?.url)) carouselImages.push(item.url)
        else if (file instanceof File) carouselImages.push(await uploadImage(file))
      }

      const roomImageUrls = []
      for (let i = 0; i < roomTypesList.length; i++) {
        const list = roomTypesList[i]?.roomImage
        if (!Array.isArray(list) || !list.length) {
          roomImageUrls.push(undefined)
          continue
        }
        const first = list[0]
        const file = getFile(first)
        if (isHttpUrl(first?.url)) roomImageUrls.push(first.url)
        else if (file instanceof File) roomImageUrls.push(await uploadImage(file))
        else roomImageUrls.push(undefined)
      }

      if (hasAnyImage) {
        hide()
        hide = message.loading(isEdit ? '正在提交更新…' : '正在提交审核…', 0)
      }

      const payload = buildPayload(values, { coverImage, carouselImages, roomTypeImages: roomImageUrls })
      if (import.meta.env.DEV) {
        console.log('[HotelEdit] 提交请求体 nameEn/city/roomTypes/coverImage/carouselImages/roomTypeImages:', {
          nameEn: payload.nameEn,
          city: payload.city,
          roomTypes: payload.roomTypes,
          coverImage: payload.coverImage,
          carouselImages: payload.carouselImages,
          roomTypeImages: payload.roomTypeImages,
        })
      }
      if (isEdit) {
        await updateHotel(id, payload)
        await setHotelStatus(id, { status: 'pending' })
        hide()
        message.success('已提交更新并重新进入审核流程；管理员审核后状态会更新。')
        const data = await fetchHotelDetail(id)
        if (data) {
          // 若 PUT 的 roomTypeImages 未落库（如后端暂无 rooms），用 PATCH 按房型再传一次，保证房型图能显示
          const apiRooms = Array.isArray(data.roomTypes) ? data.roomTypes : []
          if (apiRooms.length && roomImageUrls.some(Boolean)) {
            for (let i = 0; i < apiRooms.length && i < roomImageUrls.length; i++) {
              const roomId = apiRooms[i]?.id
              const url = roomImageUrls[i]
              if (roomId != null && url) await updateRoomImages(id, roomId, { imageUrls: [url] })
            }
            // PATCH 后重新拉详情，保证回填和刷新后能看到房型图
            const refetched = await fetchHotelDetail(id)
            if (refetched) Object.assign(data, refetched)
          }
          setDetail(data)
          const cityVal = (data.cityName != null && String(data.cityName).trim())
            ? String(data.cityName).trim()
            : (data.city != null && typeof data.city === 'object' ? (data.city.name ?? data.city) : (data.city != null ? String(data.city) : ''))
          const roomTypesSource = Array.isArray(data.roomTypes) && data.roomTypes.length ? data.roomTypes : data.roomTypesSummary
          const parsedRoomTypes = parseRoomTypesFromDetail(roomTypesSource)
          const hasRoomTypesFromApi =
            parsedRoomTypes.length > 0 &&
            parsedRoomTypes.some((r) => (r.name && r.name.trim()) || r.price != null)
          const coverUrl = data.coverImage ?? (Array.isArray(data.images) && data.images[0] ? data.images[0] : null)
          let carouselUrls = Array.isArray(data.carouselImages) && data.carouselImages.length
            ? data.carouselImages
            : (Array.isArray(data.images) && data.images.length > 1 ? data.images.slice(1) : [])
          carouselUrls = carouselUrls.filter((u) => u && u !== coverUrl)
          const coverFileList = coverUrl
            ? [{ uid: '-cover', url: coverUrl, name: 'cover.jpg', status: 'done' }]
            : (coverImage ? [{ uid: '-cover', url: coverImage, name: 'cover.jpg', status: 'done' }] : [])
          const galleryFileList = carouselUrls.length
            ? carouselUrls.map((url, i) => ({ uid: `gallery-${i}`, url, name: `gallery-${i}.jpg`, status: 'done' }))
            : (carouselImages?.length ? carouselImages.map((url, i) => ({ uid: `gallery-${i}`, url, name: `gallery-${i}.jpg`, status: 'done' })) : [])
          // 回填时优先用本次上传的房型图 URL；无则用详情里的 roomTypes[].image，保证刷新后也能看见
          const mergedRoomTypes = (hasRoomTypesFromApi ? parsedRoomTypes : values.roomTypesList?.length ? values.roomTypesList : parsedRoomTypes).map((r, i) => ({
            ...r,
            roomImage: roomImageUrls[i]
              ? [{ uid: `room-${i}`, url: roomImageUrls[i], name: 'room.jpg', status: 'done' }]
              : (r.roomImage && r.roomImage.length ? r.roomImage : []),
          }))
          form.setFieldsValue({
            name: data.name ?? values.name ?? '',
            nameEn: (data.nameEn != null && data.nameEn !== '') ? data.nameEn : (values.nameEn ?? ''),
            address: data.address ?? values.address ?? '',
            city: (cityVal && cityVal.trim()) ? cityVal : (values.city ?? ''),
            star: data.star ?? data.starLevel ?? values.star ?? 5,
            openedAt: data.openedAt ? dayjs(data.openedAt) : (values.openedAt ?? undefined),
            basePrice: data.basePrice ?? values.basePrice,
            roomTypesList: mergedRoomTypes,
            facilities: formatFacilitiesForForm(data.facilities),
            tags: formatTagsForForm(data.tags),
            cover: coverFileList,
            gallery: galleryFileList,
          })
        }
      } else {
        const createResult = await createHotel(payload)
        hide()
        clearDraft()
        message.success('提交成功，请到「我的酒店」查看审核状态。')
        navigate('/merchant/hotels', { replace: true })
      }
    } catch (e) {
      hide()
      if (!e?.response) message.error('提交失败，请检查网络后重试')
      // 有 response 时错误已由 request 拦截器提示
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDraft = () => {
    const values = form.getFieldsValue(true)
    const toSave = { ...values, updatedAt: new Date().toISOString() }
    if (toSave.openedAt && typeof toSave.openedAt?.format === 'function') {
      toSave.openedAt = toSave.openedAt.format('YYYY-MM-DD')
    }
    try {
      localStorage.setItem(HOTEL_DRAFT_KEY, JSON.stringify(toSave))
      message.success('草稿已保存到本地，下次进入新建酒店时可恢复。不会提交审核。')
    } catch (e) {
      message.error('草稿保存失败')
    }
  }

  const clearDraft = () => {
    try {
      localStorage.removeItem(HOTEL_DRAFT_KEY)
    } catch {}
  }

  const handleClearDraftClick = () => {
    clearDraft()
    form.resetFields()
    message.success('本地草稿已清空。')
  }

  const statusTag =
    detail?.status === REVIEW_STATUS.APPROVED
      ? { color: 'green', text: '已通过' }
      : detail?.status === REVIEW_STATUS.REJECTED
        ? { color: 'red', text: '未通过' }
        : detail?.status === REVIEW_STATUS.OFFLINE
          ? { color: 'default', text: '已下线' }
          : detail?.status === REVIEW_STATUS.PENDING
            ? { color: 'processing', text: '待审核' }
            : null

  return (
    <div className="page-hotel-edit" style={{ padding: 24 }}>
      <Card>
        <Title level={3} style={{ marginBottom: 8 }}>
          {isEdit ? '酒店详情 / 编辑' : '酒店信息录入'}
        </Title>
        {isEdit && statusTag && (
          <Paragraph style={{ marginBottom: 16 }}>
            审核状态：<Tag color={statusTag.color}>{statusTag.text}</Tag>
          </Paragraph>
        )}
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          {isEdit
            ? '可在此修改信息并重新提交；管理员审核通过后酒店将上线并在移动端展示。'
            : '请填写酒店基础信息、房型与价格等。提交后为待审核状态，管理员审核通过后酒店将上线并在移动端展示。'}
        </Paragraph>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{
            star: 5,
            roomTypesList: [{ name: '', price: undefined, capacity: 2, breakfast: undefined, roomImage: [] }],
          }}
        >
          {/* 一、基础信息 */}
          <Title level={4} style={{ marginTop: 16 }}>
            一、基础信息
          </Title>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="酒店名称（中文）" name="name" rules={[{ required: true, message: '请输入酒店中文名称' }]}>
                <Input placeholder="如：上海陆家嘴禧酒店" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="酒店名称（英文）" name="nameEn">
                <Input placeholder="可选，Hotel Name (EN)" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="所在城市"
                name="city"
                rules={[{ required: true, message: '请输入城市' }]}
                extra="若提交后显示为其他城市（如北京），可能是该城市名未在系统城市列表中，后端会使用默认城市；可联系管理员在系统中添加该城市。"
              >
                <Input placeholder="请输入城市名称，如：上海、北京、汝城" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item label="详细地址" name="address" rules={[{ required: true, message: '请输入酒店地址' }]}>
                <Input placeholder="请输入详细地址" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="酒店星级" name="star" rules={[{ required: true, message: '请选择星级' }]}>
                <Select placeholder="请选择星级">
                  <Option value={3}>三星</Option>
                  <Option value={4}>四星</Option>
                  <Option value={5}>五星</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="开业时间" name="openedAt">
                <DatePicker style={{ width: '100%' }} placeholder="请选择开业日期" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="基础参考价（起）" name="basePrice" rules={[{ required: true, message: '请输入基础参考价' }]}>
                <Space.Compact style={{ width: '100%' }}>
                  <InputNumber min={0} style={{ width: '100%' }} />
                  <span style={{ padding: '0 11px', background: '#fafafa', border: '1px solid #d9d9d9', borderLeft: 0, borderRadius: '0 6px 6px 0', lineHeight: '32px' }}>
                    元/晚
                  </span>
                </Space.Compact>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* 二、图片与媒体 */}
          <Title level={4} style={{ marginTop: 16 }}>
            二、图片与媒体
          </Title>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={
                  <Space>
                    <Text>酒店封面图</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      （用于首页 Banner / 列表缩略图）
                    </Text>
                  </Space>
                }
                name="cover"
                valuePropName="fileList"
                getValueFromEvent={(e) => normalizeFileListWithPreview(e?.fileList)}
              >
                <Upload
                  listType="picture-card"
                  accept="image/*"
                  maxCount={1}
                  beforeUpload={() => false}
                  showUploadList={{ showPreviewIcon: true }}
                  onPreview={handlePreview}
                >
                  <div><UploadOutlined /><br />上传封面</div>
                </Upload>
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                label={
                  <Space>
                    <Text>酒店图片轮播</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      （用于酒店详情页大图 Banner）
                    </Text>
                  </Space>
                }
                name="gallery"
                valuePropName="fileList"
                getValueFromEvent={(e) => normalizeFileListWithPreview(e?.fileList)}
              >
                <Upload
                  listType="picture-card"
                  accept="image/*"
                  multiple
                  beforeUpload={() => false}
                  showUploadList={{ showPreviewIcon: true }}
                  onPreview={handlePreview}
                >
                  <div><UploadOutlined /><br />上传轮播图</div>
                </Upload>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* 三、房型与价格（可增删） */}
          <Title level={4} style={{ marginTop: 16 }}>
            三、房型与价格
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 12 }}>
            至少填写一种房型（房型名称为必填），可点击「添加房型」增加多行。
          </Paragraph>

          <Form.List name="roomTypesList">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card
                    type="inner"
                    size="small"
                    key={key}
                    style={{ marginBottom: 12 }}
                    title={`房型 ${name + 1}`}
                    extra={
                      fields.length > 1 ? (
                        <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => remove(name)}>
                          删除
                        </Button>
                      ) : null
                    }
                  >
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item {...restField} name={[name, 'name']} label="房型名称" rules={[{ required: true, message: '请输入房型名称' }]}>
                          <Input placeholder="如：豪华大床房、高级双床房" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item {...restField} name={[name, 'price']} label="价格（元/晚）">
                          <InputNumber min={0} style={{ width: '100%' }} placeholder="如 399" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item {...restField} name={[name, 'capacity']} label="可住人数">
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item {...restField} name={[name, 'breakfast']} label="早餐">
                          <Select placeholder="请选择" allowClear>
                            <Option value="含早">含早</Option>
                            <Option value="不含早">不含早</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item {...restField} name={[name, 'roomImage']} label="房型图" valuePropName="fileList" getValueFromEvent={(e) => normalizeFileListWithPreview(e?.fileList)}>
                          <Upload
                            listType="picture-card"
                            accept="image/*"
                            maxCount={1}
                            beforeUpload={() => false}
                            showUploadList={{ showPreviewIcon: true }}
                            onPreview={handlePreview}
                          >
                            <div><UploadOutlined /><br />上传房型图</div>
                          </Upload>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ name: '', price: undefined, capacity: 2, breakfast: undefined, roomImage: [] })} block icon={<PlusOutlined />}>
                    添加房型
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Divider />

          {/* 四、周边信息与标签 */}
          <Title level={4} style={{ marginTop: 16 }}>
            四、周边信息与标签
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 12 }}>
            设施与标签是两套数据：设施为自由填写，标签需与系统已有标签名称或 code 一致（如豪华型、健身房、含早餐），多个用逗号分隔。
          </Paragraph>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="酒店设施"
                name="facilities"
                tooltip="自由文本，存为设施列表；详情中显示为 facilities"
              >
                <TextArea
                  rows={2}
                  placeholder="多个用逗号分隔，如：免费WiFi, 停车场, 健身房"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="酒店标签"
                name="tags"
                tooltip="填标签名称或 code，与系统 tags 表匹配；如豪华型、经济型、健身房、游泳池、含早餐"
              >
                <Input placeholder="多个用逗号分隔，如：豪华型, 健身房, 含早餐" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="附近热门景点"
                name="hotspots"
                tooltip="用于 C 端展示酒店附近的出行亮点，可自由编辑"
              >
                <TextArea rows={3} placeholder="请输入周边景点，多个可用逗号或换行分隔，如：外滩、东方明珠、迪士尼" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="交通信息" name="traffic">
            <TextArea rows={3} placeholder="地铁站 / 机场 / 高铁站距离与交通方式说明" />
          </Form.Item>

          <Divider />

          {/* 五、优惠信息（可选） */}
          <Title level={4} style={{ marginTop: 16 }}>
            五、优惠信息（可选）
          </Title>
          <Form.Item label="优惠说明" name="promotions">
            <TextArea rows={3} placeholder="如：节假日 8 折、连住 3 晚减 200、机酒套餐减 300 等" />
          </Form.Item>

          {/* 操作区 */}
          <Form.Item style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              {!isEdit && (
                <>
                  <Button onClick={handleClearDraftClick}>清空草稿</Button>
                  <Button onClick={handleSaveDraft}>保存草稿</Button>
                </>
              )}
              <Button type="primary" htmlType="submit" loading={loading}>
                {isEdit ? '更新并重新提交审核' : '提交审核'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Modal
        open={leaveConfirmOpen}
        title={isEdit ? '离开酒店编辑页' : '离开新建酒店页'}
        onCancel={() => setLeaveConfirmOpen(false)}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setLeaveConfirmOpen(false)}>取消</Button>
            <Button
              onClick={() => {
                const go = leaveActionRef.current
                setLeaveConfirmOpen(false)
                if (typeof go === 'function') go()
              }}
            >
              直接离开
            </Button>
            {!isEdit && (
              <Button
                type="primary"
                onClick={async () => {
                  try {
                    const values = form.getFieldsValue(true)
                    const toSave = { ...values, updatedAt: new Date().toISOString() }
                    if (toSave.openedAt && typeof toSave.openedAt?.format === 'function') {
                      toSave.openedAt = toSave.openedAt.format('YYYY-MM-DD')
                    }
                    localStorage.setItem(HOTEL_DRAFT_KEY, JSON.stringify(toSave))
                    message.success('草稿已保存，将返回列表页')
                  } catch (e) {
                    message.error('草稿保存失败，已直接返回列表页')
                  }
                  const go = leaveActionRef.current
                  setLeaveConfirmOpen(false)
                  if (typeof go === 'function') go()
                }}
              >
                保存草稿并离开
              </Button>
            )}
          </Space>
        }
      >
        <Paragraph>
          当前表单存在尚未提交审核的修改。你可以选择直接离开，或者先将当前内容保存为本地草稿，以便下次继续编辑。
        </Paragraph>
      </Modal>

      <Modal
        open={previewImage.open}
        title="图片预览"
        footer={null}
        onCancel={() => setPreviewImage({ open: false, url: '' })}
        width="auto"
        styles={{ body: { textAlign: 'center' } }}
      >
        {previewImage.url && (
          <img src={previewImage.url} alt="预览" style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto' }} />
        )}
      </Modal>
    </div>
  )
}

export default HotelEdit

