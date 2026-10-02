import { mountInlineSelect } from '../ui/inline-select';
import { mountWorldsCatalog } from './worlds-catalog';
import type { BattlyDesktopApi } from '../../shared/desktop-api';
import type { WorldsSnapshot, WorldsVoiceStatus } from '../../shared/social/battly-worlds-contract';

export type WorldsControlsApi = Pick<
  BattlyDesktopApi,
  | 'worldsAction'
  | 'getWorldsPublicRooms'
  | 'worldsVoiceCommand'
  | 'worldsVoiceParty'
  | 'onWorldsEvent'
>;
export function mountWorldsControls(
  visibility: HTMLElement,
  voice: HTMLElement,
  catalog: HTMLElement,
  api: WorldsControlsApi,
  inlineDevicePicker = false,
): { update: (snapshot: WorldsSnapshot) => void; loadRooms: () => Promise<void> } {
  visibility.innerHTML =
    '<form class="bw-visibility"><label>Nombre de tu sala<input maxlength="80" placeholder="Una aventura con amigos" required /></label><p class="bw-hint">Las salas públicas aparecen en Battly para Windows y Android.</p><button class="bw-secondary" type="submit">Publicar sala</button><p role="status"></p></form>';
  voice.innerHTML =
    '<h2>Chat de voz</h2><p class="bw-hint" data-voice-note>Entra en una sala para hablar con tus amigos.</p><div class="bw-voice-actions"><button class="bw-primary" data-voice-connect>Activar voz</button><button class="bw-secondary" data-voice-mute disabled>Silenciar micro</button><button class="bw-secondary" data-voice-deafen disabled>Silenciar audio</button></div><div class="bw-microphone">Micrófono<select data-voice-input aria-label="Micrófono"><option value="">Predeterminado del sistema</option></select></div><div class="bw-voice-members"></div><div class="bw-voice-actions"><button class="bw-secondary" data-party-create disabled>Grupo privado</button><button class="bw-secondary" data-party-room disabled>Voz de la sala</button></div><div class="bw-party-invite" hidden></div>';
  const publicRooms = mountWorldsCatalog(catalog, api);
  let snapshot: WorldsSnapshot | undefined;
  let state: WorldsVoiceStatus = { connected: false, muted: false, deafened: false, error: '' };
  let memberKey = '',
    channel = 'room';
  const error = (v: unknown): string =>
    v instanceof Error
      ? v.message
          .replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '')
          .slice(0, 240)
      : 'No se pudo completar la operación';
  const note = voice.querySelector<HTMLElement>('[data-voice-note]')!;
  const run = async (work: () => Promise<unknown>): Promise<void> => {
    try {
      await work();
    } catch (e) {
      note.textContent = error(e);
    }
  };
  const button = (selector: string) => voice.querySelector<HTMLButtonElement>(selector)!;
  const active = () => snapshot?.state === 'hosting' || snapshot?.state === 'joined';
  function renderVoice(): void {
    button('[data-voice-connect]').disabled = !active();
    button('[data-voice-connect]').textContent = state.connected ? 'Salir de voz' : 'Activar voz';
    button('[data-voice-mute]').disabled = !state.connected;
    button('[data-voice-mute]').textContent = state.muted ? 'Activar micro' : 'Silenciar micro';
    button('[data-voice-deafen]').disabled = !state.connected;
    button('[data-voice-deafen]').textContent = state.deafened ? 'Escuchar' : 'Silenciar audio';
    button('[data-party-room]').disabled = !state.connected;
    button('[data-party-create]').disabled = !state.connected;
    note.textContent =
      state.error ||
      (state.connected
        ? (channel === 'room' ? 'Voz de la sala · ' : 'Grupo privado · ') +
          (state.muted ? 'Micrófono silenciado' : 'Micrófono activo')
        : 'Activa la voz cuando quieras participar.');
    const key = JSON.stringify(snapshot?.participants || []);
    if (key === memberKey) return;
    memberKey = key;
    const list = voice.querySelector<HTMLElement>('.bw-voice-members')!;
    const checked = new Set(
      [...list.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked')].map(
        (el) => el.value,
      ),
    );
    const volumes = new Map(
      [...list.querySelectorAll<HTMLInputElement>('input[type=range]')].map((el) => [
        el.dataset.user,
        el.value,
      ]),
    );
    list.replaceChildren();
    for (const member of snapshot?.participants || []) {
      const row = document.createElement('div');
      row.className = 'bw-voice-person';
      const label = document.createElement('label');
      const select = document.createElement('input');
      select.type = 'checkbox';
      select.value = member.userId;
      select.checked = checked.has(member.userId);
      select.setAttribute('aria-label', `Incluir a ${member.username} en un grupo privado`);
      const name = document.createElement('span');
      name.setAttribute('translate', 'no');
      name.textContent = member.username;
      const status = document.createElement('small');
      status.textContent = member.voiceConnected
        ? member.muted
          ? 'Micro silenciado'
          : 'En voz'
        : 'Sin voz';
      if (member.username === snapshot?.username) {
        name.textContent += ' (tú)';
        label.append(name);
      } else label.append(select, name);
      row.append(label, status);
      const volume = document.createElement('input');
      volume.type = 'range';
      volume.min = '0';
      volume.max = '100';
      volume.value = volumes.get(member.userId) || '100';
      volume.dataset.user = member.userId;
      volume.setAttribute('aria-label', `Volumen de ${member.username}`);
      volume.oninput = () => {
        void run(() =>
          api.worldsVoiceCommand({
            type: 'volume',
            userId: member.userId,
            volume: Number(volume.value) / 100,
          }),
        );
      };
      if (member.username !== snapshot?.username) row.append(volume);
      list.append(row);
    }
  }
  const microphone = voice.querySelector<HTMLSelectElement>('[data-voice-input]')!;
  const refreshMicrophone = inlineDevicePicker ? mountInlineSelect(microphone) : () => {};
  let deviceRevision = 0;
  async function devices(): Promise<void> {
    const revision = ++deviceRevision;
    try {
      const values =
        state.devices?.map((d) => ({ ...d, kind: 'audioinput' })) ??
        (await navigator.mediaDevices.enumerateDevices());
      if (revision !== deviceRevision) return;
      const current = state.inputDeviceId ?? microphone.value;
      microphone.replaceChildren(new Option('Predeterminado del sistema', ''));
      for (const device of values.filter(
        (d) => d.kind === 'audioinput' && d.deviceId !== 'default',
      ))
        microphone.add(new Option(device.label || 'Micrófono disponible', device.deviceId));
      microphone.value = [...microphone.options].some((option) => option.value === current)
        ? current
        : '';
      refreshMicrophone();
    } catch {
      /* The default device remains usable. */
    }
  }
  microphone.onchange = () => {
    void run(() => api.worldsVoiceCommand({ type: 'input', deviceId: microphone.value }));
  };
  button('[data-voice-connect]').onclick = () => {
    void run(() => api.worldsVoiceCommand({ type: state.connected ? 'disconnect' : 'connect' }));
  };
  button('[data-voice-mute]').onclick = () => {
    void run(() => api.worldsVoiceCommand({ type: 'mute', value: !state.muted }));
  };
  button('[data-voice-deafen]').onclick = () => {
    void run(() => api.worldsVoiceCommand({ type: 'deafen', value: !state.deafened }));
  };
  button('[data-party-room]').onclick = () => {
    void run(() => api.worldsVoiceParty('room'));
  };
  button('[data-party-create]').onclick = () => {
    const ids = [...voice.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked')].map(
      (el) => el.value,
    );
    if (!ids.length) {
      note.textContent = 'Selecciona los participantes del grupo.';
      return;
    }
    void run(() => api.worldsVoiceParty('create', ids));
  };
  const form = visibility.querySelector('form')!;
  const publicButton = form.querySelector('button')!;
  const title = form.querySelector('input')!;
  const publicStatus = form.querySelector('[role=status]')!;
  form.onsubmit = (event) => {
    event.preventDefault();
    if (!snapshot || snapshot.state !== 'hosting') return;
    publicButton.disabled = true;
    void api
      .worldsAction({ type: 'visibility', isPublic: !snapshot.isPublic, title: title.value.trim() })
      .then((next) => {
        update(next);
        publicStatus.textContent = next.isPublic
          ? 'Tu sala ya aparece en la comunidad.'
          : 'La sala vuelve a ser privada.';
      })
      .catch((e) => {
        publicStatus.textContent = error(e);
      })
      .finally(() => {
        publicButton.disabled = false;
      });
  };
  function update(next: WorldsSnapshot): void {
    if (snapshot && snapshot.username !== next.username) {
      memberKey = '';
      title.value = '';
    }
    snapshot = next;
    publicRooms.update(next);
    if (!active()) channel = 'room';
    visibility.hidden = next.state !== 'hosting';
    publicButton.textContent = next.isPublic ? 'Hacer privada' : 'Publicar sala';
    if (document.activeElement !== title)
      title.value = next.roomTitle || title.value || `Mundo de ${next.username}`;
    renderVoice();
  }
  api.onWorldsEvent((event) => {
    if (event.type === 'snapshot') update(event.snapshot);
    if (event.type === 'voice' && event.event.type === 'status') {
      const wasConnected = state.connected;
      state = event.event.status;
      renderVoice();
      if (state.connected || wasConnected) void devices();
    }
    if (
      event.type === 'voice' &&
      (event.event.type === 'channel' || event.event.type === 'ready')
    ) {
      channel = event.event.channel;
      renderVoice();
    }
    if (event.type === 'voice' && event.event.type === 'party') {
      const invite = event.event;
      const box = voice.querySelector<HTMLElement>('.bw-party-invite')!;
      box.hidden = false;
      box.replaceChildren();
      const text = document.createElement('p');
      text.textContent = `${invite.fromUsername} te invita a un grupo privado.`;
      const accept = document.createElement('button');
      accept.className = 'bw-primary';
      accept.textContent = 'Aceptar grupo';
      accept.onclick = () => {
        void run(async () => {
          await api.worldsVoiceParty('join', invite.partyId);
          box.hidden = true;
        });
      };
      const dismiss = document.createElement('button');
      dismiss.className = 'bw-secondary';
      dismiss.textContent = 'Ignorar';
      dismiss.onclick = () => {
        box.hidden = true;
      };
      box.append(text, accept, dismiss);
    }
  });
  return { update, loadRooms: publicRooms.loadRooms };
}
