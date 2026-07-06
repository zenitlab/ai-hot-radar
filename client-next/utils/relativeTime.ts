/**
 * 将时间转为相对时间表述，如"2小时前"、"3天前"
 */
export function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < 0) return '刚刚';
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  if (months < 12) return `${months} 个月前`;
  return `${years} 年前`;
}

/**
 * 格式化为本地日期时间字符串，用于 tooltip
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
