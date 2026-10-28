import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BRANCHES, EMPTY_FILTERS, evaluate, filtersToSearch, RANKS, readFilters, searchUnits, SPECIALTIES } from './eligibility.ts';
import type { Filters, RecruitmentData, UnitResult } from './types.ts';
import Icon from './Icon.tsx';
import MapView from './MapView.tsx';

function SourceLink({ data, page, children, className = '' }: { data: RecruitmentData; page: number; children: React.ReactNode; className?: string }) {
  return <a className={className} href={`${import.meta.env.BASE_URL}${data.notice.sourceUrl.replace(/^\//, '')}#page=${page}`} target="_blank" rel="noreferrer">{children}<Icon name="external" size={13}/></a>;
}

function UnitDetail({ result, data, filters, onClose }: { result: UnitResult; data: RecruitmentData; filters: Filters; onClose: () => void }) {
  const [tab, setTab] = useState<'matched'|'review'>('matched');
  const [roleQuery, setRoleQuery] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const { unit } = result;
  useEffect(()=>{setTab(result.positions.length ? 'matched':'review');setRoleQuery('');heading.current?.focus({preventScroll:true});},[unit.id]);
  const review = useMemo(()=>data.positions.filter(p=>p.unitId===unit.id).map(position=>({position,match:evaluate(position,filters)})).filter(p=>p.match.type==='review'),[data,unit.id,filters]);
  const entries = (tab==='matched' ? result.positions : review).filter(p=>`${p.position.title}${p.position.branch}${p.position.group}`.includes(roleQuery));
  const mapSearch = `https://map.naver.com/p/search/${encodeURIComponent(unit.officialAddress || unit.name)}`;
  return <section className="detail-panel" aria-label={`${unit.name} 모집 상세`}>
    <div className="detail-toolbar"><button className="text-button back-button" onClick={onClose}><Icon name="back" size={18}/>모집부대 목록</button><button className="icon-button" aria-label="부대 상세 닫기" onClick={onClose}><Icon name="close"/></button></div>
    <div className="detail-intro">
      <div className="eyebrow"><span className={`kind-dot ${unit.kind==='동원지원단'?'support-dot':''}`}/>{unit.kind}<span className="approx-tag">대략 위치</span></div>
      <h2 ref={heading} tabIndex={-1}>{unit.name}</h2>
      <p className="unit-region"><Icon name="pin" size={16}/>{unit.region} 권역</p>
      <p className="detail-description">사단·지원단 수준으로 묶어 표시합니다.<br/>여단·대대의 실제 근무지는 다를 수 있습니다.</p>
      <div className="detail-actions">
        <a className="button primary" href={mapSearch} target="_blank" rel="noreferrer">네이버 지도<Icon name="external" size={15}/></a>
        <a className="button secondary" href={`tel:${unit.phone}`}><Icon name="phone" size={16}/>모집 문의</a>
      </div>
      <div className="contact-line"><span>{unit.phone}</span><SourceLink data={data} page={unit.sourcePage}>공고 부대 정보</SourceLink></div>
      {unit.directionsUrl && <a className="directions-link" href={unit.directionsUrl} target="_blank" rel="noreferrer"><Icon name="arrow" size={16}/><span>공식 동원훈련장 찾아가는 길</span><Icon name="external" size={13}/></a>}
      {unit.officialAddress && <p className="address-note">공개 안내 주소: {unit.officialAddress}<br/><span>참고 주소이며, 선택 직책의 집결지는 별도 확인하세요.</span></p>}
    </div>
    <div className="detail-tabs" role="tablist" aria-label="직책 조건 구분">
      <button role="tab" id="matched-tab" aria-selected={tab==='matched'} aria-controls="roles-panel" onClick={()=>setTab('matched')}>조건 일치 <span>{result.positions.length}</span></button>
      <button role="tab" id="review-tab" aria-selected={tab==='review'} aria-controls="roles-panel" onClick={()=>setTab('review')}>추가 확인 <span>{review.length}</span></button>
    </div>
    <div className="role-search"><Icon name="search" size={16}/><input value={roleQuery} onChange={e=>setRoleQuery(e.target.value)} placeholder="이 부대의 직책 찾기" aria-label="이 부대의 직책 찾기"/>{roleQuery && <button className="icon-button" aria-label="직책 검색 초기화" onClick={()=>setRoleQuery('')}><Icon name="close" size={15}/></button>}</div>
    <div className="roles-list" id="roles-panel" role="tabpanel" aria-labelledby={tab==='matched'?'matched-tab':'review-tab'}>
      {entries.length===0 ? <div className="inline-empty"><Icon name="search" size={26}/><p>{tab==='review' ? '추가 확인할 직책이 없습니다.':'이 조건에 맞는 직책이 없습니다.'}</p>{roleQuery && <button className="text-button" onClick={()=>setRoleQuery('')}>직책 검색 초기화</button>}</div> : entries.map(({position,match})=><details className="position-row" key={position.id}>
        <summary><div><div className="role-meta"><span>{position.branchRaw}</span><span>{position.quota}</span>{position.pilotType && <span>{position.pilotType}</span>}</div><h3>{position.title}</h3><p className="group-line" title={position.group}>{position.group}</p><div className="accepted-ranks">지원계급 <span>{position.acceptedRanks.join(' · ') || '확인 필요'}</span></div></div><Icon name="down" size={16}/></summary>
        <div className="position-expanded"><div className={`match-reason ${match.type}`}><Icon name={match.type==='review'?'info':'check'} size={15}/><span>{match.reason}</span></div><dl><div><dt>선발계급</dt><dd>{position.targetRank}</dd></div><div><dt>지원가능 원문</dt><dd>{position.acceptedRanksRaw}</dd></div><div><dt>모집인원 표기</dt><dd>{position.quota}</dd></div></dl><p className="quota-note">인원은 공고의 사단·여단·대대 등 단위별 표기입니다. 직책 항목 수와 실제 선발 인원은 다릅니다.</p><SourceLink data={data} page={position.sourcePage}>공고 {position.sourcePage}쪽에서 확인</SourceLink></div>
      </details>)}
      <div className="eligibility-footnote"><Icon name="info" size={15}/><p>병과·계급 조건 기준입니다. 연령·거주지·보류 상태·소집 참석 등 전체 지원자격은 공고 9~10쪽을 확인하세요.</p></div>
    </div>
    <div className="detail-footer"><a className="button primary" href={data.notice.applicationUrl} target="_blank" rel="noreferrer">공식 예비군 누리집<Icon name="external" size={15}/></a><span>접수 일정은 공식 확인 필요</span></div>
  </section>;
}

export default function App() {
  const [data, setData] = useState<RecruitmentData|null>(null);
  const [error, setError] = useState('');
  const [reloadKey,setReloadKey] = useState(0);
  const [filters,setFilters] = useState<Filters>(()=>readFilters(window.location.search));
  const [selectedId,setSelectedId] = useState<string|null>(null);
  const [fitKey,setFitKey] = useState(0);
  const [mobileExpanded,setMobileExpanded] = useState(false);
  const [advanced,setAdvanced] = useState(false);
  const [shareMessage,setShareMessage] = useState('');
  const [showReview,setShowReview] = useState(false);
  const help = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const wasComplete = useRef(false);

  useEffect(()=>{
    const controller = new AbortController();
    setError('');
    fetch(`${import.meta.env.BASE_URL}data/recruitments.json`,{signal:controller.signal}).then(response=>{
      if (!response.ok) throw new Error('데이터 응답 오류');
      return response.json() as Promise<RecruitmentData>;
    }).then(value=>{
      if (!Array.isArray(value.units) || !Array.isArray(value.positions) || !value.notice) throw new Error('데이터 형식 오류');
      setData(value);
    }).catch(reason=>{if(reason.name!=='AbortError')setError('모집 정보를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.');});
    return ()=>controller.abort();
  },[reloadKey]);

  useEffect(()=>{
    const search=filtersToSearch(filters);
    window.history.replaceState(null,'',`${window.location.pathname}${search ? `?${search}`:''}${window.location.hash}`);
    setShareMessage('');
  },[filters]);
  useEffect(()=>{
    const pop=()=>{setFilters(readFilters(window.location.search));setSelectedId(null);};
    window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);
  },[]);

  const results=useMemo(()=>data ? searchUnits(data,filters):[],[data,filters]);
  const matchedResults=useMemo(()=>results.filter(r=>r.positions.length),[results]);
  const visibleResults=showReview ? results.filter(r=>r.reviewCount):matchedResults;
  const roles=matchedResults.reduce((sum,r)=>sum+r.positions.length,0);
  const reviewCount=results.reduce((sum,r)=>sum+r.reviewCount,0);
  const profileComplete=Boolean(filters.branch && filters.rank);
  const activeCount=[filters.branch,filters.rank,filters.query,filters.kind,filters.region,filters.similar].filter(Boolean).length;
  const selected=results.find(r=>r.unit.id===selectedId);
  const regions=data ? [...new Set(data.units.map(u=>u.region.split(' ')[0]))] : [];

  useEffect(()=>{if(data)setFitKey(v=>v+1);},[data]);

  useEffect(()=>{
    if (selectedId && !results.some(r=>r.unit.id===selectedId)) setSelectedId(null);
    if (list.current) list.current.scrollTop=0;
  },[results,selectedId]);
  useEffect(()=>{
    if (profileComplete && !wasComplete.current) setFitKey(v=>v+1);
    wasComplete.current=profileComplete;
  },[profileComplete]);
  useEffect(()=>{
    function key(event:KeyboardEvent){if(event.key==='Escape') {setSelectedId(null);setMobileExpanded(false);}}
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[]);

  const selectUnit=useCallback((id:string)=>{setSelectedId(id);setMobileExpanded(true);},[]);
  function update<K extends keyof Filters>(key:K,value:Filters[K]) {
    setFilters(previous=>({...previous,[key]:value,...(key==='branch'?{specialty:''}:{})}));
    setShowReview(false);setSelectedId(null);
  }
  function reset() {setFilters({...EMPTY_FILTERS});setShowReview(false);setSelectedId(null);setFitKey(v=>v+1);}
  async function share() {
    try {await navigator.clipboard.writeText(window.location.href);setShareMessage('현재 검색 조건의 주소를 복사했습니다.');}
    catch {setShareMessage('주소를 복사하지 못했습니다. 주소창의 링크를 복사해 주세요.');}
  }

  return <main className={`app-shell${selected?' has-detail':''}${mobileExpanded?' sheet-expanded':''}`}>
    <a className="skip-link" href="#recruitment-results">모집부대 목록으로 건너뛰기</a>
    <MapView results={matchedResults} selectedId={selectedId} onSelect={selectUnit} fitKey={fitKey} onFit={()=>setFitKey(v=>v+1)}/>
    <aside className="explore-panel" aria-label="상비예비군 검색">
      <div className="brand-row"><a className="brand" href={import.meta.env.BASE_URL} onClick={e=>{e.preventDefault();reset();}} aria-label="예비지도 검색 초기화"><span className="brand-symbol"><Icon name="pin" size={24}/></span><span>예비지도<span className="brand-caption">상비예비군 모집 지도</span></span></a><div className="brand-actions"><button className="icon-button" title="검색 조건 공유" aria-label="검색 조건 공유" onClick={share}><Icon name="share" size={18}/></button><button className="icon-button" title="이용 안내" aria-label="이용 안내" onClick={()=>help.current?.showModal()}><Icon name="info" size={19}/></button></div></div>
      <div className="mobile-grabber" aria-hidden="true"/>
      <button className="sheet-toggle" onClick={()=>setMobileExpanded(v=>!v)} aria-expanded={mobileExpanded} aria-label={mobileExpanded?'모집 목록 접기':'모집 목록 펼치기'}><span><Icon name="list" size={17}/>{selected ? selected.unit.name:`${matchedResults.length}개 모집부대`}</span><Icon name="down" size={17}/></button>
      <div className="search-intro"><span className="year-label">2027 정기모집</span><h1>내 조건에 맞는<br/>모집부대를 찾아보세요.</h1><p>병과와 전역계급으로, 지도에서 한눈에.</p></div>
      <div className="filter-section">
        <div className="profile-fields"><label><span>내 병과</span><div className="select-wrap"><select aria-label="내 병과" value={filters.branch} onChange={e=>update('branch',e.target.value)}><option value="">병과 선택</option>{BRANCHES.map(branch=><option key={branch}>{branch}</option>)}</select><Icon name="down" size={15}/></div></label><label><span>전역계급</span><div className="select-wrap"><select aria-label="전역계급" value={filters.rank} onChange={e=>update('rank',e.target.value)}><option value="">계급 선택</option>{RANKS.map(rank=><option key={rank}>{rank}</option>)}</select><Icon name="down" size={15}/></div></label></div>
        {filters.branch && SPECIALTIES[filters.branch] && <label className="specialty-field"><span>세부 특기 <span className="optional">선택 사항</span></span><div className="select-wrap"><select aria-label="세부 특기" value={filters.specialty} onChange={e=>update('specialty',e.target.value)}><option value="">특기 미선택</option>{SPECIALTIES[filters.branch].map(s=><option key={s}>{s}</option>)}</select><Icon name="down" size={15}/></div></label>}
        <div className="filter-options"><label className="switch-label"><input type="checkbox" checked={filters.similar} onChange={e=>update('similar',e.target.checked)}/><span className="switch-track" aria-hidden="true"/><span>유사 병과 포함</span></label><button className={`text-button advanced-toggle${advanced?' is-active':''}`} aria-expanded={advanced} onClick={()=>setAdvanced(v=>!v)}><Icon name="filter" size={14}/>지역·유형</button></div>
        {advanced && <div className="advanced-fields"><label><span>지역</span><div className="select-wrap"><select aria-label="지역" value={filters.region} onChange={e=>update('region',e.target.value)}><option value="">전국</option>{regions.map(r=><option key={r}>{r}</option>)}</select><Icon name="down" size={14}/></div></label><label><span>부대 유형</span><div className="select-wrap"><select aria-label="부대 유형" value={filters.kind} onChange={e=>update('kind',e.target.value)}><option value="">전체 유형</option>{['동원사단','동원지원단','지역방위사단'].map(k=><option key={k}>{k}</option>)}</select><Icon name="down" size={14}/></div></label></div>}
        <div className={`profile-hint${profileComplete?' complete':''}`}><Icon name={profileComplete?'check':'info'} size={14}/><span>{profileComplete ? `${filters.branch} · ${filters.rank} 기준으로 표시 중`:'병과·계급 선택 전에는 전체 모집을 표시합니다.'}</span></div>
      </div>
      <div className="unit-search"><Icon name="search" size={17}/><input aria-label="부대·지역·직책 검색" placeholder="부대, 지역 또는 직책 검색" value={filters.query} onChange={e=>update('query',e.target.value)} maxLength={100}/>{filters.query && <button className="icon-button" aria-label="부대 검색 지우기" onClick={()=>update('query','')}><Icon name="close" size={15}/></button>}</div>
      <div className="results-heading" id="recruitment-results" tabIndex={-1}><div><h2>{showReview?'추가 확인할 부대':'모집부대'} <span>{visibleResults.length}</span></h2><span className="result-role-count">{showReview?reviewCount:roles}개 직책 항목</span></div><button className="text-button reset-button" onClick={reset} disabled={!activeCount && !showReview}><Icon name="reset" size={13}/>초기화</button></div>
      {reviewCount>0 && profileComplete && <button className={`review-link${showReview?' is-active':''}`} onClick={()=>setShowReview(v=>!v)}><Icon name={showReview?'back':'info'} size={13}/>{showReview?'조건 일치 목록으로 돌아가기':`추가 조건 확인이 필요한 직책 ${reviewCount}개`}<Icon name="chevron" size={12}/></button>}
      <div className="unit-results" ref={list} aria-busy={!data && !error}>
        {!data && !error && <div className="loading-state" role="status"><span className="spinner"/><p>공고에서 모집부대를 불러오고 있습니다.</p>{[0,1,2].map(i=><div className="skeleton-row" key={i}/>)}</div>}
        {error && <div className="empty-state" role="alert"><span className="empty-icon"><Icon name="info" size={27}/></span><h3>모집 정보를 불러오지 못했어요.</h3><p>{error}</p><button className="button secondary" onClick={()=>setReloadKey(v=>v+1)}>다시 불러오기</button></div>}
        {data && visibleResults.length===0 && <div className="empty-state"><span className="empty-icon"><Icon name="search" size={27}/></span><h3>이 조건에 맞는 부대가 없어요.</h3><p>지역·직책 검색을 바꾸거나<br/>유사 병과 지원도 확인해 보세요.</p>{!filters.similar && <button className="button secondary" onClick={()=>update('similar',true)}>유사 병과 포함하기</button>}<button className="text-button" onClick={reset}>검색 조건 초기화</button></div>}
        {visibleResults.map((result,index)=><button className={`unit-row${selectedId===result.unit.id?' is-selected':''}`} key={result.unit.id} onClick={()=>selectUnit(result.unit.id)} aria-pressed={selectedId===result.unit.id}>
          <span className="unit-order">{String(index+1).padStart(2,'0')}</span><span className="unit-content"><span className="unit-type">{result.unit.kind}<span className="row-region">{result.unit.region}</span></span><span className="unit-name">{result.unit.name}</span><span className="unit-preview">{showReview?'추가 조건을 확인해 주세요.':result.positions.slice(0,2).map(p=>p.position.title).join(' · ')}</span><span className="unit-bottom"><span className={showReview?'review-result':'match-count'}>{profileComplete && !showReview && <Icon name="check" size={12}/>}직책 {showReview?result.reviewCount:result.positions.length}개</span>{result.positions.some(p=>p.match.type==='similar') && <span className="similar-label">유사 지원 포함</span>}<span className="approx-label">대략 위치</span></span></span><span className="row-chevron"><Icon name="chevron" size={16}/></span>
        </button>)}
      </div>
      <div className="panel-footer"><span>육군 공고 기준 · 2026.10.23.</span>{data && <SourceLink data={data} page={1}>원문 보기</SourceLink>}</div>
    </aside>
    {selected && data && <UnitDetail result={selected} data={data} filters={filters} onClose={()=>setSelectedId(null)}/>}
    <div className="sr-only" role="status" aria-live="polite">{data ? `${matchedResults.length}개 부대, ${roles}개 직책 항목${profileComplete?', 병과·계급 조건 기준':''}`:'모집 정보 불러오는 중'}</div>
    {shareMessage && <div className="feedback-message" role="status"><Icon name="check" size={16}/>{shareMessage}<button className="icon-button" onClick={()=>setShareMessage('')} aria-label="공유 안내 닫기"><Icon name="close" size={15}/></button></div>}
    <dialog ref={help} className="help-dialog" onClick={e=>{if(e.target===e.currentTarget)help.current?.close();}}>
      <div className="dialog-heading"><span className="brand-symbol"><Icon name="pin" size={24}/></span><button className="icon-button" aria-label="이용 안내 닫기" onClick={()=>help.current?.close()}><Icon name="close"/></button></div>
      <h2>지도의 기준을 알려드려요.</h2><p className="dialog-lede">공고의 지원 조건과 위치를 함께 살펴보는<br/>상비예비군 모집 탐색 도구입니다.</p>
      <div className="help-item"><Icon name="pin"/><div><h3>사단·지원단 단위의 대략 위치</h3><p>{data?.notice.locationNote}</p></div></div>
      <div className="help-item"><Icon name="filter"/><div><h3>병과·지원가능계급으로 비교</h3><p>선발계급 대신 공고의 ‘지원가능’ 계급을 사용합니다. 연령·거주지·보류 상태·훈련 참석 조건은 별도로 확인하세요. 유사 지원은 확인된 장교 병과 및 일부 부사관 특기 규칙에 한해 표시합니다.</p></div></div>
      <div className="help-item"><Icon name="layers"/><div><h3>현재 제공하는 모집 범위</h3><p>{data?.notice.scopeNote} 원문 표를 추출해 상위 부대에 연결한 항목이며, 실제 선발 인원 합계가 아닙니다.</p></div></div>
      <div className="date-notice"><Icon name="clock" size={18}/><div><strong>접수 종료일은 공식 확인이 필요해요.</strong><p>{data?.notice.dateNote} 이 지도는 현재 접수 중임을 보장하지 않습니다.</p></div></div>
      {data && <div className="dialog-links"><SourceLink data={data} page={9}>지원자격 원문</SourceLink><SourceLink data={data} page={11}>접수 일정 원문</SourceLink><a href={data.notice.applicationUrl} target="_blank" rel="noreferrer">공식 예비군 누리집<Icon name="external" size={13}/></a></div>}
    </dialog>
  </main>;
}
