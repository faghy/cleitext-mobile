import { useState } from 'react';
import {
  Button,
  Empty,
  ErrorBox,
  Loading,
  Screen,
  Sheet,
  useLoad,
  useToast,
} from '../components/ui';
import { t } from '../i18n';
import { registry } from '../lib/app';
import { thumbnail } from '../lib/format';
import { openInBrowser, pickPhoto } from '../lib/native';
import type { Site } from '../lib/sites';
import type { Media as MediaItem } from '../lib/types';
import { can } from './Home';

export function MediaScreen({ site, onBack }: { site: Site; onBack?: () => void }) {
  const api = registry.api(site);
  const toast = useToast();
  const [extra, setExtra] = useState<MediaItem[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const list = useLoad(async () => {
    const page = await api.media();
    setCursor(page.nextCursor);
    setExtra([]);
    return page.items;
  }, site.id);
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [more, setMore] = useState(false);

  if (!can(site, 'upload_media')) {
    return (
      <Screen title={t('media.title')} onBack={onBack}>
        <Empty icon="media" text={t('media.noRight')} />
      </Screen>
    );
  }

  const upload = async (source: 'camera' | 'gallery') => {
    setPicker(false);
    const photo = await pickPhoto(source);
    if (!photo) return;
    setUploading(true);
    try {
      const media = await api.upload(photo.blob, photo.filename);
      list.setData([media, ...(list.data ?? [])]);
      toast(t('media.uploaded'));
    } catch (error) {
      toast(error instanceof Error ? error.message : t('error'));
    } finally {
      setUploading(false);
    }
  };

  const loadMore = async () => {
    if (!cursor) return;
    setMore(true);
    try {
      const page = await api.media(cursor);
      setExtra((items) => [...items, ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      setMore(false);
    }
  };

  const items = [...(list.data ?? []), ...extra];
  return (
    <Screen
      title={t('media.title')}
      onBack={onBack}
      action={
        <button className="bar__action" onClick={() => setPicker(true)} disabled={uploading}>
          {uploading ? <span className="spinner spinner--small" /> : t('media.upload')}
        </button>
      }
    >
      {list.loading && !list.data && <Loading />}
      {list.error !== undefined && <ErrorBox error={list.error} onRetry={list.reload} />}
      {list.data && items.length === 0 && (
        <Empty icon="media" text={t('media.empty')}>
          <Button icon="camera" onClick={() => setPicker(true)}>
            {t('media.upload')}
          </Button>
        </Empty>
      )}
      <div className="grid">
        {items.map((m) => (
          <button
            key={m.id}
            className="grid__item"
            onClick={() => void openInBrowser(api.absolute(m.url))}
          >
            <img src={api.absolute(thumbnail(m, 300))} alt={m.filename} loading="lazy" />
          </button>
        ))}
      </div>
      {cursor && (
        <div className="pad">
          <Button kind="secondary" busy={more} onClick={() => void loadMore()}>
            {t('media.more')}
          </Button>
        </div>
      )}
      <Sheet open={picker} title={t('media.upload')} onClose={() => setPicker(false)}>
        <div className="stack">
          <Button icon="camera" onClick={() => void upload('camera')}>
            {t('write.camera')}
          </Button>
          <Button kind="secondary" icon="image" onClick={() => void upload('gallery')}>
            {t('write.gallery')}
          </Button>
        </div>
      </Sheet>
    </Screen>
  );
}
