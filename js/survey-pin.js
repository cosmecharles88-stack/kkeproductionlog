export function validPin(point) {
  return point.lat !== '' && point.lng !== '' && point.lat != null && point.lng != null &&
    Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)) &&
    Math.abs(Number(point.lat)) <= 90 && Math.abs(Number(point.lng)) <= 180;
}

export function confirmedPin(point, position, adjusted) {
  const result = {...point, lat: Number(position.lat).toFixed(6), lng: Number(position.lng).toFixed(6),
    confirmedAt: new Date().toISOString(), source: adjusted ? 'map-adjusted' : (point.source || 'map-confirmed')};
  if (adjusted) {
    result.originalGps = point.originalGps || (point.source === 'device-gps' ? {lat:point.lat,lng:point.lng,accuracy:point.accuracy??null,capturedAt:point.capturedAt??null} : null);
    delete result.accuracy;
  }
  return result;
}

export function reviewSurveyPin(point, label) {
  return new Promise(resolve => {
    if (!validPin(point)) { resolve(null); return; }
    const dialog = document.createElement('dialog');
    dialog.style.cssText = 'width:min(92vw,760px);max-height:94dvh;padding:18px;border:1px solid #cbd5e1;border-radius:14px;overflow:auto';
    dialog.innerHTML = '<h3></h3><p data-help></p><div data-map style="height: min(48dvh,420px);min-height:240px;border-radius:8px;background:#eef2f6"></div><p data-status role="status"></p><div style="display:flex;gap:12px;flex-wrap:wrap"><button type="button" data-confirm disabled style="min-height:48px">Confirm this spot</button><button type="button" data-cancel style="min-height:48px">Cancel</button></div><p><small>Satellite imagery can be offset or outdated. Check road features before confirming. Save the survey afterward to keep this point.</small></p>';
    dialog.querySelector('h3').textContent = 'Check ' + label + ' location';
    dialog.querySelector('[data-help]').textContent = point.accuracy != null ?
      `Phone accuracy: ±${point.accuracy} m.${point.accuracy > 10 ? ' Weak for marking a work area.' : ''} Tap the correct spot or drag the pin onto the road.` :
      'Tap the correct spot or drag the pin onto the road. Manual placement does not provide a measured GPS accuracy.';
    let marker, map, circle, closed = false, adjusted = false;
    let position = {lat:Number(point.lat),lng:Number(point.lng)};
    const status = dialog.querySelector('[data-status]');
    const update = () => { status.textContent = `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}${adjusted ? ' · Pin adjusted manually' : ' · Suggested location'}`; };
    const finish = value => {
      if (closed) return;
      closed = true;
      if (marker) { window.google.maps.event.clearInstanceListeners(marker); marker.setMap(null); }
      if (map) window.google.maps.event.clearInstanceListeners(map);
      circle?.setMap(null);
      dialog.close(); dialog.remove(); resolve(value);
    };
    dialog.querySelector('[data-cancel]').onclick = () => finish(null);
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
    dialog.querySelector('[data-confirm]').onclick = () => finish(confirmedPin(point,position,adjusted));
    document.body.append(dialog); dialog.showModal();
    update();
    try {
      const maps = window.google?.maps;
      if (!maps?.Map || !maps?.Marker) throw new Error('Map unavailable');
      map = new maps.Map(dialog.querySelector('[data-map]'), { center:position,zoom:19,mapTypeId:'hybrid',streetViewControl:false,fullscreenControl:false,gestureHandling:'greedy' });
      marker = new maps.Marker({map,position,draggable:true,title:label+' work-area pin'});
      if (point.accuracy > 0) circle = new maps.Circle({map,center:position,radius:point.accuracy,fillColor:'#2563eb',fillOpacity:0.1,strokeColor:'#2563eb',strokeWeight:1,clickable:false});
      const move = latLng => { if (!latLng || closed) return; position = {lat:latLng.lat(),lng:latLng.lng()}; adjusted = true;marker.setPosition(position);update(); };
      map.addListener('click', event => move(event.latLng));
      marker.addListener('dragend', event => move(event.latLng));
      dialog.querySelector('[data-confirm]').disabled = false;
    } catch {
      status.textContent = 'The map could not open. Cancel and try again when the map has loaded. Your saved point has not changed.';
    }
  });
}
