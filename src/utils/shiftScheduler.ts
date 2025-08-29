import { ShiftRequest, AssignedShift, User, Pharmacy, ShiftPosting } from '../types';

export class PharmacyShiftScheduler {
  private requests: ShiftRequest[] = [];
  private users: User[] = [];
  private pharmacies: Pharmacy[] = [];
  private postings: ShiftPosting[] = [];

  setRequests(requests: ShiftRequest[]) {
    this.requests = requests;
  }

  setUsers(users: User[]) {
    this.users = users;
  }

  setPharmacies(pharmacies: Pharmacy[]) {
    this.pharmacies = pharmacies;
  }

  setPostings(postings: ShiftPosting[]) {
    this.postings = postings;
  }

  private calculateScore(request: ShiftRequest, user: User, pharmacy: Pharmacy): number {
    let score = 0;

    // ユーザーが存在しない場合は除外
    if (!user) {
      return -1;
    }

    // 薬局が存在しない場合は除外
    if (!pharmacy) {
      return -1;
    }

    // NGリストチェック（完全に除外）
    // 薬剤師のNGリストに薬局が含まれている場合
    if (user.ngList?.includes(pharmacy.id)) {
      return -1; // 完全に除外
    }

    // 薬局のNGリストに薬剤師が含まれている場合
    const pharmacyUser = this.users.find(u => u.id === pharmacy.id || u.pharmacyId === pharmacy.id);
    if (pharmacyUser && pharmacyUser.ngList?.includes(user.id)) {
      return -1; // 完全に除外
    }

    // 優先度による重み付け
    const priorityWeights = { high: 3, medium: 2, low: 1 };
    score += priorityWeights[request.priority];

    // 経験年数による適合度
    // 経験年数チェックを削除（要件は満たしているものとして扱う）
    score += 1; // 基本スコア

    // 専門分野の適合度
    if (user.specialties && pharmacy.requirements.specialties) {
      const matchingSpecialties = user.specialties.filter(specialty => 
        pharmacy.requirements.specialties.includes(specialty)
      );
      score += matchingSpecialties.length * 1.5;
    }

    // 時間帯の適合度
    if (request.timeSlot === 'fullday' || request.timeSlot === 'negotiable') {
      score += 1; // フルタイムや要相談は柔軟性が高い
    }

    // ランダム要素（公平性のため）
    score += Math.random() * 0.3;

    return score;
  }

  generateProvisionalSchedule(month: string, year: number): AssignedShift[] {
    return this.generateScheduleInternal(month, year, 'provisional');
  }

  generateFinalSchedule(month: string, year: number): AssignedShift[] {
    return this.generateScheduleInternal(month, year, 'confirmed');
  }

  private generateScheduleInternal(month: string, year: number, status: 'provisional' | 'confirmed'): AssignedShift[] {
    const schedule: AssignedShift[] = [];
    const postingsByDate = new Map<string, ShiftPosting[]>();

    // 薬剤師の希望がない場合は空のスケジュールを返す
    if (this.requests.length === 0) {
      return schedule;
    }

    // 募集を日付別にグループ化
    this.postings.filter(p => p.status === 'open').forEach(posting => {
      if (!postingsByDate.has(posting.date)) {
        postingsByDate.set(posting.date, []);
      }
      postingsByDate.get(posting.date)!.push(posting);
    });

    // 各日付の処理
    postingsByDate.forEach((datePostings, date) => {
      const timeSlotPostings = new Map<string, ShiftPosting[]>();
      
      // 時間帯別にグループ化
      datePostings.forEach(posting => {
        if (!timeSlotPostings.has(posting.timeSlot)) {
          timeSlotPostings.set(posting.timeSlot, []);
        }
        timeSlotPostings.get(posting.timeSlot)!.push(posting);
      });

      // 各時間帯のマッチング処理
      timeSlotPostings.forEach((slotPostings, timeSlot) => {
        slotPostings.forEach(posting => {
          // この募集にマッチする希望を検索
          const matchingRequests = this.requests.filter(request => 
            request.date === posting.date && 
            (request.timeSlot === posting.timeSlot || 
             request.timeSlot === 'fullday' || 
             request.timeSlot === 'negotiable' ||
             posting.timeSlot === 'negotiable') &&
            request.status === 'pending'
          );

          // マッチする希望がない場合はスキップ
          if (matchingRequests.length === 0) {
            return;
          }

          // 候補者をスコア順にソート
          const candidates = matchingRequests
            .map(request => {
              const user = this.users.find(u => u.id === request.pharmacistId)!;
              const pharmacy = this.pharmacies.find(p => p.id === posting.pharmacyId)!;
              const score = this.calculateScore(request, user, pharmacy);
              return { request, user, score };
            })
            .filter(candidate => candidate.score >= 0) // NGリストを除外
            .sort((a, b) => b.score - a.score);

          // 必要人数分をアサイン
          const assignCount = Math.min(candidates.length, posting.requiredPeople);
          for (let i = 0; i < assignCount; i++) {
            const { request, user } = candidates[i];
            const pharmacy = this.pharmacies.find(p => p.id === posting.pharmacyId)!;
          
            const duration = this.calculateDuration(posting.timeSlot);
            
            schedule.push({
              id: `shift-${Date.now()}-${Math.random()}`,
              pharmacistId: user.id,
              pharmacyId: pharmacy.id,
              date: posting.date,
              timeSlot: posting.timeSlot as any,
              duration,
              hourlyRate: posting.hourlyRate,
              status
            });
          }
        });
      });
    });

    return schedule;
  }

  private calculateDuration(timeSlot: string): number {
    const durations = {
      morning: 4,
      afternoon: 4,
      fullday: 8,
      negotiable: 6
    };
    return durations[timeSlot as keyof typeof durations] || 4;
  }
}