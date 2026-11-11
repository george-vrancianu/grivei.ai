// Varianta rulată din consola browserului pe https://e-licitatie.ro/pub (același API ca seap_harvest.py).
// 1) setează CA (id-ul SEAP al autorității; îl afli cu:
//    fetch('/api-pub/ComboPub/searchContractingAuthorities?filter=municipiul%20brasov&pageIndex=0&pageSize=50&parentId=').then(r=>r.json()).then(j=>console.table(j.items))
// 2) rulează scriptul; 3) când window.__H.status==='done', copiază JSON.stringify({authority:__H.ca,da:__H.da,notices:__H.notices,contracts:__H.contracts,harvested_at:new Date().toISOString()})
const CA = 3289, FROM = "2024-01-01T00:00:00+02:00", TO = new Date().toISOString();
window.__H = { status: 'running', log: [], da: [], notices: [], contracts: [], ca: { seapId: CA } };
(async () => {
  const H = window.__H;
  const post = async (u, b) => { const r = await fetch('https://e-licitatie.ro' + u, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(b) }); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  try {
    for (let p = 0; ; p++) {
      const j = await post('/api-pub/DirectAcquisitionCommon/GetDirectAcquisitionList/', { pageSize: 100, pageIndex: p, showOngoingDa: false, cookieContext: null, sysDirectAcquisitionStateId: null, publicationDateStart: null, publicationDateEnd: null, finalizationDateStart: FROM, finalizationDateEnd: TO, cpvCategoryId: null, contractingAuthorityId: CA, supplierId: null, cpvCodeId: null, assignedUserId: null, isOpenForCorrection: null, sysDirectAcquisitionTypeId: null, directAcquisitionName: null, uniqueIdentificationCode: null });
      for (const i of j.items) H.da.push({ id: i.directAcquisitionId, code: i.uniqueIdentificationCode, name: i.directAcquisitionName, state: i.sysDirectAcquisitionState?.text, cpv: i.cpvCode, pub: i.publicationDate, fin: i.finalizationDate, supplier: i.supplier, ca: i.contractingAuthority, est: i.estimatedValueRon, val: i.closingValue });
      if (H.da.length >= j.total || !j.items.length) break; await sleep(350);
    }
    for (let p = 0; ; p++) {
      const j = await post('/api-pub/NoticeCommon/GetCANoticeList/', { sysNoticeTypeIds: [], sortProperties: [], pageIndex: p, pageSize: 100, contractingAuthorityId: CA, startPublicationDate: FROM, endPublicationDate: TO });
      for (const i of j.items) H.notices.push({ caNoticeId: i.caNoticeId, noticeId: i.noticeId, procedureId: i.procedureId, noticeNo: i.noticeNo, typeId: i.sysNoticeTypeId, state: i.sysNoticeState?.text, procState: i.sysProcedureState?.text, ca: i.contractingAuthorityNameAndFN, title: i.contractTitle, contractType: i.sysAcquisitionContractType?.text, procType: i.sysProcedureType?.text, assignType: i.sysContractAssigmentType?.text, cpv: i.cpvCodeAndName, value: i.ronContractValue, date: i.noticeStateDate, isOnline: i.isOnline, cur: i.currencyCode, est: i.estimatedValueExport });
      if (H.notices.length >= j.total || !j.items.length) break; await sleep(350);
    }
    for (const n of H.notices) {
      try {
        const j = await post('/api-pub/C_PUBLIC_CANotice/GetCANoticeContracts', { caNoticeId: n.caNoticeId, contractNo: null, winnerTitle: null, winnerFiscalNumber: null, contractDate: { from: null, to: null }, contractValue: { from: null, to: null }, contractMinOffer: { from: null, to: null }, contractMaxOffer: { from: null, to: null }, contractTitle: null, lots: null, sortOrder: [], sysContractFrameworkType: {}, skip: 0, take: 200 });
        for (const c of j.items || []) H.contracts.push({ caNoticeId: n.caNoticeId, noticeNo: c.noticeNo, id: c.caNoticeContractId, contractNo: c.contractNo, date: c.contractDate, title: c.contractTitle, lots: c.lotsNoCaption, lotsCaption: c.lotsCaption, value: c.contractValue, cur: c.currency?.text, valueRon: c.defaultCurrencyContractValue, winners: (c.winners || []).map(w => ({ name: w.name, cui: w.fiscalNumber, entityId: w.entityId, city: w.address?.city, county: w.address?.county?.text, country: w.address?.country, isSME: w.address?.isSME, addr: w.address?.address })) });
      } catch (e) { H.log.push('contracts err ' + n.caNoticeId + ' ' + e.message); }
      H.done = (H.done || 0) + 1; await sleep(250);
    }
    H.status = 'done';
  } catch (e) { H.status = 'error: ' + e.message; }
})();
