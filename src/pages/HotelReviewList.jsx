import { Badge, Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchHotelReviewList, approveHotel, rejectHotel, setHotelStatus } from '../services/hotel.js'
import { REVIEW_STATUS } from '../constants/index.js'
import { PAGE_SIZE } from '../constants/index.js'

const { Title, Text } = Typography
const { Option } = Select

function statusTag(status) {
  switch (status) {
    case REVIEW_STATUS.APPROVED:
      return <Tag color="green">通过</Tag>
    case REVIEW_STATUS.REJECTED:
      return <Tag color="red">不通过</Tag>
    case REVIEW_STATUS.OFFLINE:
      return <Tag color="default">已下线</Tag>
    default:
      return (
        <Tag color="processing">
          <Badge status="processing" /> 审核中
        </Tag>
      )
  }
}

function HotelReviewList() {
  const [form] = Form.useForm()
  const [list, setList] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: PAGE_SIZE })
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState({ open: false, hotelId: null, hotelName: '' })
  const [rejectReason, setRejectReason] = useState('')

  const [statusFilter, setStatusFilter] = useState(undefined)
  const [keyword, setKeyword] = useState('')

  const onFilterChange = (_, allValues) => {
    setStatusFilter(allValues.status === 'all' ? undefined : allValues.status)
    setKeyword((allValues.keyword || '').trim())
  }

  const fetchList = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const { list: data, meta: m } = await fetchHotelReviewList({
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter,
      })
      setList(Array.isArray(data) ? data : [])
      setMeta(m || { total: 0, page: 1, pageSize: PAGE_SIZE })
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchList(1)
  }, [fetchList])

  const filteredData = useMemo(() => {
    if (!keyword) return list
    const kw = keyword.toLowerCase()
    return list.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(kw)) ||
        (item.address && item.address.toLowerCase().includes(kw)),
    )
  }, [list, keyword])

  const handleApprove = (record) => {
    Modal.confirm({
      title: `确认通过「${record.name}」的审核？`,
      onOk: async () => {
        try {
          await approveHotel(record.id, {})
          message.success('已通过审核')
          fetchList(meta.page)
        } catch {
          // 错误已由 request 拦截器提示
        }
      },
    })
  }

  const handleReject = (record) => {
    setRejectModal({ open: true, hotelId: record.id, hotelName: record.name })
    setRejectReason(record.rejectReason || '')
  }

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      message.warning('请填写不通过原因')
      return
    }
    try {
      await rejectHotel(rejectModal.hotelId, { reason: rejectReason.trim() })
      message.success('已标记为不通过')
      setRejectModal({ open: false, hotelId: null, hotelName: '' })
      setRejectReason('')
      fetchList(meta.page)
    } catch {
      // 错误已由 request 拦截器提示
    }
  }

  const handleOfflineToggle = (record) => {
    const isOffline = record.status === REVIEW_STATUS.OFFLINE
    Modal.confirm({
      title: isOffline ? `确认恢复「${record.name}」上线？` : `确认将「${record.name}」下线？`,
      onOk: async () => {
        try {
          await setHotelStatus(record.id, { status: isOffline ? 'online' : 'offline' })
          message.success(isOffline ? '已恢复上线' : '已下线酒店')
          fetchList(meta.page)
        } catch {
          // 错误已由 request 拦截器提示
        }
      },
    })
  }

  const columns = [
    {
      title: '酒店名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
      render: (c) => (c && typeof c === 'object' ? c.name : c) || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (value) => statusTag(value),
    },
    {
      title: '开业日期',
      dataIndex: 'openedAt',
      key: 'openedAt',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            disabled={record.status === REVIEW_STATUS.APPROVED}
            onClick={() => handleApprove(record)}
          >
            通过
          </Button>
          <Button
            type="link"
            size="small"
            danger
            disabled={record.status === REVIEW_STATUS.REJECTED}
            onClick={() => handleReject(record)}
          >
            不通过
          </Button>
          <Button
            type="link"
            size="small"
            disabled={record.status === REVIEW_STATUS.REJECTED}
            onClick={() => handleOfflineToggle(record)}
          >
            {record.status === REVIEW_STATUS.OFFLINE ? '恢复上线' : '下线'}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="page-hotel-review">
      <Card>
        <Title level={3} style={{ marginBottom: 8 }}>
          酒店信息审核 / 发布 / 下线
        </Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          可以按状态筛选待审核酒店，查看商户提交的酒店信息，并进行通过 / 不通过 / 下线等操作。
        </Text>

        <Form
          form={form}
          layout="inline"
          initialValues={{ status: 'all', keyword: '' }}
          onValuesChange={onFilterChange}
          style={{ marginBottom: 16 }}
        >
          <Form.Item label="关键字" name="keyword">
            <Input placeholder="按酒店名 / 地址搜索" allowClear />
          </Form.Item>
          <Form.Item label="审核状态" name="status">
            <Select style={{ width: 160 }}>
              <Option value="all">全部</Option>
              <Option value={REVIEW_STATUS.PENDING}>审核中</Option>
              <Option value={REVIEW_STATUS.APPROVED}>通过</Option>
              <Option value={REVIEW_STATUS.REJECTED}>不通过</Option>
              <Option value={REVIEW_STATUS.OFFLINE}>已下线</Option>
            </Select>
          </Form.Item>
        </Form>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          pagination={{
            current: meta.page,
            pageSize: meta.pageSize,
            total: meta.total,
            showSizeChanger: false,
            onChange: (page) => fetchList(page),
          }}
        />
      </Card>

      <Modal
        title="填写不通过原因"
        open={rejectModal.open}
        onOk={submitReject}
        onCancel={() => {
          setRejectModal({ open: false, hotelId: null, hotelName: '' })
          setRejectReason('')
        }}
      >
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="请说明不通过原因，方便商户修改后再次提交"
        />
      </Modal>
    </div>
  )
}

export default HotelReviewList
