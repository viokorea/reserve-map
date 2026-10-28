import type { Filters, Match, Position, RecruitmentData, UnitResult } from './types.ts';

export const RANKS = ['병장', '하사', '중사', '상사', '원사', '준위', '소위', '중위', '대위', '소령', '중령'];
export const BRANCHES = ['보병', '기갑', '포병', '방공', '정보', '공병', '정보통신', '항공', '화생방', '병기', '병참', '수송', '군사경찰', '의무', '인사행정', '군수', '의정', '정훈'];
// Army combat-branch classification: https://www.pknu.ac.kr/main/494
// User-approved mapping for 전투공통; each role's accepted ranks still apply.
export const COMBAT_BRANCHES = ['보병', '기갑', '포병', '방공', '정보', '공병', '정보통신', '항공'];
export const EMPTY_FILTERS: Filters = { branch: '', rank: '', specialty: '', similar: false, query: '', kind: '', region: '' };

// PDF p.10: required branch -> permitted applicant branches, in preference order.
export const OFFICER_SIMILAR: Record<string, string[]> = {
  보병: ['포병', '정보', '정보통신'], 기갑: ['포병', '보병', '방공'],
  포병: ['방공', '기갑', '보병'], 방공: ['포병', '보병', '기갑'],
  정보: ['보병', '포병', '정보통신'], 공병: ['포병', '기갑', '보병'],
  정보통신: ['포병', '정보', '보병'], 병기: ['군수', '병참', '수송'],
  병참: ['군수', '병기', '수송'], 수송: ['군수', '포병', '기갑'],
  군수: ['병기', '병참', '수송'], 군사경찰: ['보병', '포병', '기갑'],
  의정: ['보병', '인사행정', '병참'],
};

// Only rules whose required field is explicit in the dataset are evaluated.
// Remaining specialty-specific rules stay in the source PDF, rather than being
// expanded to every role within a broad branch.
const NCO_SIMILAR: Record<string, string[]> = {
  공병: ['시설공병', '공병장비운용'],
  수송: ['차량정비', '공병장비운용/정비', '일반장비정비'],
  군사경찰: ['수사', '이동관리', '일반보병'],
};
export const SPECIALTIES: Record<string, string[]> = {
  보병: ['일반보병', '박격포', '특전보병'],
  기갑: ['M계열 전차승무', 'K계열 전차승무', '전차정비'],
  포병: ['야전포병', '로켓포병', '견인포병', '사격지휘'],
  정보: ['인간정보', '신호정보', '영상정보'],
  공병: ['시설공병', '공병장비운용', '공병장비운용/정비'],
  정보통신: ['전술통신운용', '특수통신운용', '정보체계운용/정비', '통신전자정비'],
  병기: ['차량정비', '전차정비', '총포정비', '일반장비정비'],
  병참: ['물자보급', '장비수리부속관리'],
  수송: ['중형차량운전', '대형차량운전', '견인차량운전', '구난차량운전', '차량정비'],
  군사경찰: ['수사', '이동관리'],
};

export function evaluate(position: Position, filters: Filters): Match {
  if (filters.rank && !position.acceptedRanks.includes(filters.rank)) {
    return { type: 'excluded', reason: '공고의 지원가능계급에 포함되지 않습니다.' };
  }
  if (position.status === 'review') {
    return { type: 'review', reason: position.reviewReasons.join(' · ') };
  }
  if (!filters.branch) return { type: 'direct', reason: filters.rank ? '지원가능계급에 포함됩니다. 병과도 선택해 주세요.' : '병과와 전역계급을 선택해 조건을 확인하세요.' };
  if (position.branchRaw === '전투공통') {
    return COMBAT_BRANCHES.includes(filters.branch)
      ? { type: 'direct', reason: `${filters.branch}는 전투병과에 포함되어 전투공통 조건에 일치합니다.` }
      : { type: 'excluded', reason: `${filters.branch}는 전투공통 대상 전투병과에 포함되지 않습니다.` };
  }
  if (position.commonBranch) return { type: 'review', reason: `${position.branchRaw}의 허용 병과 범위는 모집부대 확인이 필요합니다.` };
  if (position.branch === filters.branch) {
    if (position.specialty && position.specialty !== filters.specialty) {
      return { type: 'review', reason: `공고상 세부 조건: ${position.branchRaw}. 특기를 확인해 주세요.` };
    }
    return { type: 'direct', reason: `${filters.branch} 병과${filters.rank ? ` · ${filters.rank} 지원가능계급` : ''} 일치` };
  }
  if (!filters.similar || !filters.rank) return { type: 'excluded', reason: '병과가 다릅니다.' };
  if (['소위', '중위', '대위', '소령', '중령'].includes(filters.rank)) {
    const order = OFFICER_SIMILAR[position.branch]?.indexOf(filters.branch) ?? -1;
    if (order !== -1) return { type: 'similar', reason: `공고 10쪽 · ${position.branch} 소요에 ${filters.branch} ${order + 1}차 유사병과 지원` };
  } else if (['하사', '중사', '상사', '원사'].includes(filters.rank) && filters.specialty) {
    const allowed = NCO_SIMILAR[position.branch];
    if (allowed?.includes(filters.specialty)) return { type: 'similar', reason: `공고 10쪽 · ${position.branch} 소요에 ${filters.specialty} 특기 지원` };
  }
  return { type: 'excluded', reason: '입력한 조건으로 확인된 유사병과·특기 규칙이 없습니다.' };
}

export function searchUnits(data: RecruitmentData, filters: Filters): UnitResult[] {
  const byUnit = new Map<string, UnitResult>();
  const query = filters.query.replace(/\s/g, '').toLowerCase();
  for (const unit of data.units) {
    if (filters.kind && unit.kind !== filters.kind) continue;
    if (filters.region && !unit.region.startsWith(filters.region)) continue;
    const all = data.positions.filter(p => p.unitId === unit.id);
    const positions = all.filter(p => !query || `${unit.name}${unit.shortName}${unit.region}${p.title}${p.group}`.replace(/\s/g, '').toLowerCase().includes(query))
      .map(position => ({ position, match: evaluate(position, filters) }));
    const matched = positions.filter(p => p.match.type === 'direct' || p.match.type === 'similar');
    const reviewCount = positions.filter(p => p.match.type === 'review').length;
    if (matched.length || reviewCount) byUnit.set(unit.id, { unit, positions: matched, reviewCount });
  }
  // ponytail: linear filtering per unit is fine for 28 units / <2k entries;
  // index by unit once if the corpus grows to many annual notices.
  return [...byUnit.values()].sort((a, b) => {
    const directA = a.positions.some(p => p.match.type === 'direct');
    const directB = b.positions.some(p => p.match.type === 'direct');
    return Number(directB) - Number(directA) || Number(b.positions.length > 0) - Number(a.positions.length > 0);
  });
}

export function readFilters(search: string): Filters {
  const params = new URLSearchParams(search);
  const branch = params.get('branch') ?? '';
  const rank = params.get('rank') ?? '';
  const specialty = params.get('specialty') ?? '';
  return { ...EMPTY_FILTERS, branch: BRANCHES.includes(branch) ? branch : '', rank: RANKS.includes(rank) ? rank : '',
    specialty: SPECIALTIES[branch]?.includes(specialty) ? specialty : '', similar: params.get('similar') === '1',
    query: (params.get('q') ?? '').slice(0,100), kind: ['동원사단','동원지원단','지역방위사단'].includes(params.get('kind') ?? '') ? params.get('kind')! : '',
    region: ['서울','경기','강원','세종','충북','전북','광주','대구','경북','부산','경남'].includes(params.get('region') ?? '') ? params.get('region')! : '' };
}

export function filtersToSearch(filters: Filters): string {
  const params = new URLSearchParams();
  for (const key of ['branch','rank','specialty','kind','region'] as const) if (filters[key]) params.set(key,filters[key]);
  if (filters.query) params.set('q',filters.query);
  if (filters.similar) params.set('similar','1');
  return params.toString();
}
