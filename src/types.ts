export interface Unit {
  id: string;
  name: string;
  shortName: string;
  kind: '동원사단' | '동원지원단' | '지역방위사단';
  region: string;
  coordinates: [number, number];
  locationAccuracy: 'regional';
  locationLabel: string;
  phone: string;
  phoneNote: string;
  sourcePage: number;
  capacity: number | null;
  directionsUrl: string | null;
  officialAddress: string | null;
}

export interface Position {
  id: string;
  unitId: string;
  title: string;
  group: string;
  branch: string;
  branchRaw: string;
  specialty: string | null;
  targetRank: string;
  acceptedRanks: string[];
  acceptedRanksRaw: string;
  quota: string;
  sourcePage: number;
  status: 'parsed' | 'review';
  reviewReasons: string[];
  commonBranch: boolean;
  pilotType: string | null;
  approximate: boolean;
}

export interface RecruitmentData {
  notice: {
    title: string;
    publishedAt: string;
    checkedAt: string;
    serviceYear: number;
    sourceUrl: string;
    applicationUrl: string;
    dateStatus: 'review';
    dateNote: string;
    scopeNote: string;
    locationNote: string;
  };
  units: Unit[];
  positions: Position[];
}

export interface Filters {
  branch: string;
  rank: string;
  specialty: string;
  similar: boolean;
  query: string;
  kind: string;
  region: string;
}

export type MatchType = 'direct' | 'similar' | 'review' | 'excluded';
export interface Match { type: MatchType; reason: string }
export interface UnitResult { unit: Unit; positions: { position: Position; match: Match }[]; reviewCount: number }
