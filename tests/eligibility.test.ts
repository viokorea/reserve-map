import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EMPTY_FILTERS, evaluate, filtersToSearch, readFilters, RANKS, searchUnits } from '../src/eligibility.ts';
import type { Filters, RecruitmentData } from '../src/types.ts';

const data = JSON.parse(readFileSync(new URL('../public/data/recruitments.json',import.meta.url),'utf8')) as RecruitmentData;
const base = data.positions.find(p=>p.unitId==='division-60' && p.title==='통신부소대장' && p.sourcePage===13)!;
const profile=(values:Partial<Filters>):Filters=>({...EMPTY_FILTERS,...values});

test('PDF p13: 정보통신 병장은 선발계급 하사 직책에 지원가능',()=>{
  assert.equal(base.targetRank,'하사');
  assert.equal(evaluate(base,profile({branch:'정보통신',rank:'병장'})).type,'direct');
});
test('계급 대소 비교 대신 명시된 지원가능계급을 사용',()=>{
  assert.equal(evaluate(base,profile({branch:'정보통신',rank:'상사'})).type,'excluded');
});
test('병과 불일치 제외',()=>{
  assert.equal(evaluate(base,profile({branch:'보병',rank:'병장'})).type,'excluded');
});
test('PDF p10 유사병과는 방향과 지원자 신분을 지킴',()=>{
  const engineer={...base,branch:'공병',branchRaw:'공병',acceptedRanks:['소위','중위','대위']};
  const artillery={...engineer,branch:'포병',branchRaw:'포병'};
  assert.equal(evaluate(engineer,profile({branch:'포병',rank:'대위',similar:true})).type,'similar');
  assert.equal(evaluate(artillery,profile({branch:'공병',rank:'대위',similar:true})).type,'excluded');
  assert.equal(evaluate(engineer,profile({branch:'포병',rank:'대위',similar:false})).type,'excluded');
  assert.equal(evaluate({...engineer,acceptedRanks:['하사']},profile({branch:'포병',rank:'하사',similar:true})).type,'excluded');
});
test('공통병과는 전 병과 허용으로 임의 해석하지 않음',()=>{
  const common=data.positions.find(p=>p.commonBranch)!;
  assert.equal(evaluate(common,profile({branch:'공병',rank:common.acceptedRanks[0]})).type,'review');
});
test('특기 미입력은 추가 확인, 일치하면 직접 일치',()=>{
  const specific=data.positions.find(p=>p.specialty==='대형차량운전')!;
  assert.equal(evaluate(specific,profile({branch:'수송',rank:'병장'})).type,'review');
  assert.equal(evaluate(specific,profile({branch:'수송',rank:'병장',specialty:'대형차량운전'})).type,'direct');
});
test('누락된 지원가능계급 원문은 확정 일치에 포함하지 않음',()=>{
  const broken=data.positions.find(p=>p.status==='review')!;
  assert.equal(evaluate(broken,profile({branch:broken.branch,rank:broken.acceptedRanks[0]})).type,'review');
});
test('지원자 특기가 명시된 부사관 유사 지원',()=>{
  const transport={...base,branch:'수송',branchRaw:'수송',acceptedRanks:['하사','중사']};
  assert.equal(evaluate(transport,profile({branch:'병기',rank:'중사',specialty:'차량정비',similar:true})).type,'similar');
  assert.equal(evaluate(transport,profile({branch:'병기',rank:'중사',similar:true})).type,'excluded');
});
test('73사단 A/B 시범 표와 일반 보병대대 표를 중복 적용하지 않음',()=>{
  const roles=data.positions.filter(p=>p.unitId==='division-73');
  assert(roles.some(p=>p.pilotType==='A유형'));
  assert(roles.some(p=>p.pilotType==='B유형'));
  assert(!roles.some(p=>p.sourcePage===15 && p.group.includes('보병대대')));
});
test('필터 결과의 모든 직책은 같은 판정 함수를 통과',()=>{
  const filters=profile({branch:'정보통신',rank:'병장'});
  const results=searchUnits(data,filters);
  assert(results.some(r=>r.unit.id==='division-60' && r.positions.some(p=>p.position.id===base.id)));
  for (const result of results) for (const row of result.positions) {
    assert.equal(row.position.unitId,result.unit.id);
    assert(['direct','similar'].includes(evaluate(row.position,filters).type));
  }
});
test('부대 검색, 유형, 지역 필터와 없는 결과',()=>{
  assert(searchUnits(data,profile({query:'60사단'})).every(r=>r.unit.id==='division-60'));
  assert(searchUnits(data,profile({kind:'동원지원단',region:'경기'})).every(r=>r.unit.kind==='동원지원단' && r.unit.region.startsWith('경기')));
  assert.equal(searchUnits(data,profile({query:'존재하지않는직책xyz'})).length,0);
});
test('공유 URL 왕복 및 유효하지 않은 사용자 입력 정리',()=>{
  const filters=profile({branch:'정보통신',rank:'병장',similar:true,query:'통신',region:'경기'});
  assert.deepEqual(readFilters(filtersToSearch(filters)),filters);
  const invalid=readFilters('?branch=없는병과&rank=대장&region=달&kind=전부&specialty=가짜');
  assert.deepEqual(invalid,EMPTY_FILTERS);
});
test('데이터 ID, 부대 참조, 지원계급, 출처와 대략 위치 상태',()=>{
  const ids=new Set(data.units.map(u=>u.id));
  assert.equal(ids.size,28);
  assert.equal(new Set(data.positions.map(p=>p.id)).size,data.positions.length);
  for (const unit of data.units) {
    assert(unit.coordinates.every(Number.isFinite));
    assert(unit.coordinates[0]>33 && unit.coordinates[0]<39);
    assert(unit.coordinates[1]>124 && unit.coordinates[1]<131);
    assert.equal(unit.locationAccuracy,'regional');
    assert(data.positions.some(p=>p.unitId===unit.id));
  }
  for (const p of data.positions) {
    assert(ids.has(p.unitId));
    assert(p.sourcePage>=13 && p.sourcePage<=39);
    assert(p.title && p.branchRaw && p.quota);
    assert(p.acceptedRanks.every(r=>RANKS.includes(r)));
  }
  assert.equal(data.notice.dateStatus,'review');
});
