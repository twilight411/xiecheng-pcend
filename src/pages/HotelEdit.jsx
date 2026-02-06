import { Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Typography } from 'antd'

const { Title } = Typography
const { TextArea } = Input

function HotelEdit() {
  const [form] = Form.useForm()

  const handleFinish = (values) => {
    // TODO: 接入 createHotel / updateHotel 接口
    // console.log('Hotel form submit:', values)
  }

  return (
    <div className="page-hotel-edit" style={{ padding: 24 }}>
      <Card>
        <Title level={3} style={{ marginBottom: 24 }}>
          酒店信息录入 / 编辑（占位）
        </Title>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
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
            <Col span={16}>
              <Form.Item label="酒店地址" name="address" rules={[{ required: true, message: '请输入酒店地址' }]}>
                <Input placeholder="请输入详细地址" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="开业时间" name="openedAt">
                <DatePicker style={{ width: '100%' }} placeholder="请选择开业日期" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="酒店星级" name="star" rules={[{ required: true, message: '请选择星级' }]}>
                <Select placeholder="请选择星级">
                  <Select.Option value={3}>三星</Select.Option>
                  <Select.Option value={4}>四星</Select.Option>
                  <Select.Option value={5}>五星</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="基础房价（起）" name="basePrice" rules={[{ required: true, message: '请输入基础房价' }]}>
                <InputNumber min={0} style={{ width: '100%' }} addonAfter="元/晚" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="房型说明" name="roomTypes">
                <Input placeholder="如大床房/双床房/亲子房等" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="周边及亮点（可选）" name="highlights">
            <TextArea rows={3} placeholder="周边景点、商圈、交通、优惠信息等" />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right' }}>
            <Button style={{ marginRight: 8 }}>保存草稿（占位）</Button>
            <Button type="primary" htmlType="submit">
              提交审核（占位）
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default HotelEdit

