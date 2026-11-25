'use strict';
let researchRunning = false;
const researchDialog = document.createElement('dialog');
researchDialog.setAttribute('aria-label','Resultado da pesquisa');
document.body.append(researchDialog);
researchDialog.addEventListener('click',event=>{
  if (event.target.closest('[data-close-report]')) researchDialog.close();
});
function showResearch(report) {
  researchDialog.innerHTML = `<div class="dialog-head"><h2>Pesquisa de empresas</h2><button class="icon-button" data-close-report aria-label="Fechar">${icon('close')}</button></div>
    <p class="hint">Pesquisa assistida por IA. Confira as fontes e os contatos antes de abordar.</p>
    <div style="white-space:pre-wrap;overflow-wrap:anywhere;margin-top:20px">${esc(report.text)}</div>
    <h3 style="margin-top:25px">Fontes da pesquisa</h3><ul>${report.sources.map(source=>{
      try { const url=new URL(source.url); if(url.protocol!=='https:')return '';return `<li><a class="text-link" href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a></li>`; } catch {return '';}
    }).join('')}</ul><p class="hint">${esc(report.createdAt)}</p>`;
  // Search attribution is isolated from the application's DOM and scripts.
  if (report.searchEntryPoint) {
    const attribution=document.createElement('iframe');
    attribution.title='Sugestões de pesquisa do Google';
    attribution.setAttribute('sandbox','allow-popups allow-popups-to-escape-sandbox');
    attribution.style.cssText='width:100%;border:0;min-height:140px;margin-top:16px';
    attribution.srcdoc=report.searchEntryPoint;
    researchDialog.append(attribution);
  }
  researchDialog.showModal();
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-research],[data-report]');
  if(!button)return;
  const id=button.dataset.research || button.dataset.report;
  const draft=state.drafts.find(item=>item.id===id);
  if(!draft)return;
  if(button.dataset.report){ if(draft.research)showResearch(draft.research);return; }
  if(researchRunning)return toast('Uma pesquisa já está em andamento.');
  const {data:{session}}=await cloudClient.auth.getSession();
  if(!session){await showAccount();return;}
  researchRunning=true;
  button.disabled=true;
  button.textContent='Pesquisando…';
  try {
    const {data,error}=await cloudClient.functions.invoke('nexo-search',{body:{
      niche:draft.niche,city:draft.city,state:draft.state,neighborhood:draft.neighborhood
    }});
    if(error){
      let message='Não foi possível concluir a pesquisa.';
      try {const body=await error.context.json();message=body.error || message;}catch{}
      throw new Error(message);
    }
    if(!data?.text || !Array.isArray(data.sources))throw new Error('Resposta inválida da pesquisa.');
    const next={...state,drafts:state.drafts.map(item=>item.id===id?{...item,research:data}:item)};
    if(save(next)){render();showResearch(data);}
  }catch(error){toast(error.message || 'Falha na pesquisa.');}
  finally{researchRunning=false;button.disabled=false;button.textContent='Pesquisar com IA';}
});
