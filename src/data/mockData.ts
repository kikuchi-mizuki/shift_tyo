import { User, Pharmacy, ShiftRequest, ShiftPosting } from '../types';

export const mockUsers: User[] = [
  // 薬剤師
  {
    id: 'pharmacist-1',
    name: '田中花子',
    email: 'tanaka@example.com',
    type: 'pharmacist',
    specialties: ['調剤', '服薬指導', '在宅医療'],
    ngList: ['pharmacy-3'] // NG薬局
  },
  {
    id: 'pharmacist-2',
    name: '佐藤太郎',
    email: 'sato@example.com',
    type: 'pharmacist',
    specialties: ['調剤', '漢方', 'DI業務'],
    ngList: []
  },
  {
    id: 'pharmacist-3',
    name: '山田美咲',
    email: 'yamada@example.com',
    type: 'pharmacist',
    specialties: ['調剤', '服薬指導'],
    ngList: ['pharmacy-2']
  },
  {
    id: 'pharmacist-4',
    name: '鈴木次郎',
    email: 'suzuki@example.com',
    type: 'pharmacist',
    specialties: ['調剤', '在宅医療', 'DI業務', '漢方'],
    ngList: []
  },
  // 薬局
  {
    id: 'pharmacy-1',
    name: 'さくら薬局 本店',
    email: 'honten@sakura-pharmacy.com',
    type: 'pharmacy',
    pharmacyId: 'pharmacy-1',
    ngList: ['pharmacist-3'] // NG薬剤師
  },
  {
    id: 'pharmacy-2',
    name: 'みどり調剤薬局',
    email: 'info@midori-pharmacy.com',
    type: 'pharmacy',
    pharmacyId: 'pharmacy-2',
    ngList: []
  },
  {
    id: 'pharmacy-3',
    name: 'あおば薬局 駅前店',
    email: 'ekimae@aoba-pharmacy.com',
    type: 'pharmacy',
    pharmacyId: 'pharmacy-3',
    ngList: ['pharmacist-1']
  },
  // 管理者
  {
    id: 'admin-1',
    name: 'システム管理者',
    email: 'admin@shift-system.com',
    type: 'admin'
  }
];

export const mockPharmacies: Pharmacy[] = [
  {
    id: 'pharmacy-1',
    name: 'さくら薬局 本店',
    address: '東京都渋谷区1-1-1',
    phone: '03-1234-5678',
    type: 'retail',
    requirements: {
      minExperience: 2,
      specialties: ['調剤', '服薬指導'],
      maxPharmacists: 3
    },
    ngList: ['pharmacist-3']
  },
  {
    id: 'pharmacy-2',
    name: 'みどり調剤薬局',
    address: '東京都新宿区2-2-2',
    phone: '03-2345-6789',
    type: 'hospital',
    requirements: {
      minExperience: 3,
      specialties: ['調剤', 'DI業務'],
      maxPharmacists: 2
    },
    ngList: []
  },
  {
    id: 'pharmacy-3',
    name: 'あおば薬局 駅前店',
    address: '東京都品川区3-3-3',
    phone: '03-3456-7890',
    type: 'clinic',
    requirements: {
      minExperience: 1,
      specialties: ['調剤'],
      maxPharmacists: 2
    },
    ngList: ['pharmacist-1']
  }
];

export const generateSampleRequests = (month: number, year: number): ShiftRequest[] => {
  const requests: ShiftRequest[] = [];
  const pharmacists = mockUsers.filter(u => u.type === 'pharmacist');
  const timeSlots = ['morning', 'afternoon', 'fullday', 'negotiable'] as const;
  const priorities = ['high', 'medium', 'low'] as const;
  
  pharmacists.forEach(pharmacist => {
    const numRequests = Math.floor(Math.random() * 8) + 12; // 12-20件
    for (let i = 0; i < numRequests; i++) {
      const day = Math.floor(Math.random() * 28) + 1;
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      requests.push({
        id: `request-${pharmacist.id}-${i}`,
        pharmacistId: pharmacist.id,
        date,
        timeSlot: timeSlots[Math.floor(Math.random() * timeSlots.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: 'pending',
        notes: Math.random() > 0.8 ? '在宅医療対応可能' : undefined
      });
    }
  });

  return requests;
};

export const generateSamplePostings = (month: number, year: number): ShiftPosting[] => {
  const postings: ShiftPosting[] = [];
  const timeSlots = ['morning', 'afternoon', 'fullday', 'negotiable'] as const;
  
  mockPharmacies.forEach(pharmacy => {
    const numPostings = Math.floor(Math.random() * 15) + 25; // 25-40件
    for (let i = 0; i < numPostings; i++) {
      const day = Math.floor(Math.random() * 28) + 1;
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
      
      postings.push({
        id: `posting-${pharmacy.id}-${i}`,
        pharmacyId: pharmacy.id,
        date,
        timeSlot,
        requiredPeople: Math.floor(Math.random() * 2) + 1, // 1-2名
        hourlyRate: Math.floor(Math.random() * 1000) + 2500, // 2500-3500円
        requirements: pharmacy.requirements.specialties.slice(0, Math.floor(Math.random() * 2) + 1),
        status: 'open',
        createdAt: new Date().toISOString(),
        notes: Math.random() > 0.7 ? '経験者優遇' : undefined
      });
    }
  });

  return postings;
};