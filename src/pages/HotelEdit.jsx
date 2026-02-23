import { Button, Card, Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select, Space, Tag, Typography, Upload, message } from 'antd'
import { REVIEW_STATUS } from '../constants/index.js'
import { MinusCircleOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createHotel, updateHotel, fetchHotelDetail, setHotelStatus } from '../services/hotel.js'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input
const { Option } = Select

const HOTEL_DRAFT_KEY = 'pc_hotel_draft'

/** 把后端返回的房型字符串解析为 roomTypesList（与 buildPayload 序列化格式一致） */
function parseRoomTypesFromDetail(roomTypes) {
  if (Array.isArray(roomTypes) && roomTypes.length) {
    return roomTypes.map((r) => ({
      name: r.name ?? '',
      price: r.price,
      capacity: r.capacity ?? 2,
      breakfast: r.breakfast,
    }))
  }
  if (typeof roomTypes !== 'string' || !roomTypes.trim()) {
    return [{ name: '', price: undefined, capacity: 2, breakfast: undefined }]
  }
  const parts = roomTypes.split(/[；;]/).map((s) => s.trim()).filter(Boolean)
  if (!parts.length) return [{ name: '', price: undefined, capacity: 2, breakfast: undefined }]
  return parts.map((part) => {
    const priceMatch = part.match(/(\d+)\s*元\/晚/)
    const price = priceMatch ? Number(priceMatch[1]) : undefined
    const name = priceMatch ? part.slice(0, priceMatch.index).trim() || part : part
    const hasBreakfast = /含早/.test(part)
    const noBreakfast = /不含早/.test(part)
    const breakfast = hasBreakfast ? '含早' : noBreakfast ? '不含早' : undefined
    return { name: name || '', price, capacity: 2, breakfast }
  })
}

function formatDate(v) {
  if (!v) return undefined
  if (typeof v.format === 'function') return v.format('YYYY-MM-DD')
  const d = new Date(v)
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10)
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
  // 创建/更新时务必带上 nameEn、city、roomTypes（空字符串也传），便于后端持久化并在 GET /hotels/:id 中返回
  return {
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
    images: [],
  }
}

function HotelEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(!!id)
  const [detail, setDetail] = useState(null)

  const isEdit = Boolean(id)

  useEffect(() => {
    if (!id) {
      try {
        const raw = localStorage.getItem(HOTEL_DRAFT_KEY)
        if (raw) {
          const draft = JSON.parse(raw)
          if (draft && typeof draft === 'object') {
            if (draft.openedAt && typeof draft.openedAt === 'string') {
              draft.openedAt = dayjs(draft.openedAt).isValid() ? dayjs(draft.openedAt) : undefined
            }
            form.setFieldsValue(draft)
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
        form.setFieldsValue({
          name: data.name ?? '',
          nameEn: data.nameEn ?? '',
          address: data.address ?? '',
          city: cityVal,
          star: data.star ?? data.starLevel ?? 5,
          openedAt: data.openedAt ? dayjs(data.openedAt) : undefined,
          basePrice: data.basePrice,
          roomTypesList: parseRoomTypesFromDetail(data.roomTypesSummary ?? data.roomTypes),
        })
      })
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [id, form])

  const handleFinish = async (values) => {
    setLoading(true)
    const hide = message.loading(isEdit ? '正在提交更新…' : '正在提交审核…', 0)
    try {
      const payload = buildPayload(values)
      if (import.meta.env.DEV) {
        console.log('[HotelEdit] 提交请求体 nameEn/city/roomTypes:', {
          nameEn: payload.nameEn,
          city: payload.city,
          roomTypes: payload.roomTypes,
        })
      }
      if (isEdit) {
        await updateHotel(id, payload)
        await setHotelStatus(id, { status: 'pending' })
        hide()
        message.success('已提交更新并重新进入审核流程；管理员审核后状态会更新。')
        const data = await fetchHotelDetail(id)
        if (data) {
          setDetail(data)
          const cityVal = (data.cityName != null && String(data.cityName).trim())
            ? String(data.cityName).trim()
            : (data.city != null && typeof data.city === 'object' ? (data.city.name ?? data.city) : (data.city != null ? String(data.city) : ''))
          const parsedRoomTypes = parseRoomTypesFromDetail(data.roomTypesSummary ?? data.roomTypes)
          const hasRoomTypesFromApi =
            parsedRoomTypes.length > 0 &&
            parsedRoomTypes.some((r) => (r.name && r.name.trim()) || r.price != null)
          form.setFieldsValue({
            name: data.name ?? values.name ?? '',
            nameEn: (data.nameEn != null && data.nameEn !== '') ? data.nameEn : (values.nameEn ?? ''),
            address: data.address ?? values.address ?? '',
            city: (cityVal && cityVal.trim()) ? cityVal : (values.city ?? ''),
            star: data.star ?? data.starLevel ?? values.star ?? 5,
            openedAt: data.openedAt ? dayjs(data.openedAt) : (values.openedAt ?? undefined),
            basePrice: data.basePrice ?? values.basePrice,
            roomTypesList: hasRoomTypesFromApi ? parsedRoomTypes : (values.roomTypesList?.length ? values.roomTypesList : parsedRoomTypes),
          })
        }
      } else {
        await createHotel(payload)
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
    const toSave = { ...values }
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
            roomTypesList: [{ name: '', price: undefined, capacity: 2, breakfast: undefined }],
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
                <InputNumber min={0} style={{ width: '100%' }} addonAfter="元/晚" />
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
                getValueFromEvent={(e) => e?.fileList}
              >
                <Upload.Dragger name="files" multiple={false} beforeUpload={() => false}>
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽图片到此处上传</p>
                  <p className="ant-upload-hint">建议比例接近题目示例，支持 jpg/png</p>
                </Upload.Dragger>
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
                getValueFromEvent={(e) => e?.fileList}
              >
                <Upload.Dragger name="files" multiple beforeUpload={() => false}>
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽多张图片上传</p>
                  <p className="ant-upload-hint">可上传多张，前端将按照顺序展示轮播图</p>
                </Upload.Dragger>
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
                    </Row>
                  </Card>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ name: '', price: undefined, capacity: 2, breakfast: undefined })} block icon={<PlusOutlined />}>
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
            <Col span={12}>
              <Form.Item label="酒店标签" name="tags">
                <Select
                  mode="multiple"
                  placeholder="请选择酒店标签"
                  tagRender={(props) => <Tag color="gold">{props.label}</Tag>}
                >
                  <Option value="family">亲子友好</Option>
                  <Option value="parking">免费停车场</Option>
                  <Option value="business">商务出行</Option>
                  <Option value="luxury">豪华型</Option>
                </Select>
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
              <Button onClick={handleSaveDraft}>保存草稿</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {isEdit ? '更新并重新提交审核' : '提交审核'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default HotelEdit

