export function getWorkspaceId(){ const p=new URLSearchParams(window.top.location.search); return p.get('AppID'); }
