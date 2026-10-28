import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { UnitResult } from './types.ts';
import Icon from './Icon.tsx';

interface Props {
  results: UnitResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  fitKey: number;
  onFit: () => void;
}

export default function MapView({ results, selectedId, onSelect, fitKey, onFit }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const current = useRef({ results, selectedId, onSelect });
  current.current = { results, selectedId, onSelect };
  const [tileError, setTileError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');
  const userLocation = useRef<L.CircleMarker | null>(null);
  const tileLayer = useRef<L.TileLayer | null>(null);

  function fit() {
    const instance = map.current;
    if (!instance) return;
    const points = current.current.results.filter(r => r.positions.length).map(r => r.unit.coordinates);
    const bounds = points.length ? L.latLngBounds(points) : L.latLngBounds([[34.7,126.2],[38.1,129.5]]);
    const mobile = window.innerWidth < 800;
    instance.fitBounds(bounds, {
      paddingTopLeft: mobile ? [35,105] : [430,100],
      paddingBottomRight: mobile ? [35,Math.min(window.innerHeight * .48,370)] : [90,90],
      maxZoom: 10, animate: false,
    });
  }

  useEffect(() => {
    if (!host.current) return;
    const instance = L.map(host.current, { zoomControl: false, minZoom: 6, maxZoom: 17, scrollWheelZoom: true, zoomSnap: .5, attributionControl: true });
    map.current = instance;
    instance.attributionControl.setPrefix(false);
    // Standard browser caching/referrer behavior and visible attribution are retained.
    const tiles = L.tileLayer(import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      keepBuffer: 2,
    }).addTo(instance);
    tileLayer.current = tiles;
    let failures = 0;
    tiles.on('tileerror', () => { if (++failures >= 3) setTileError(true); });
    tiles.on('tileload', () => { failures = 0; setTileError(false); });
    markers.current = L.layerGroup().addTo(instance);
    fit();
    let mobile = window.innerWidth < 800;
    const observer = new ResizeObserver(() => {
      instance.invalidateSize({ animate: false });
      if (mobile !== (window.innerWidth < 800)) { mobile = !mobile; fit(); }
    });
    observer.observe(host.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, []);

  useEffect(() => { fit(); }, [fitKey]);

  useEffect(() => {
    const instance = map.current;
    const layer = markers.current;
    if (!instance || !layer) return;
    function draw() {
      layer!.clearLayers();
      const groups: UnitResult[][] = [];
      // ponytail: 28 markers; simple screen-distance grouping avoids a clustering
      // dependency. Replace with a spatial index if thousands of units are added.
      for (const result of results.filter(r => r.positions.length)) {
        const point = instance!.latLngToLayerPoint(result.unit.coordinates);
        const existing = groups.find(group => instance!.latLngToLayerPoint(group[0].unit.coordinates).distanceTo(point) < 72);
        if (existing) existing.push(result); else groups.push([result]);
      }
      for (const group of groups) {
        const selected = group.some(r => r.unit.id === selectedId);
        const shell = document.createElement('div');
        shell.className = `map-pin${selected ? ' is-selected' : ''}${group.length > 1 ? ' is-cluster' : ''}`;
        const label = document.createElement('span');
        label.className = 'map-pin-label';
        label.textContent = group.length > 1 ? `${group.length}개 모집부대` : group[0].unit.shortName;
        const count = document.createElement('b');
        count.textContent = String(group.reduce((sum,r) => sum+r.positions.length,0));
        shell.append(label,count);
        const marker = L.marker(group[0].unit.coordinates, {
          icon:L.divIcon({html:shell,className:'unit-map-marker',iconSize:undefined,iconAnchor:[40,20]}),
          keyboard:true, title:group.map(r=>r.unit.name).join(', '), alt:group.map(r=>`${r.unit.name} 직책 ${r.positions.length}개`).join(', '),
          riseOnHover:true,zIndexOffset:selected ? 1000 : 0,
        }).addTo(layer!);
        if (group.length === 1) marker.on('click',()=>onSelect(group[0].unit.id));
        else {
          const content = document.createElement('div');
          content.className='cluster-list';
          const heading = document.createElement('p');
          heading.textContent='이 근처 모집부대';
          content.append(heading);
          for (const result of group) {
            const button=document.createElement('button');
            button.type='button';
            button.textContent=`${result.unit.name} · ${result.positions.length}개 직책`;
            button.addEventListener('click',()=>{onSelect(result.unit.id);instance!.closePopup();});
            content.append(button);
          }
          marker.bindPopup(content,{maxWidth:280,className:'unit-cluster-popup'});
        }
      }
    }
    draw();
    instance.on('zoomend moveend',draw);
    return ()=>{instance.off('zoomend moveend',draw);layer.clearLayers();};
  },[results,selectedId,onSelect]);

  useEffect(()=>{
    const selected=results.find(r=>r.unit.id===selectedId);
    if (!selected || !map.current) return;
    const instance=map.current;
    const mobile=window.innerWidth<800;
    const zoom=Math.max(instance.getZoom(),10);
    const point=instance.project(selected.unit.coordinates,zoom);
    // Keep the selected marker in the visible map beside/before the overlay panels.
    const offset=mobile ? L.point(0,window.innerHeight*.17) : L.point(-300,0);
    instance.setView(instance.unproject(point.add(offset),zoom),zoom,{animate:!window.matchMedia('(prefers-reduced-motion: reduce)').matches});
  },[selectedId]);

  function locate() {
    if (!navigator.geolocation) { setMessage('이 브라우저에서 현재 위치를 지원하지 않습니다.');return; }
    setLocating(true);setMessage('현재 위치를 확인하고 있습니다.');
    navigator.geolocation.getCurrentPosition(position=>{
      setLocating(false);setMessage('현재 위치로 이동했습니다. 위치는 서버에 저장하지 않습니다.');
      const coordinates:L.LatLngExpression=[position.coords.latitude,position.coords.longitude];
      if (!map.current) return;
      userLocation.current?.remove();
      userLocation.current=L.circleMarker(coordinates,{radius:7,className:'user-location',weight:3}).addTo(map.current);
      userLocation.current.bindTooltip('내 위치');map.current.setView(coordinates,10);
    },()=>{setLocating(false);setMessage('위치 권한을 확인해 주세요. 지도를 직접 이동할 수도 있습니다.');},{timeout:10000,maximumAge:60000});
  }

  return <>
    <div ref={host} className="map-canvas" aria-label="상비예비군 모집부대 지도" />
    <div className="map-edition"><span className="edition-dot"/><span>2027 육군</span><span className="edition-divider"/><span className="edition-subtitle">단기 상비예비군</span></div>
    <div className="map-tools">
      <button className="map-tool fit-tool" onClick={onFit} title="검색 결과 전체 보기"><Icon name="layers"/><span>전체 보기</span></button>
      <div className="zoom-tools"><button className="map-tool" aria-label="지도 확대" onClick={()=>map.current?.zoomIn()}><Icon name="plus"/></button><button className="map-tool" aria-label="지도 축소" onClick={()=>map.current?.zoomOut()}><Icon name="minus"/></button></div>
      <button className="map-tool" aria-label="내 위치로 이동" disabled={locating} aria-busy={locating} onClick={locate}>{locating ? <span className="spinner"/>:<Icon name="locate"/>}</button>
    </div>
    <div className="map-legend"><span className="legend-pin"/>모집부대 <span className="legend-separator"/> 숫자는 직책 항목 수 <span className="approx-tag">대략 위치</span></div>
    {tileError && <div className="map-error" role="alert"><Icon name="info"/><span>지도를 불러오지 못했습니다. 목록은 계속 사용할 수 있습니다.</span><button onClick={()=>{setTileError(false);tileLayer.current?.redraw();}}>다시 시도</button></div>}
    {message && <div className="map-message" role="status">{message}<button className="icon-button" aria-label="위치 안내 닫기" onClick={()=>setMessage('')}><Icon name="close" size={16}/></button></div>}
  </>;
}
