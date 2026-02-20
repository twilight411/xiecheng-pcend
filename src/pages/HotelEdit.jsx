import { Button, Card, Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select, Space, Tag, Typography, Upload, message } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createHotel, updateHotel, fetchHotelDetail } from '../services/hotel.js'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input
const { Option } = Select

function formatDate(v) {
  if (!v) return undefined
  if (typeof v.format === 'function') return v.format('YYYY-MM-DD')
  const d = new Date(v)
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10)
}

function buildPayload(values) {
  const openedAt = formatDate(values.openedAt)
  const roomTypes = [
    values.roomTypeA?.price != null && `豪华大床房 ${values.roomTypeA.price}元/晚 ${values.roomTypeA.breakfast || ''}`,
    values.roomTypeB?.price != null && `高级双床房 ${values.roomTypeB.price}元/晚 ${values.roomTypeB.breakfast || ''}`,
  ]
    .filter(Boolean)
    .join('；')
  const highlights = [values.traffic, values.promotions].filter(Boolean).join('\n')
  return {
    name: values.name,
    nameEn: values.nameEn || undefined,
    address: values.address,
    cityId: values.city === 'shanghai' ? 310100 : values.city === 'beijing' ? 110100 : values.city === 'guangzhou' ? 440100 : undefined,
    star: values.star,
    openedAt,
    basePrice: values.basePrice,
    roomTypes: roomTypes || undefined,
    highlights: highlights || undefined,
    images: [], // 暂无上传接口时传空，后端可生成默认图
  }
}

function HotelEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(!!id)

  const isEdit = Boolean(id)

  useEffect(() => {
    if (!id) return
    fetchHotelDetail(id)
      .then((data) => {
        form.setFieldsValue({
          name: data.name,
          nameEn: data.nameEn,
          address: data.address,
          city: 'shanghai',
          star: data.star ?? data.starLevel ?? 5,
          openedAt: data.openedAt ? dayjs(data.openedAt) : undefined,
          basePrice: data.basePrice,
          roomTypeA: data.roomTypes?.[0]
            ? { price: data.roomTypes[0].price, capacity: 2, breakfast: data.roomTypes[0].breakfast }
            : undefined,
          roomTypeB: data.roomTypes?.[1]
            ? { price: data.roomTypes[1].price, capacity: 2, breakfast: data.roomTypes[1].breakfast }
            : undefined,
        })
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }, [id, form])

  const handleFinish = async (values) => {
    setLoading(true)
    try {
      const payload = buildPayload(values)
      if (isEdit) {
        await updateHotel(id, payload)
        message.success('更新成功，将重新进入审核流程')
      } else {
        const res = await createHotel(payload)
        message.success('提交成功，等待管理员审核')
        const newId = res?.id
        if (newId) navigate(`/merchant/hotels/${newId}`, { replace: true })
        else navigate('/merchant/hotels')
      }
    } catch {
      // 错误已由 request 拦截器提示
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDraft = () => {
    message.info('草稿功能可后续对接后端保存接口')
  }

  return (
    <div className="page-hotel-edit" style={{ padding: 24 }}>
      <Card>
        <Title level={3} style={{ marginBottom: 8 }}>
          酒店信息录入 / 编辑
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          请按照实际情况填写酒店基础信息、上传图片、配置房型及价格，提交后将进入管理员审核。
        </Paragraph>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{
            star: 5,
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
              <Form.Item label="所在城市" name="city" rules={[{ required: true, message: '请选择城市' }]}>
                <Select placeholder="请选择城市">
                  <Option value="shanghai">上海</Option>
                  <Option value="beijing">北京</Option>
                  <Option value="guangzhou">广州</Option>
                </Select>
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

          {/* 三、房型与价格（简化版结构化录入） */}
          <Title level={4} style={{ marginTop: 16 }}>
            三、房型与价格（示例）
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 12 }}>
            这里先用两种典型房型占位，后续可扩展为可增删列表；数据会用于 C 端酒店详情页房型价格列表。
          </Paragraph>

          <Row gutter={16}>
            <Col span={12}>
              <Card type="inner" size="small" title="房型 A：豪华大床房" style={{ marginBottom: 12 }}>
                <Form.Item label="价格" name={['roomTypeA', 'price']}>
                  <InputNumber min={0} style={{ width: '100%' }} addonAfter="元/晚" placeholder="如 888" />
                </Form.Item>
                <Form.Item label="可住人数" name={['roomTypeA', 'capacity']}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label="早餐" name={['roomTypeA', 'breakfast']}>
                  <Select placeholder="请选择">
                    <Option value="含早">含早</Option>
                    <Option value="不含早">不含早</Option>
                  </Select>
                </Form.Item>
              </Card>
            </Col>
            <Col span={12}>
              <Card type="inner" size="small" title="房型 B：高级双床房" style={{ marginBottom: 12 }}>
                <Form.Item label="价格" name={['roomTypeB', 'price']}>
                  <InputNumber min={0} style={{ width: '100%' }} addonAfter="元/晚" placeholder="如 788" />
                </Form.Item>
                <Form.Item label="可住人数" name={['roomTypeB', 'capacity']}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label="早餐" name={['roomTypeB', 'breakfast']}>
                  <Select placeholder="请选择">
                    <Option value="含早">含早</Option>
                    <Option value="不含早">不含早</Option>
                  </Select>
                </Form.Item>
              </Card>
            </Col>
          </Row>

          <Divider />

          {/* 四、周边信息与标签 */}
          <Title level={4} style={{ marginTop: 16 }}>
            四、周边信息与标签
          </Title>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="附近热门景点（可多选）"
                name="hotspots"
                tooltip="用于 C 端展示酒店附近的出行亮点"
              >
                <Select mode="tags" placeholder="输入或选择景点，如：外滩、东方明珠">
                  <Option value="bund">外滩</Option>
                  <Option value="lz">陆家嘴</Option>
                  <Option value="dp">迪士尼</Option>
                </Select>
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
              <Button onClick={handleSaveDraft}>保存草稿（占位）</Button>
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

