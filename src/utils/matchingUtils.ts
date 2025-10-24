// マッチングロジック用のユーティリティ関数

export interface MatchCandidate {
  pharmacist_id: string;
  pharmacy_id: string;
  pharmacist_name: string;
  pharmacy_name: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  notes?: string;
  score?: number;
}

export interface MatchingResult {
  matches: MatchCandidate[];
  unmatchedRequests: any[];
  unmatchedPostings: any[];
  totalScore: number;
}

export const calculateMatchingScore = (request: any, posting: any) => {
  let score = 0;
  
  // 時間の一致度
  if (request.start_time === posting.start_time && request.end_time === posting.end_time) {
    score += 50;
  } else {
    // 時間の重複度を計算
    const requestStart = new Date(`2000-01-01 ${request.start_time}`);
    const requestEnd = new Date(`2000-01-01 ${request.end_time}`);
    const postingStart = new Date(`2000-01-01 ${posting.start_time}`);
    const postingEnd = new Date(`2000-01-01 ${posting.end_time}`);
    
    const overlapStart = new Date(Math.max(requestStart.getTime(), postingStart.getTime()));
    const overlapEnd = new Date(Math.min(requestEnd.getTime(), postingEnd.getTime()));
    
    if (overlapStart < overlapEnd) {
      const overlapHours = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60);
      const totalHours = (requestEnd.getTime() - requestStart.getTime()) / (1000 * 60 * 60);
      score += (overlapHours / totalHours) * 30;
    }
  }
  
  // 時給の一致度
  const rateDiff = Math.abs(request.hourly_rate - posting.hourly_rate);
  if (rateDiff === 0) {
    score += 20;
  } else if (rateDiff <= 100) {
    score += 15;
  } else if (rateDiff <= 200) {
    score += 10;
  }
  
  // 地域の一致度（住所の類似性）
  if (request.pharmacist?.address && posting.pharmacy?.address) {
    const requestAddress = request.pharmacist.address.toLowerCase();
    const postingAddress = posting.pharmacy.address.toLowerCase();
    
    if (requestAddress.includes(postingAddress.split(' ')[0]) || 
        postingAddress.includes(requestAddress.split(' ')[0])) {
      score += 10;
    }
  }
  
  return Math.min(score, 100);
};

export const findMatches = (requests: any[], postings: any[]): MatchingResult => {
  const matches: MatchCandidate[] = [];
  const usedPostings = new Set<string>();
  const unmatchedRequests: any[] = [];
  
  // リクエストをスコア順でソート
  const sortedRequests = requests
    .map(request => ({
      request,
      bestMatch: findBestMatch(request, postings, usedPostings)
    }))
    .sort((a, b) => (b.bestMatch?.score || 0) - (a.bestMatch?.score || 0));
  
  // マッチング実行
  for (const { request, bestMatch } of sortedRequests) {
    if (bestMatch && bestMatch.score >= 30) { // 最低スコア閾値
      matches.push({
        pharmacist_id: request.pharmacist_id,
        pharmacy_id: bestMatch.posting.pharmacy_id,
        pharmacist_name: request.pharmacist?.name || '不明',
        pharmacy_name: bestMatch.posting.pharmacy?.name || '不明',
        start_time: bestMatch.posting.start_time,
        end_time: bestMatch.posting.end_time,
        hourly_rate: bestMatch.posting.hourly_rate,
        notes: bestMatch.posting.notes,
        score: bestMatch.score
      });
      
      usedPostings.add(bestMatch.posting.id);
    } else {
      unmatchedRequests.push(request);
    }
  }
  
  // 未使用のポスティングを特定
  const unmatchedPostings = postings.filter(posting => !usedPostings.has(posting.id));
  
  const totalScore = matches.reduce((sum, match) => sum + (match.score || 0), 0);
  
  return {
    matches,
    unmatchedRequests,
    unmatchedPostings,
    totalScore
  };
};

const findBestMatch = (request: any, postings: any[], usedPostings: Set<string>) => {
  let bestMatch = null;
  let bestScore = 0;
  
  for (const posting of postings) {
    if (usedPostings.has(posting.id)) continue;
    
    const score = calculateMatchingScore(request, posting);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { posting, score };
    }
  }
  
  return bestMatch;
};

export const validateMatch = (match: MatchCandidate) => {
  const errors: string[] = [];
  
  if (!match.pharmacist_id) {
    errors.push('薬剤師IDが指定されていません');
  }
  
  if (!match.pharmacy_id) {
    errors.push('薬局IDが指定されていません');
  }
  
  if (!match.start_time) {
    errors.push('開始時間が指定されていません');
  }
  
  if (!match.end_time) {
    errors.push('終了時間が指定されていません');
  }
  
  if (match.hourly_rate <= 0) {
    errors.push('時給が正しく設定されていません');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const formatMatchResult = (result: MatchingResult) => {
  return {
    totalMatches: result.matches.length,
    matchRate: result.matches.length / (result.matches.length + result.unmatchedRequests.length) * 100,
    averageScore: result.matches.length > 0 ? result.totalScore / result.matches.length : 0,
    unmatchedRequests: result.unmatchedRequests.length,
    unmatchedPostings: result.unmatchedPostings.length
  };
};

export const sortMatchesByScore = (matches: MatchCandidate[]) => {
  return matches.sort((a, b) => (b.score || 0) - (a.score || 0));
};

export const filterMatchesByScore = (matches: MatchCandidate[], minScore: number) => {
  return matches.filter(match => (match.score || 0) >= minScore);
};

export const groupMatchesByDate = (matches: MatchCandidate[], date: string) => {
  return matches.filter(match => {
    // 日付フィルタリングのロジック
    return true; // 実装に応じて調整
  });
};
