'use strict';
const cloudClient = supabase.createClient(
  'https://cozxensmcokrotntodog.supabase.co',
  'sb_publishable_3BjDtta6BNWh3ltWmCM1WQ_32s2XxGt'
);
const accountDialog = document.createElement('dialog');
accountDialog.setAttribute('aria-label', 'Conta e sincronização');
document.body.append(accountDialog);
let cloudBusy = false;
let cloudUser = null;
let cloudRevision = null;
let cloudBaseline = null;
let loadedOwner = null;

function cloudMessage(message) {
  const element = accountDialog.querySelector('[role=status]');
  if (element) element.textContent = message;
}

async function showAccount() {
  const { data, error } = await cloudClient.auth.getUser();
  cloudUser = error ? null : data.user;
  accountDialog.innerHTML = `<div class="dialog-head"><h2>Conta e sincronização</h2><button class="icon-button" data-cloud="close" aria-label="Fechar">${icon('close')}</button></div>
    ${cloudUser ? `<p style="margin:18px 0">${esc(cloudUser.email)}</p>
      <p>Salve os cadastros deste navegador na sua conta. No outro dispositivo, entre na mesma conta e carregue os cadastros.</p>
      <div class="dialog-actions"><button class="btn btn-secondary" data-cloud="pull">Carregar da minha conta</button><button class="btn btn-primary" data-cloud="push">Salvar na minha conta</button></div>
      <button class="btn btn-ghost" data-cloud="logout" style="margin-top:20px">Sair da conta</button>` :
    `<form id="cloudAuth" style="display:grid;gap:18px;margin-top:22px"><label>E-mail<input name="email" type="email" required autocomplete="username"></label><label>Senha<input name="password" type="password" required minlength="8" autocomplete="current-password"></label><button class="btn btn-primary" type="submit">Entrar</button><button class="btn btn-secondary" type="button" data-cloud="signup">Criar conta</button></form>`}
    <p role="status" aria-live="polite" style="margin-top:20px;font-size:14px"></p>`;
  if (!accountDialog.open) accountDialog.showModal();
}

async function fetchWorkspace() {
  const { data, error } = await cloudClient.from('nexo_workspaces')
    .select('payload,revision').eq('owner_id', cloudUser.id).maybeSingle();
  if (error) throw error;
  if (data && !validState(data.payload)) throw new Error('O cadastro na conta tem um formato incompatível.');
  return data;
}

async function transferWorkspace(direction) {
  const snapshot = JSON.parse(JSON.stringify(state));
  const owner = cloudUser.id;
  const remote = await fetchWorkspace();
  if (direction === 'pull') {
    if (!remote) return cloudMessage('Sua conta ainda não tem cadastros. Use Salvar na minha conta neste dispositivo.');
    if (!confirm('Carregar os cadastros da conta e substituir os deste navegador? Exporte uma cópia nas Configurações se quiser guardar o cadastro local.')) return;
    if (JSON.stringify(state) !== JSON.stringify(snapshot)) throw new Error('O cadastro local mudou durante a consulta. Tente novamente.');
    if (!save(remote.payload)) throw new Error('Não foi possível salvar a cópia neste navegador.');
    cloudRevision = remote.revision;
    cloudBaseline = JSON.stringify(remote.payload);
    loadedOwner = owner;
    render();
    return cloudMessage('Cadastros carregados da sua conta.');
  }
  if (remote) {
    if (loadedOwner !== owner || cloudRevision !== remote.revision || cloudBaseline !== JSON.stringify(remote.payload)) {
      throw new Error('Carregue os cadastros da conta antes de salvar. Exporte a cópia local para preservá-la. O cadastro da conta pode ter sido atualizado em outro dispositivo.');
    }
    if (!confirm('Salvar os cadastros deste navegador na sua conta?')) return;
  } else if (!confirm('Transferir seu perfil, serviços e pesquisas deste navegador para sua conta?')) return;
  let request;
  if (remote) {
    request = cloudClient.from('nexo_workspaces').update({ payload: snapshot })
      .eq('owner_id', owner).eq('revision', cloudRevision);
  } else {
    request = cloudClient.from('nexo_workspaces').insert({ payload: snapshot });
  }
  const { data, error } = await request.select('revision,payload').single();
  if (error) throw new Error('Não foi possível salvar. A conta pode ter mudado em outro dispositivo. Carregue os cadastros e tente novamente.');
  cloudRevision = data.revision;
  cloudBaseline = JSON.stringify(data.payload);
  loadedOwner = owner;
  cloudMessage('Cadastros salvos na sua conta.');
}

async function runCloud(action) {
  if (cloudBusy) return;
  cloudBusy = true;
  accountDialog.querySelectorAll('button').forEach(button => button.disabled = true);
  cloudMessage('Aguarde…');
  try {
    await action();
  } catch (error) {
    cloudMessage(error.message || 'Não foi possível conectar. Verifique sua conexão.');
  } finally {
    cloudBusy = false;
    accountDialog.querySelectorAll('button').forEach(button => button.disabled = false);
  }
}

accountDialog.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  runCloud(async () => {
    const { error } = await cloudClient.auth.signInWithPassword({
      email: form.elements.email.value.trim(), password: form.elements.password.value
    });
    if (error) throw new Error('Não foi possível entrar. Confira o e-mail, a senha e a confirmação do cadastro.');
    form.elements.password.value = '';
    await showAccount();
    cloudMessage('Você entrou. Escolha se quer carregar ou salvar seus cadastros.');
  });
});

accountDialog.addEventListener('click', event => {
  const button = event.target.closest('[data-cloud]');
  if (!button || cloudBusy) return;
  if (button.dataset.cloud === 'close') return accountDialog.close();
  runCloud(async () => {
    if (button.dataset.cloud === 'signup') {
      const form = accountDialog.querySelector('form');
      if (!form.reportValidity()) return;
      const { data, error } = await cloudClient.auth.signUp({
        email: form.elements.email.value.trim(), password: form.elements.password.value,
        options: { emailRedirectTo: 'https://nexo-prospect-ai.vercel.app/' }
      });
      if (error) throw error;
      form.elements.password.value = '';
      if (data.session) await showAccount();
      cloudMessage(data.session ? 'Conta pronta. Você já pode salvar seus cadastros.' : 'Confira seu e-mail para confirmar o cadastro. Depois volte aqui para entrar.');
    }
    if (button.dataset.cloud === 'push') await transferWorkspace('push');
    if (button.dataset.cloud === 'pull') await transferWorkspace('pull');
    if (button.dataset.cloud === 'logout') {
      const { error } = await cloudClient.auth.signOut({ scope: 'local' });
      if (error) throw error;
      cloudRevision = null;
      cloudBaseline = null;
      loadedOwner = null;
      await showAccount();
      cloudMessage('Você saiu. Os cadastros locais continuam neste navegador.');
    }
  });
});

const accountButton = document.createElement('button');
accountButton.className = 'btn btn-secondary';
accountButton.textContent = 'Minha conta';
accountButton.addEventListener('click', showAccount);
document.querySelector('.top-right').prepend(accountButton);
