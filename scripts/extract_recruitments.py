"""Build the scoped recruitment dataset from the supplied public PDF.

Run: uv run --with pdfplumber python scripts/extract_recruitments.py
Keeps original branch/rank text and PDF pages. Coordinates are explicitly approximate.
"""
from pathlib import Path
import json
import re
import shutil
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
SOURCE = next(ROOT.glob('*.pdf'), ROOT / 'public' / 'data' / 'recruitment-2027.pdf')
OUT = ROOT / 'public' / 'data'
OUT.mkdir(parents=True, exist_ok=True)

def clean(value):
    return re.sub(r'\s+', ' ', value or '').strip()

# Regional representative coordinates, not surveyed base/entrance coordinates.
REGIONS = {
    '경기 고양시': [37.6584, 126.8320], '경기 가평군': [37.8315, 127.5096],
    '경기 양주시': [37.7853, 127.0458], '경기 남양주시': [37.6360, 127.2165],
    '광주 북구': [35.1741, 126.9119], '세종 연서면': [36.5930, 127.2716],
    '전북 완주군': [35.9047, 127.1621], '충북 증평군': [36.7853, 127.5816],
    '경북 안동시': [36.5684, 128.7294], '경기 화성시': [37.1995, 126.8312],
    '경기 안양시': [37.3943, 126.9568], '부산 해운대구': [35.1631, 129.1636],
    '서울 서초구': [37.4837, 127.0324], '세종 금남면': [36.4648, 127.2806],
    '전북 임실군': [35.6178, 127.2892], '강원 원주시': [37.3422, 127.9202],
    '경남 함안군': [35.2725, 128.4065], '대구 북구': [35.8858, 128.5828],
    '서울 관악구': [37.4782, 126.9515], '경기 용인시': [37.2411, 127.1776],
    '서울 은평구': [37.6027, 126.9291],
}

MOBILIZATION = [
    (60, '경기 고양시', '02-350-6309', 400),
    (66, '경기 가평군', '031-580-6705', 270),
    (72, '경기 양주시', '031-869-7935', 370),
    (73, '경기 남양주시', '031-595-3113', 370),
    (75, '경기 남양주시', '031-528-7110', 350),
]
SUPPORT = [
    (31, '광주 북구', '062-260-6731', 180), (32, '세종 연서면', '042-829-6731', 160),
    (35, '전북 완주군', '063-640-9731', 180), (37, '충북 증평군', '043-835-6831', 150),
    (50, '경북 안동시', '053-320-6921', 120), (51, '경기 화성시', '031-290-9962', 160),
    (52, '경기 안양시', '02-801-6379', 210), (53, '부산 해운대구', '051-730-7015', 220),
    (55, '경기 남양주시', '031-329-6731', 120), (56, '경기 남양주시', '02-380-6843', 120),
]
# Regional division pins are grouped representatives by user instruction. Their
# subordinate postings can be in different municipalities; source groups remain visible.
REGIONAL = [
    (31, '광주 북구', '062-260-6773', 6), (32, '세종 금남면', '042-829-6465', 6),
    (35, '전북 임실군', '063-633-8113', 6), (36, '강원 원주시', '033-736-7202', 7),
    (37, '충북 증평군', '043-835-7503', 7), (39, '경남 함안군', '055-259-6479', 7),
    (50, '대구 북구', '053-320-6468', 7), (51, '경기 화성시', '031-290-9065', 7),
    (52, '서울 관악구', '02-577-8113', 8), (53, '부산 해운대구', '051-701-3441', 8),
    (55, '경기 용인시', '031-329-6804', 8), (56, '서울 은평구', '02-382-8113', 8),
]

units = []
for kind, entries in [('동원사단', MOBILIZATION), ('동원지원단', SUPPORT), ('지역방위사단', REGIONAL)]:
    for entry in entries:
        n, region, phone, fourth = entry
        prefix = 'support' if kind == '동원지원단' else 'division'
        units.append({
            'id': f'{prefix}-{n}', 'name': f'{n}동원지원단' if prefix == 'support' else f'{n}보병사단',
            'shortName': f'{n}동지단' if prefix == 'support' else f'{n}사단', 'kind': kind,
            'region': region, 'coordinates': REGIONS[region], 'locationAccuracy': 'regional',
            'locationLabel': '상위 부대 권역 기준 대략 위치',
            'phone': phone, 'phoneNote': '공고 내 해당 부대 또는 예하 모집부대 문의처',
            'sourcePage': fourth if kind == '지역방위사단' else 2,
            'capacity': None if kind == '지역방위사단' else fourth,
            'directionsUrl': None, 'officialAddress': None,
        })

units.append({'id':'escort', 'name':'동원자원호송단', 'shortName':'호송단', 'kind':'동원지원단',
    'region':'서울 서초구', 'coordinates':REGIONS['서울 서초구'], 'locationAccuracy':'regional',
    'locationLabel':'모집 지역 기준 대략 위치', 'phone':'02-897-5201',
    'phoneNote':'공고 내 모집 문의처', 'sourcePage':2, 'capacity':220,
    'directionsUrl':None, 'officialAddress':None})

for n, code, address in [
    (60, 'mma0002102', None),
    (66, 'mma0002104', '경기 가평군 가평읍 각담말길 39'),
    (72, 'mma0002106', '경기 양주시 장흥면 부곡리 산 6-17'),
    (73, 'mma0002107', None),
    (75, 'mma0002108', '경기 남양주시 진접읍 진벌리'),
]:
    unit = next(u for u in units if u['id'] == f'division-{n}')
    unit['directionsUrl'] = f'https://www.mma.go.kr/seoul/contents.do?mc={code}'
    unit['officialAddress'] = address

# A public HQ address published by Namyangju city; approximate pin remains marked.
next(u for u in units if u['id']=='division-73')['officialAddress'] = '경기 남양주시 홍유릉로 101'

rank_pattern = re.compile('중령|소령|대위|중위|소위|준위|원사|상사|중사|하사|병장')
aliases = {'통신':'정보통신', '소총':'보병', '박격포':'보병', '특전보병':'보병',
           '중형차량':'수송', '대형차량':'수송', '인사':'인사행정'}
specialties = {'소총':'일반보병', '박격포':'박격포', '특전보병':'특전보병',
               '중형차량':'중형차량운전', '대형차량':'대형차량운전'}
common_branches = {'공통', '전투공통', '군수공통'}
positions = []
audit = {'sourceRows':0, 'reviewRows':[], 'excludedPages':list(range(23,30)),
         'scope':'동원사단·동원지원단·동원자원호송단·지역방위사단, 상위 부대 수준'}

def targets(page, table_index, groups):
    group = ''.join(groups).replace(' ', '')
    if 13 <= page <= 16:
        ids = [f'division-{n}' for n, *_ in MOBILIZATION]
        # 73 division has separate A/B infantry-battalion pilot tables, p.17–18.
        if '보병대대' in group:
            ids.remove('division-73')
        return ids
    if page in (17,18): return ['division-73']
    if page == 19: return [f'support-{n}' for n in [31,32,35,37,50,52,53]]
    if page in (20,21):
        return [f'support-{n}' for n in ([51,52,55] if '포병' in group else [56])]
    if page == 22: return ['support-51'] if table_index == 0 else ['escort']
    mapping = {30:[31],31:[32],32:[32,35,36],33:[36,37],34:[39],35:[50],
               36:[51,52,53],37:[53,55],38:[55],39:[55,56]}
    return [f'division-{mapping[page][table_index]}']

with pdfplumber.open(SOURCE) as pdf:
    for page in list(range(13,23)) + list(range(30,40)):
        for ti, table in enumerate(pdf.pages[page-1].extract_tables()):
            groups = [''] * (len(table[0])-5)
            last_branch = ''
            for ri, row in enumerate(table[2:],start=3):
                if len(row)<6: continue
                for gi, value in enumerate(row[:-5]):
                    if value is not None:
                        normalized = clean(value)
                        if normalized != groups[gi]:
                            for child in range(gi+1,len(groups)): groups[child]=''
                        groups[gi] = normalized
                title, branch, target_rank, accepted_raw, quota = [clean(x) for x in row[-5:]]
                if not title: continue
                if branch: last_branch=branch
                else: branch=last_branch
                accepted = list(dict.fromkeys(rank_pattern.findall(accepted_raw)))
                reasons=[]
                if not branch: reasons.append('병과 확인 필요')
                if not accepted: reasons.append('지원가능계급 확인 필요')
                if re.search(r',\s*$',accepted_raw): reasons.append('지원가능계급 원문 누락')
                target_found=rank_pattern.findall(target_rank)
                if accepted and target_found:
                    categories=lambda ranks:{'officer' if r in ['소위','중위','대위','소령','중령'] else 'warrant' if r=='준위' else 'soldier' if r=='병장' else 'nco' for r in ranks}
                    if 'officer' in categories(target_found) and categories(accepted).isdisjoint({'officer'}):
                        reasons.append('선발계급과 지원가능계급 원문 상충')
                audit['sourceRows']+=1
                if reasons: audit['reviewRows'].append({'page':page,'row':ri,'title':title,'reasons':reasons})
                for uid in targets(page,ti,groups):
                    positions.append({'id':f'{uid}-p{page}-t{ti}-r{ri}', 'unitId':uid,
                        'title':title, 'group':' · '.join(g for g in groups if g),
                        'branch':aliases.get(branch,branch), 'branchRaw':branch,
                        'specialty':specialties.get(branch), 'targetRank':target_rank,
                        'acceptedRanks':accepted,'acceptedRanksRaw':accepted_raw,
                        'quota':quota, 'sourcePage':page,
                        'status':'review' if reasons else 'parsed', 'reviewReasons':reasons,
                        'commonBranch':branch in common_branches,
                        'pilotType':('A유형' if page==17 else 'B유형') if page in (17,18) else None,
                        'approximate': any('여단' in g or '대대' in g for g in groups)})

dataset = {'notice':{'title':'2027 육군 단기 상비예비군 정기모집', 'publishedAt':'2026-10-23',
    'serviceYear':2027, 'checkedAt':'2026-10-28', 'sourceUrl':'/data/recruitment-2027.pdf',
    'applicationUrl':'https://www.yebigun1.mil.kr/', 'dateStatus':'review',
    'dateNote':'공고 11쪽의 접수 종료연도가 시작연도와 달라 공식 확인이 필요합니다.',
    'scopeNote':'동원사단·동원지원단·지역방위사단과 동원자원호송단을 제공합니다. 군단·군수·민사 등 기타 모집은 현재 범위에 포함하지 않습니다.',
    'locationNote':'사단·동원지원단 단위의 대략 위치입니다. 여단·대대 직책도 상위 부대 권역으로 묶어 표시합니다. 실제 근무지·집결지는 모집부대에 확인하세요.'},
    'units':units, 'positions':positions}
(OUT/'recruitments.json').write_text(json.dumps(dataset,ensure_ascii=False,separators=(',',':')))
(OUT/'extraction-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
if SOURCE.resolve() != (OUT/'recruitment-2027.pdf').resolve():
    shutil.copyfile(SOURCE, OUT/'recruitment-2027.pdf')
print(json.dumps({'units':len(units),'sourceRows':audit['sourceRows'],'positions':len(positions),
                  'reviewRows':audit['reviewRows']},ensure_ascii=False,indent=2))
