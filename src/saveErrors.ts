export function isZoweDataSetUnsafeUploadError(scheme: string, message: string): boolean {
  if (scheme !== 'zowe-ds') {
    return false;
  }

  const lower = message.toLowerCase();
  return lower.includes('zowe explorer: unsafe upload')
    || lower.includes('unsafe upload')
    || lower.includes('may result in data loss')
    || message.includes('資料遺失')
    || message.includes('数据丢失')
    || message.includes('データ損失')
    || message.includes('데이터 손실')
    || message.includes('Datenverlust');
}
