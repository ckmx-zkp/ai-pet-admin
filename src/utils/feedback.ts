export function requestErrorMessage(error: unknown, fallback: string): string {
  const response = (error as { response?: { status?: number; data?: { detail?: unknown } } })?.response
  if (!response) return '网络失败，请检查连接后重试'

  const detail = formatDetail(response.data?.detail)
  if (response.status === 403) return detail || '无权限执行此操作'
  if (response.status === 404) return detail || '未找到对应资源'
  if (response.status === 409) return detail || '当前状态不允许此操作'
  if (response.status === 422) return detail || '提交内容校验失败'
  return detail || fallback
}

export function formatDateTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '暂无记录'
}

function formatDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === 'string' ? item : typeof item === 'object' && item && 'msg' in item ? String((item as { msg: unknown }).msg) : ''))
      .filter(Boolean)
      .join('；')
  }
  return ''
}
