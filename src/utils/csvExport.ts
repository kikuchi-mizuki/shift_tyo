/**
 * csvExport.ts
 * CSV出力ユーティリティ関数
 */

import { extractStoreName, getTimeDisplay } from './storeUtils';

/**
 * データをCSV形式に変換してダウンロード
 */
export const downloadCSV = (data: string, filename: string) => {
  // BOM付きUTF-8（Excelで文字化けしないように）
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 配列をCSV文字列に変換
 */
export const arrayToCSV = (headers: string[], rows: (string | number)[][]): string => {
  const escapeCsvValue = (value: string | number): string => {
    const str = String(value ?? '');
    // ダブルクォート、カンマ、改行が含まれる場合はエスケープ
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map(row => row.map(escapeCsvValue).join(','))
  ];

  return csvRows.join('\n');
};

/**
 * マッチング一覧のCSV出力
 */
export const exportMatchingCSV = (
  assigned: any[],
  userProfiles: any,
  year: number,
  month: number
) => {
  const headers = [
    '日付',
    '薬剤師名',
    '薬剤師メール',
    '薬局名',
    '薬局メール',
    '店舗名',
    '開始時間',
    '終了時間',
    'ステータス'
  ];

  const rows = assigned
    .filter((shift: any) => {
      const shiftDate = new Date(shift.date);
      return shiftDate.getFullYear() === year && shiftDate.getMonth() + 1 === month;
    })
    .map((shift: any) => {
      const pharmacistProfile = userProfiles[shift.pharmacist_id];
      const pharmacyProfile = userProfiles[shift.pharmacy_id];

      // ユーティリティ関数を使用して店舗名と時間を取得
      const storeName = extractStoreName(shift);

      return [
        shift.date,
        pharmacistProfile?.name || '',
        pharmacistProfile?.email || '',
        pharmacyProfile?.name || '',
        pharmacyProfile?.email || '',
        storeName,
        shift.start_time ? String(shift.start_time).substring(0, 5) : '',
        shift.end_time ? String(shift.end_time).substring(0, 5) : '',
        shift.status === 'confirmed' ? '確定' : '保留'
      ];
    })
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  const csv = arrayToCSV(headers, rows);
  const filename = `マッチング一覧_${year}年${month}月_${new Date().getTime()}.csv`;
  downloadCSV(csv, filename);
};

/**
 * 不足薬局一覧のCSV出力
 */
export const exportShortageCSV = (
  postings: any[],
  assigned: any[],
  userProfiles: any,
  year: number,
  month: number
) => {
  const headers = [
    '日付',
    '薬局名',
    '薬局メール',
    '店舗名',
    '開始時間',
    '終了時間',
    '必要人数',
    '確定人数',
    '不足人数'
  ];

  // 日付ごと・薬局ごと・店舗ごと・時間帯ごとにグループ化
  const shortageMap: {[key: string]: {
    date: string;
    pharmacy_id: string;
    store_name: string;
    time_slot: string;
    start_time?: string;
    end_time?: string;
    required: number;
    confirmed: number;
  }} = {};

  postings
    .filter((posting: any) => {
      const postingDate = new Date(posting.date);
      return postingDate.getFullYear() === year && postingDate.getMonth() + 1 === month;
    })
    .forEach((posting: any) => {
      // ユーティリティ関数を使用して店舗名を取得
      const storeName = extractStoreName(posting);
      const key = `${posting.date}_${posting.pharmacy_id}_${storeName}_${posting.time_slot}_${posting.start_time || ''}_${posting.end_time || ''}`;

      if (!shortageMap[key]) {
        shortageMap[key] = {
          date: posting.date,
          pharmacy_id: posting.pharmacy_id,
          store_name: storeName,
          time_slot: posting.time_slot,
          start_time: posting.start_time,
          end_time: posting.end_time,
          required: 0,
          confirmed: 0
        };
      }

      shortageMap[key].required += posting.required_staff || 1;
    });

  // 確定人数をカウント
  assigned
    .filter((shift: any) => {
      const shiftDate = new Date(shift.date);
      return shiftDate.getFullYear() === year && shiftDate.getMonth() + 1 === month && shift.status === 'confirmed';
    })
    .forEach((shift: any) => {
      // ユーティリティ関数を使用して店舗名を取得
      const storeName = extractStoreName(shift);
      const key = `${shift.date}_${shift.pharmacy_id}_${storeName}_${shift.time_slot}_${shift.start_time || ''}_${shift.end_time || ''}`;

      if (shortageMap[key]) {
        shortageMap[key].confirmed += 1;
      }
    });

  const rows = Object.values(shortageMap)
    .filter(item => item.confirmed < item.required)
    .map(item => {
      const pharmacyProfile = userProfiles[item.pharmacy_id];

      return [
        item.date,
        pharmacyProfile?.name || '',
        pharmacyProfile?.email || '',
        item.store_name,
        item.start_time ? String(item.start_time).substring(0, 5) : '',
        item.end_time ? String(item.end_time).substring(0, 5) : '',
        item.required,
        item.confirmed,
        item.required - item.confirmed
      ];
    })
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  const csv = arrayToCSV(headers, rows);
  const filename = `不足薬局一覧_${year}年${month}月_${new Date().getTime()}.csv`;
  downloadCSV(csv, filename);
};

/**
 * 応募薬剤師一覧のCSV出力
 */
export const exportRequestsCSV = (
  requests: any[],
  userProfiles: any,
  year: number,
  month: number
) => {
  const headers = [
    '日付',
    '薬剤師名',
    '薬剤師メール',
    '開始時間',
    '終了時間',
    '備考',
    'ステータス'
  ];

  const rows = requests
    .filter((request: any) => {
      const requestDate = new Date(request.date);
      return requestDate.getFullYear() === year && requestDate.getMonth() + 1 === month;
    })
    .map((request: any) => {
      const pharmacistProfile = userProfiles[request.pharmacist_id];

      return [
        request.date,
        pharmacistProfile?.name || '',
        pharmacistProfile?.email || '',
        request.start_time ? String(request.start_time).substring(0, 5) : '',
        request.end_time ? String(request.end_time).substring(0, 5) : '',
        request.memo || '',
        request.status === 'confirmed' ? '確定' : request.status === 'pending' ? '保留' : request.status
      ];
    })
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  const csv = arrayToCSV(headers, rows);
  const filename = `応募薬剤師一覧_${year}年${month}月_${new Date().getTime()}.csv`;
  downloadCSV(csv, filename);
};

/**
 * 募集薬局一覧のCSV出力
 */
export const exportPostingsCSV = (
  postings: any[],
  userProfiles: any,
  year: number,
  month: number
) => {
  const headers = [
    '日付',
    '薬局名',
    '薬局メール',
    '店舗名',
    '開始時間',
    '終了時間',
    '必要人数',
    '備考'
  ];

  const rows = postings
    .filter((posting: any) => {
      const postingDate = new Date(posting.date);
      return postingDate.getFullYear() === year && postingDate.getMonth() + 1 === month;
    })
    .map((posting: any) => {
      const pharmacyProfile = userProfiles[posting.pharmacy_id];

      // ユーティリティ関数を使用して店舗名を取得
      const storeName = extractStoreName(posting);

      return [
        posting.date,
        pharmacyProfile?.name || '',
        pharmacyProfile?.email || '',
        storeName,
        posting.start_time ? String(posting.start_time).substring(0, 5) : '',
        posting.end_time ? String(posting.end_time).substring(0, 5) : '',
        posting.required_staff || 1,
        posting.memo || ''
      ];
    })
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  const csv = arrayToCSV(headers, rows);
  const filename = `募集薬局一覧_${year}年${month}月_${new Date().getTime()}.csv`;
  downloadCSV(csv, filename);
};
