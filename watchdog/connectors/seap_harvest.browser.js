// Variant run from the browser console on https://e-licitatie.ro/pub (same API as seap_harvest.py).
// api-pub rejects calls without a Referer (403 "Referrer cannot be null"). Run this from a tab on https://e-licitatie.ro/pub:
// the browser then sends one by itself, and post() also sets it explicitly. From another origin it will not work.
// 1) set CA (the authority's SEAP id; find it with:
//    fetch('/api-pub/ComboPub/searchContractingAuthorities?filter=municipiul%20brasov&pageIndex=0&pageSize=50&parentId=').then(r=>r.json()).then(j=>console.table(j.items))
// 2) run the script; 3) when window.__H.status==='done', copy JSON.stringify({authority:__H.ca,da:__H.da,notices:__H.notices,contracts:__H.contracts,harvested_at:new Date().toISOString()})
const CA = 3289, FROM = "2024-01-01T00:00:00+02:00", TO = new Date().toISOString();
window.__H = { status: 'running', log: [], da: [], notices: [], contracts: [], ca: { seapId: CA } };
(async () => {
  const H = window.__H;
  const post = async (u, b) => { const r = await fetch('https://e-licitatie.ro' + u, { method: 'POST', referrer: 'https://e-licitatie.ro/pub', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(b) }); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // List queries stop at a server-side cap (2,000 DAs, 3,000 notices). Unlike seap_harvest.py, this script does not
  // split the date range: it stops instead of returning a truncated list. Narrow FROM/TO and rerun, or use the .py.
  const checkCap = (what, j, cap) => { if (j.searchTooLong || j.total >= cap) throw new Error(what + ': ' + j.total + ' results hit the ' + cap + ' cap; narrow FROM/TO'); };
  try {
    for (let p = 0; ; p++) {
      const j = await post('/api-pub/DirectAcquisitionCommon/GetDirectAcquisitionList/', { pageSize: 1000, pageIndex: p, showOngoingDa: false, cookieContext: null, sysDirectAcquisitionStateId: null, publicationDateStart: null, publicationDateEnd: null, finalizationDateStart: FROM, finalizationDateEnd: TO, cpvCategoryId: null, contractingAuthorityId: CA, supplierId: null, cpvCodeId: null, assignedUserId: null, isOpenForCorrection: null, sysDirectAcquisitionTypeId: null, directAcquisitionName: null, uniqueIdentificationCode: null });
      checkCap('direct purchases', j, 2000);
      for (const i of j.items) H.da.push({ id: i.directAcquisitionId, code: i.uniqueIdentificationCode, name: i.directAcquisitionName, state: i.sysDirectAcquisitionState?.text, cpv: i.cpvCode, pub: i.publicationDate, fin: i.finalizationDate, supplier: i.supplier, ca: i.contractingAuthority, est: i.estimatedValueRon, val: i.closingValue });
      if (H.da.length >= j.total || !j.items.length) break; await sleep(350);
    }
    for (let p = 0; ; p++) {
      const j = await post('/api-pub/NoticeCommon/GetCANoticeList/', { sysNoticeTypeIds: [], sortProperties: [], pageIndex: p, pageSize: 1000, contractingAuthorityId: CA, startPublicationDate: FROM, endPublicationDate: TO });
      checkCap('award notices', j, 3000);
      for (const i of j.items) H.notices.push({ caNoticeId: i.caNoticeId, noticeId: i.noticeId, procedureId: i.procedureId, noticeNo: i.noticeNo, typeId: i.sysNoticeTypeId, versionId: i.sysNoticeVersionId, state: i.sysNoticeState?.text, procState: i.sysProcedureState?.text, ca: i.contractingAuthorityNameAndFN, title: i.contractTitle, contractType: i.sysAcquisitionContractType?.text, procType: i.sysProcedureType?.text, assignType: i.sysContractAssigmentType?.text, cpv: i.cpvCodeAndName, value: i.ronContractValue, date: i.noticeStateDate, isOnline: i.isOnline, cur: i.currencyCode, est: i.estimatedValueExport });
      if (H.notices.length >= j.total || !j.items.length) break; await sleep(350);
    }
    // All contracts of one notice, paged with skip/take until total; an empty page before total is an error.
    const contractsFor = async n => {
      const items = [];
      for (;;) {
        const j = await post('/api-pub/C_PUBLIC_CANotice/GetCANoticeContracts', { caNoticeId: n.caNoticeId, contractNo: null, winnerTitle: null, winnerFiscalNumber: null, contractDate: { from: null, to: null }, contractValue: { from: null, to: null }, contractMinOffer: { from: null, to: null }, contractMaxOffer: { from: null, to: null }, contractTitle: null, lots: null, sortOrder: [], sysContractFrameworkType: {}, skip: items.length, take: 1000 });
        const page = j.items || [];
        items.push(...page);
        if (items.length >= j.total) return items;
        if (!page.length) throw new Error('contracts of notice ' + n.caNoticeId + ': empty page at skip ' + items.length + ', total ' + j.total);
        await sleep(350);
      }
    };
    // A notice that still fails after 3 retries fails the run (status 'error: ...'): no silently truncated batch.
    for (const n of H.notices) {
      let items;
      for (let attempt = 0; ; attempt++) {
        try { items = await contractsFor(n); break; }
        catch (e) { if (attempt === 3) throw e; H.log.push('contracts retry ' + n.caNoticeId + ' ' + e.message); await sleep(5000 * (attempt + 1)); }
      }
      for (const c of items) H.contracts.push({ caNoticeId: n.caNoticeId, noticeNo: c.noticeNo, id: c.caNoticeContractId, contractNo: c.contractNo, date: c.contractDate, title: c.contractTitle, lots: c.lotsNoCaption, lotsCaption: c.lotsCaption, value: c.contractValue, cur: c.currency?.text, valueRon: c.defaultCurrencyContractValue, winners: (c.winners || []).map(w => ({ name: w.name, cui: w.fiscalNumber, entityId: w.entityId, city: w.address?.city, county: w.address?.county?.text, country: w.address?.country, isSME: w.address?.isSME, addr: w.address?.address })) });
      H.done = (H.done || 0) + 1; await sleep(250);
    }
    H.status = 'done';
  } catch (e) { H.status = 'error: ' + e.message; }
})();
