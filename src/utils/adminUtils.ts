// 管理者ダッシュボード用のユーティリティ関数

export const safeArray = (arr: any) => {
  if (!Array.isArray(arr)) {
    console.warn('Expected array but got:', typeof arr, arr);
    return [];
  }
  return arr;
};

export const safeLength = (arr: any) => {
  return safeArray(arr).length;
};

export const getMonthName = (date: Date) => {
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
};

export const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  return days;
};

export const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const formatTime = (time: string) => {
  if (!time) return '';
  return time.substring(0, 5); // HH:MM形式
};

export const getMatchingStatus = (date: string, assigned: any[], requests: any[], postings: any[]) => {
  const dayAssigned = assigned.filter(shift => shift.date === date);
  const dayRequests = requests.filter(req => req.date === date);
  const dayPostings = postings.filter(post => post.date === date);
  
  return {
    count: dayAssigned.length,
    unconfirmedMatches: Math.min(dayRequests.length, dayPostings.length),
    shortage: Math.max(0, dayRequests.length - dayPostings.length)
  };
};

export const getConsultRequests = (date: string, requests: any[]) => {
  return requests.filter(req => 
    req.date === date && 
    req.notes && 
    req.notes.toLowerCase().includes('相談')
  );
};

export const calculateMonthlyStats = (assigned: any[], requests: any[], postings: any[]) => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  
  const monthlyAssigned = assigned.filter(shift => 
    shift.date.startsWith(monthStr)
  );
  
  const monthlyRequests = requests.filter(req => 
    req.date.startsWith(monthStr)
  );
  
  const monthlyPostings = postings.filter(post => 
    post.date.startsWith(monthStr)
  );
  
  return {
    assigned: monthlyAssigned.length,
    requests: monthlyRequests.length,
    postings: monthlyPostings.length,
    matchRate: monthlyPostings.length > 0 
      ? (monthlyAssigned.length / monthlyPostings.length * 100).toFixed(1)
      : '0.0'
  };
};

export const validateUserData = (user: any) => {
  const errors: string[] = [];
  
  if (!user.name || user.name.trim() === '') {
    errors.push('名前は必須です');
  }
  
  if (!user.email || user.email.trim() === '') {
    errors.push('メールアドレスは必須です');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    errors.push('有効なメールアドレスを入力してください');
  }
  
  if (!user.phone || user.phone.trim() === '') {
    errors.push('電話番号は必須です');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY'
  }).format(amount);
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'text-green-600 bg-green-100';
    case 'error':
      return 'text-red-600 bg-red-100';
    case 'pending':
      return 'text-yellow-600 bg-yellow-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  return function executedFunction(...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
