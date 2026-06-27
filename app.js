const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const DEFAULT_STATE = {profile:{}, modules:{}, quizzes:{}, meetings:{}, pre:false, post:false, evaluation:false, inscriptions:[], tests:{pre:[],post:[]}, evals:[]};
const state = JSON.parse(localStorage.getItem('tdi_state_v8') || JSON.stringify(DEFAULT_STATE));
function save(){ localStorage.setItem('tdi_state_v8', JSON.stringify(state)); renderAll(); }
function sendToSheets(tipo, payload){
  if(!TDI_CONFIG.googleAppsScriptURL) return;
  fetch(TDI_CONFIG.googleAppsScriptURL, {method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body: JSON.stringify({tipo, ...payload})}).catch(()=>{});
}
function toggleMenu(){ $('#sidebar').classList.toggle('open'); }
document.addEventListener('click', e => { if(e.target.closest('.sidebar a')) $('#sidebar').classList.remove('open'); });
function scrollToId(id){ document.getElementById(id)?.scrollIntoView({behavior:'smooth'}); }
function openModal(html){ $('#modalContent').innerHTML = html; $('#modal').classList.add('open'); }
function closeModal(){ $('#modal').classList.remove('open'); }
function openProfile(){ openModal(`<h2>Perfil do participante</h2><p>Informe seus dados para aparecerem no certificado.</p><input id="pname" placeholder="Nome completo" value="${state.profile.nome||''}"><input id="pcpf" placeholder="CPF" value="${state.profile.cpf||''}"><button onclick="saveProfile()">Salvar perfil</button>`); }
function saveProfile(){ state.profile.nome = $('#pname').value || 'Participante'; state.profile.cpf = $('#pcpf').value || ''; save(); closeModal(); }

function renderModules(){
  const root = $('#moduleAccordion');
  root.innerHTML = MODULES.map(m=>{
    const done = !!state.modules[m.id];
    const quiz = !!state.quizzes[m.id];
    const materials = (m.materiais||[]).map(x=>`<a href="${x[1]}" target="_blank">${x[0]}</a>`).join('');
    return `<article class="accordionItem" id="modulo-${m.id}">
      <div class="accHeader" onclick="toggleModule(${m.id})">
        <div class="accNumber">${done?'✓':m.id}</div>
        <div><small>${m.carga} • ${m.subtitulo}</small><h3>${m.titulo}</h3></div>
        <div class="accStatus">${done?'Módulo concluído':'Clique para abrir'} • ${quiz?'Quiz aprovado':'Quiz pendente'}</div>
      </div>
      <div class="accBody">
        <p>${m.descricao}</p>
        <div class="maguerez"><b>Arco de Maguerez:</b> observação da realidade → pontos-chave → teorização → hipóteses de solução → aplicação à realidade.</div>
        <h4>Materiais</h4><div class="materials">${materials}</div>
        <div class="moduleActions"><button onclick="event.stopPropagation(); openModuleQuiz(${m.id})">Abrir quiz</button><button class="ghost" onclick="event.stopPropagation(); completeModule(${m.id})">${done?'Desmarcar conclusão':'Concluir módulo'}</button></div>
      </div>
    </article>`;
  }).join('');
}
function toggleModule(id){ document.getElementById(`modulo-${id}`).classList.toggle('open'); }
function completeModule(id){ state.modules[id] = !state.modules[id]; if(!state.modules[id]) delete state.modules[id]; sendToSheets('modulo', {participante:state.profile, modulo:id, concluido:!!state.modules[id]}); save(); }
function openModuleQuiz(id){
  const m = MODULES.find(x=>x.id===id);
  let html = `<h2>Quiz • Módulo ${id}</h2><p><b>${m.titulo}</b></p><form id="quizForm">`;
  m.quiz.forEach((q,i)=>{ html += `<div class="question"><b>${i+1}. ${q.q}</b>${q.opts.map((op,j)=>`<label><input type="radio" name="q${i}" value="${j}"> ${op}</label>`).join('')}<div class="feedback" id="qfb${i}"></div></div>`; });
  html += `<button type="button" onclick="checkModuleQuiz(${id})">Finalizar quiz</button><p id="quizMsg"></p></form>`;
  openModal(html);
}
function checkModuleQuiz(id){
  const m = MODULES.find(x=>x.id===id); let ok=0;
  m.quiz.forEach((q,i)=>{ const el = document.querySelector(`input[name=q${i}]:checked`); const fb = $(`#qfb${i}`); if(el && Number(el.value)===q.a){ok++; fb.innerHTML = '✅ '+q.fb;} else {fb.innerHTML = 'ℹ️ '+q.fb;} });
  if(ok >= Math.ceil(m.quiz.length*.67)){ state.quizzes[id]=true; $('#quizMsg').innerHTML = `✅ Quiz aprovado (${ok}/${m.quiz.length}).`; sendToSheets('quiz', {participante:state.profile, modulo:id, acertos:ok, total:m.quiz.length}); save(); }
  else $('#quizMsg').innerHTML = `⚠️ Você acertou ${ok}/${m.quiz.length}. Revise o módulo e tente novamente.`;
}

function renderMeetings(){
  $('#meetings').innerHTML = Array.from({length:8},(_,i)=>i+1).map(i=>`<article class="meeting"><h3>Encontro ${i}</h3><input id="meet${i}" placeholder="Palavra-chave"><button onclick="validateMeeting(${i})">Registrar presença</button><p>${state.meetings[i]?'✅ Presença validada':'Pendente'}</p></article>`).join('');
}
function validateMeeting(i){ const v = ($(`#meet${i}`).value||'').trim().toLowerCase(); if(v===TDI_CONFIG.senhaEncontros){ state.meetings[i]=true; sendToSheets('presenca', {participante:state.profile, encontro:i}); save(); } else alert('Palavra-chave incorreta.'); }

function openTest(type){
  const arr = type==='pre'?PRE_TEST:POST_TEST, title = type==='pre'?'Pré-teste':'Pós-teste';
  let html = `<h2>${title}</h2><table class="testTable"><tr><th></th><th>Pré-teste</th><th>Pós-teste</th></tr><tr><td><b>Objetivo</b></td><td>Avaliar percepções iniciais</td><td>Avaliar aprendizagem após o curso</td></tr><tr><td><b>Foco</b></td><td>Visão inicial do profissional</td><td>Conhecimento consolidado</td></tr><tr><td><b>Questões</b></td><td>7</td><td>7</td></tr></table><form id="testForm">`;
  arr.forEach((q,i)=>{ html += `<div class="question"><b>Questão ${i+1}</b><p>${q.q}</p>${q.opts.map((o,j)=>`<label><input type="radio" name="t${i}" value="${j}"> ${o}</label>`).join('')}<div class="feedback" id="tfb${i}"></div></div>`; });
  html += `<button type="button" onclick="finishTest('${type}')">Finalizar ${title}</button><p id="testMsg"></p></form>`; openModal(html);
}
function finishTest(type){
  const arr = type==='pre'?PRE_TEST:POST_TEST; let ok=0; const answers=[];
  arr.forEach((q,i)=>{ const el = document.querySelector(`input[name=t${i}]:checked`); const val = el?Number(el.value):null; answers.push(val); const fb = $(`#tfb${i}`); if(val===q.a){ok++; fb.innerHTML='✅ '+q.fb;} else fb.innerHTML='ℹ️ '+q.fb; });
  if(type==='pre') state.pre=true; else state.post=true;
  state.tests[type] = state.tests[type] || [];
  state.tests[type].push({data:new Date().toLocaleString('pt-BR'), acertos:ok, total:arr.length, answers});
  sendToSheets(type==='pre'?'pre_teste':'pos_teste', {participante:state.profile, acertos:ok, total:arr.length, answers});
  save(); $('#testMsg').innerHTML = `Resultado registrado: ${ok}/${arr.length}.`;
}

function openEvaluation(){
  openModal(`<h2>Avaliação do Curso</h2><p>Esta avaliação é obrigatória para validar a certificação e produzir evidências do produto técnico.</p><label>Conteúdo do curso<select id="evConteudo"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label><label>Plataforma<select id="evPlataforma"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label><label>Encontros síncronos<select id="evEncontros"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label><label>O que mais contribuiu para sua prática?<textarea id="evContribuicao" rows="4"></textarea></label><label>Sugestões de melhoria<textarea id="evSugestoes" rows="4"></textarea></label><button onclick="saveEvaluation()">Enviar avaliação</button>`);
}
function saveEvaluation(){
  const data = {conteudo:$('#evConteudo').value, plataforma:$('#evPlataforma').value, encontros:$('#evEncontros').value, contribuicao:$('#evContribuicao').value, sugestoes:$('#evSugestoes').value, data:new Date().toLocaleString('pt-BR')};
  state.evaluation = true; state.evals.push(data); sendToSheets('avaliacao', {participante:state.profile, ...data}); save(); closeModal(); alert('Avaliação registrada. Obrigado!');
}

function calc(){
  const mod=Object.keys(state.modules).filter(k=>state.modules[k]).length, quiz=Object.keys(state.quizzes).length, meet=Object.keys(state.meetings).length;
  const total = 8+8+8+1+1+1; const points = mod+quiz+meet+(state.pre?1:0)+(state.post?1:0)+(state.evaluation?1:0);
  return {mod,quiz,meet,pct:Math.round(points/total*100), points,total};
}
function renderProgress(){
  const c=calc(); $('#donut').textContent=c.pct+'%'; $('#donut').style.background=`conic-gradient(#4d7445 ${c.pct*3.6}deg,#e6d6b3 0)`;
  const rows=[['Módulos',c.mod,8],['Quizzes',c.quiz,8],['Encontros',c.meet,8],['Pré-teste',state.pre?1:0,1],['Pós-teste',state.post?1:0,1],['Avaliação',state.evaluation?1:0,1]];
  $('#bars').innerHTML = rows.map(r=>`<div class="barRow"><span>${r[0]}</span><div class="bar"><i style="width:${r[1]/r[2]*100}%"></i></div><b>${r[1]}/${r[2]}</b></div>`).join('');
  $('#miniStats').innerHTML = [`${c.mod}/8 módulos`,`${c.quiz}/8 quizzes`,`${c.meet}/8 encontros`,state.evaluation?'Avaliação feita':'Avaliação pendente'].map(x=>`<span>${x}</span>`).join('');
  $('#topName').textContent = state.profile.nome || 'Participante'; $('#avatar').textContent = (state.profile.nome||'P')[0].toUpperCase(); $('#evalStatus').textContent = state.evaluation ? 'Avaliação concluída' : 'Avaliação pendente';
}
function openCronograma(){ openModal(`<h2>Organização da formação</h2><p>O cronograma será disponibilizado conforme a formação das turmas. Cada edição do curso poderá possuir datas específicas para os encontros síncronos e para a liberação dos módulos.</p><p>Independentemente da turma, o percurso formativo seguirá a mesma estrutura pedagógica: pré-teste, oito módulos formativos, atividades individuais, quizzes, encontros síncronos, pós-teste, avaliação final e emissão do certificado.</p><p>A carga horária de 22 horas será distribuída entre atividades assíncronas e encontros síncronos, respeitando o planejamento de cada turma.</p>`); }

$('#signup').addEventListener('submit', e=>{ e.preventDefault(); const data = Object.fromEntries(new FormData(e.target).entries()); data.data = new Date().toLocaleString('pt-BR'); state.profile = {...state.profile, ...data}; state.inscriptions.push(data); sendToSheets('inscricao', data); save(); $('#signupMsg').textContent='✅ Inscrição registrada. Se o Google Sheets estiver configurado, ela também será enviada para a planilha.'; });

function requirementsOk(){ const c=calc(); return c.mod>=8 && c.quiz>=8 && c.meet>=8 && state.pre && state.post && state.evaluation; }
function generateCertificate(){
  const code = ($('#finalCode').value||'').trim().toLowerCase();
  if(!requirementsOk()){ $('#certResult').innerHTML='<p>⚠️ Certificado bloqueado: conclua módulos, quizzes, encontros, pré-teste, pós-teste e avaliação.</p>'; return; }
  if(code !== TDI_CONFIG.codigoFinalCertificado){ $('#certResult').innerHTML='<p>⚠️ Código final incorreto.</p>'; return; }
  const name = state.profile.nome || prompt('Digite o nome para o certificado:') || 'Participante';
  const canvas = $('#certificateCanvas'), ctx = canvas.getContext('2d'), img = new Image();
  img.onload = function(){
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    ctx.fillStyle='rgba(251,244,230,.70)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='rgba(255,250,240,.76)'; ctx.fillRect(120,120,1360,860);
    ctx.strokeStyle='#c7922f'; ctx.lineWidth=12; ctx.strokeRect(80,80,1440,940);
    ctx.strokeStyle='#073c2d'; ctx.lineWidth=3; ctx.strokeRect(120,120,1360,860);
    ctx.textAlign='center'; ctx.fillStyle='#073c2d';
    ctx.font='bold 82px Georgia'; ctx.fillText('Certificado',800,270);
    ctx.font='32px Arial'; ctx.fillText('Certificamos que',800,355);
    ctx.font='bold 64px Georgia'; ctx.fillText(name,800,455);
    ctx.font='32px Arial'; ctx.fillText('concluiu o curso formativo',800,535);
    ctx.font='bold 46px Georgia'; ctx.fillText('Terreiro de Ideias: Pontes de Cuidado no SUS',800,610);
    ctx.font='28px Arial'; ctx.fillText('Carga horária: 22 horas',800,685);
    ctx.fillText('Emitido por: Terreiro de Ideias',800,735);
    const auth='TDI-'+Date.now().toString(36).toUpperCase();
    ctx.fillStyle='#8a6422'; ctx.font='24px Arial'; ctx.fillText('Código de validação: '+auth,800,810); ctx.fillText(new Date().toLocaleDateString('pt-BR'),800,855);
    const url=canvas.toDataURL('image/png'); const a=document.createElement('a'); a.href=url; a.download='certificado-terreiro-de-ideias.png'; a.click();
    $('#certResult').innerHTML='<p>✅ Certificado gerado e baixado como PNG.</p><img class="certPreview" src="'+url+'">';
    sendToSheets('certificado', {participante:state.profile, codigo:auth, data:new Date().toLocaleString('pt-BR')});
  };
  img.src='fundo-curso.png';
}

function openTeacher(){
  openModal(`<h2>Painel Professor / Mediador</h2><p>Acesse com a senha do facilitador.</p><input id="teacherPass" placeholder="Senha"><button onclick="teacherLogin()">Entrar</button><div id="teacherArea"></div>`);
}
function teacherLogin(){
  const pass=($('#teacherPass').value||'').trim().toLowerCase(); if(pass!==TDI_CONFIG.senhaProfessor){ alert('Senha incorreta.'); return; }
  const c=calc();
  $('#teacherArea').innerHTML=`<hr><h2>Painel de Validação Científica</h2><div class="teacherGrid"><article><b>Inscrições</b><p>${state.inscriptions.length}</p></article><article><b>Progresso geral</b><p>${c.pct}%</p></article><article><b>Certificação</b><p>${requirementsOk()?'Apta':'Pendente'}</p></article><article><b>Pré-teste</b><p>${state.pre?'Concluído':'Pendente'}</p></article><article><b>Pós-teste</b><p>${state.post?'Concluído':'Pendente'}</p></article><article><b>Avaliação</b><p>${state.evaluation?'Concluída':'Pendente'}</p></article></div><h3>Ferramentas</h3><button onclick="exportCSV('inscricoes')">Exportar inscrições CSV</button><button onclick="exportCSV('progresso')">Exportar progresso CSV</button><button onclick="openMaterialsHelp()">Como adicionar materiais</button><button onclick="openSheetsHelp()">Configurar Google Sheets</button>`;
}
function exportCSV(type){
  let csv='';
  if(type==='inscricoes') csv='nome,cpf,email,telefone,cidade,profissao,instituicao,data\n'+state.inscriptions.map(r=>['nome','cpf','email','telefone','cidade','profissao','instituicao','data'].map(k=>'"'+(r[k]||'').replaceAll('"','""')+'"').join(',')).join('\n');
  else { const c=calc(); csv=`item,valor\nmodulos,${c.mod}/8\nquizzes,${c.quiz}/8\nencontros,${c.meet}/8\npre_teste,${state.pre}\npos_teste,${state.post}\navaliacao,${state.evaluation}\npercentual,${c.pct}%`; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download=`terreiro-${type}.csv`; a.click();
}
function openMaterialsHelp(){ openModal(`<h2>Como adicionar materiais</h2><p>Suba os arquivos no GitHub com nomes simples, por exemplo: <b>modulo1.pdf</b>, <b>atividade1.pdf</b>, <b>video1.mp4</b>.</p><p>Para alterar ou acrescentar materiais, edite o arquivo <b>data.js</b> na lista <b>materiais</b> de cada módulo.</p><p>Também incluí o arquivo <b>MODELO-MATERIAIS-GOOGLE-SHEETS.csv</b> para organizar materiais por planilha.</p>`); }
function openSheetsHelp(){ openModal(`<h2>Configurar Google Sheets</h2><ol><li>Abra <b>script.google.com</b> e crie um projeto.</li><li>Cole o conteúdo do arquivo <b>google-apps-script-inscricoes.js</b>.</li><li>Publique como <b>Web App</b> com acesso para qualquer pessoa com o link.</li><li>Copie a URL do Web App.</li><li>Cole no arquivo <b>config.js</b>, em <b>googleAppsScriptURL</b>.</li></ol><p>Depois disso, inscrições, pré/pós-teste, presença, avaliação e certificado serão enviados para a planilha.</p>`); }

function renderAll(){ renderModules(); renderMeetings(); renderProgress(); }
renderAll();
