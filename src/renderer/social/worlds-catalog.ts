import { worldsIcon } from './worlds-icons';
import { parseWorldsVersion } from '../../shared/social/worlds-version';
import type { BattlyDesktopApi } from '../../shared/desktop-api';
import type { WorldsSnapshot } from '../../shared/social/battly-worlds-contract';
export function mountWorldsCatalog(
  catalog: HTMLElement,
  api: Pick<BattlyDesktopApi, 'getWorldsPublicRooms' | 'worldsAction'>,
  joinRoom?: (code: string) => Promise<void>,
) {
  let snapshot: WorldsSnapshot | undefined,
    page = 1,
    loading = false,
    catalogVersion = 0;
  const active = () => !!snapshot && !['idle', 'error'].includes(snapshot.state);
  const error = (value: unknown) =>
    value instanceof Error
      ? value.message
          .replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '')
          .slice(0, 240)
      : 'No se pudieron cargar las salas';
  catalog.innerHTML =
    '<div class="bw-section-title"><h2>Salas públicas</h2><button class="bw-secondary" data-refresh>Actualizar</button></div><p class="bw-hint">Descubre mundos de la comunidad. Usa la misma versión y mods que el anfitrión.</p><div class="bw-public-list"></div><div class="bw-pagination"><button class="bw-secondary" data-prev>Anterior</button><span data-page>Página 1</span><button class="bw-secondary" data-next>Siguiente</button></div><p role="status" data-public-message></p>';
  async function loadRooms(): Promise<void> {
    if (loading) return;
    loading = true;
    const request = ++catalogVersion;
    const status = catalog.querySelector('[data-public-message]')!;
    status.textContent = 'Buscando salas…';
    try {
      const rooms = await api.getWorldsPublicRooms(page);
      if (request !== catalogVersion) return;
      const list = catalog.querySelector('.bw-public-list')!;
      list.replaceChildren();
      for (const room of rooms) {
        const card = document.createElement('article');
        card.className = 'bw-public-room';
        const title = document.createElement('strong');
        title.innerHTML = worldsIcon('globe');
        const name = document.createElement('span');
        name.textContent = room.title || `Mundo de ${room.hostUsername}`;
        title.append(name);
        const detail = document.createElement('small');
        detail.textContent = `${room.hostUsername} · ${parseWorldsVersion(room.version)?.label || room.version || 'Minecraft'} · ${room.playerCount} en la sala`;
        const join = document.createElement('button');
        join.className = 'bw-primary';
        join.textContent = 'Unirme';
        join.disabled = active();
        join.onclick = () => {
          join.disabled = true;
          if (joinRoom) {
            status.textContent = '';
            void joinRoom(room.code)
              .catch((e) => {
                status.textContent = error(e);
              })
              .finally(() => {
                join.disabled = active();
              });
            return;
          }
          void api
            .worldsAction({ type: 'join', code: room.code })
            .then((next) => {
              update(next);
              status.textContent = next.message || 'Conectando con el mundo…';
            })
            .catch((e) => {
              status.textContent = error(e);
            })
            .finally(() => {
              join.disabled = active();
            });
        };
        card.append(title, detail, join);
        list.append(card);
      }
      status.textContent = rooms.length ? '' : 'No hay salas públicas disponibles en esta página.';
      catalog.querySelector<HTMLButtonElement>('[data-next]')!.disabled = rooms.length < 24;
      catalog.querySelector<HTMLButtonElement>('[data-prev]')!.disabled = page <= 1;
      catalog.querySelector('[data-page]')!.textContent = `Página ${page}`;
    } catch (e) {
      status.textContent = error(e);
    } finally {
      loading = false;
    }
  }
  catalog.querySelector<HTMLButtonElement>('[data-refresh]')!.onclick = () => {
    void loadRooms();
  };
  catalog.querySelector<HTMLButtonElement>('[data-prev]')!.onclick = () => {
    if (!loading) {
      page = Math.max(1, page - 1);
      void loadRooms();
    }
  };
  catalog.querySelector<HTMLButtonElement>('[data-next]')!.onclick = () => {
    if (!loading) {
      page++;
      void loadRooms();
    }
  };
  function update(next: WorldsSnapshot): void {
    if (snapshot && snapshot.username !== next.username) {
      catalogVersion++;
      page = 1;
      catalog.querySelector('.bw-public-list')!.replaceChildren();
    }
    snapshot = next;
    catalog.querySelectorAll<HTMLButtonElement>('.bw-public-room button').forEach((button) => {
      button.disabled = active();
    });
  }
  return { update, loadRooms };
}
