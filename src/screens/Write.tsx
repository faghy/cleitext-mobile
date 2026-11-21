import { useState } from 'react';
import { Icon } from '../components/icons';
import { Button, Empty, Notice, Screen, Sheet, useToast } from '../components/ui';
import { t } from '../i18n';
import { registry } from '../lib/app';
import { draftToDocument, hasBody, type DraftPart } from '../lib/content';
import { adminUrl, openInBrowser, pickPhoto } from '../lib/native';
import type { Site } from '../lib/sites';
import type { EntryView } from '../lib/types';
import { can } from './Home';

type Part = DraftPart & { key: number };

let nextKey = 1;
const textPart = (text = ''): Part => ({ kind: 'text', text, key: nextKey++ });

export function Write({ site }: { site: Site }) {
  const api = registry.api(site);
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [parts, setParts] = useState<Part[]>([textPart()]);
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ entry: EntryView; published: boolean } | null>(null);

  if (!can(site, 'edit_entries')) {
    return (
      <Screen title={t('write.title')}>
        <Empty icon="write" text={t('write.noWrite')} />
      </Screen>
    );
  }
  const mayPublish = can(site, 'publish_entries');

  const update = (key: number, change: Partial<DraftPart>) =>
    setParts((list) => list.map((p) => (p.key === key ? ({ ...p, ...change } as Part) : p)));

  const addPhoto = async (source: 'camera' | 'gallery') => {
    setPicker(false);
    const photo = await pickPhoto(source);
    if (!photo) return;
    setUploading(true);
    setProblem(null);
    try {
      const media = await api.upload(photo.blob, photo.filename);
      setParts((list) => {
        const last = list[list.length - 1];
        // An empty text box at the end makes room for the photo.
        const keep =
          list.length > 1 && last?.kind === 'text' && !last.text.trim() ? list.slice(0, -1) : list;
        return [
          ...keep,
          {
            kind: 'image',
            mediaId: media.id,
            url: api.absolute(media.url),
            alt: '',
            key: nextKey++,
          },
          textPart(),
        ];
      });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : t('error'));
    } finally {
      setUploading(false);
    }
  };

  const save = async (publish: boolean) => {
    if (!title.trim()) {
      setProblem(t('write.needTitle'));
      return;
    }
    setProblem(null);
    setSaving(publish ? 'publish' : 'draft');
    try {
      const firstImage = parts.find((p) => p.kind === 'image');
      let entry = await api.createEntry({
        type: 'article',
        title: title.trim(),
        document: draftToDocument(parts.filter((p) => p.kind === 'image' || p.text.trim())),
        ...(firstImage && firstImage.kind === 'image'
          ? { featuredMediaId: firstImage.mediaId }
          : {}),
      });
      if (publish) entry = await api.publishEntry(entry.id);
      setSaved({ entry, published: publish });
      toast(publish ? t('write.published') : t('write.saved'));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : t('error'));
    } finally {
      setSaving(null);
    }
  };

  if (saved) {
    return (
      <Screen title={t('write.title')}>
        <Empty icon="check" text={saved.published ? t('write.published') : t('write.saved')}>
          <div className="stack">
            <Button
              kind="secondary"
              icon="external"
              onClick={() => void openInBrowser(adminUrl(site, `/entries/${saved.entry.id}`))}
            >
              {t('write.openInAdmin')}
            </Button>
            <Button
              icon="write"
              onClick={() => {
                setSaved(null);
                setTitle('');
                setParts([textPart()]);
              }}
            >
              {t('write.new')}
            </Button>
          </div>
        </Empty>
      </Screen>
    );
  }

  const ready = title.trim() !== '' && !uploading && saving === null;
  return (
    <Screen title={t('write.title')}>
      <div className="compose">
        <input
          className="compose__title"
          placeholder={t('write.postTitle')}
          aria-label={t('write.postTitle')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={300}
        />
        {parts.map((part, index) =>
          part.kind === 'text' ? (
            <textarea
              key={part.key}
              className="compose__text"
              placeholder={index === 0 ? t('write.text') : t('write.textMore')}
              aria-label={t('write.text')}
              value={part.text}
              rows={index === 0 ? 8 : 3}
              onChange={(e) => update(part.key, { text: e.target.value })}
            />
          ) : (
            <figure key={part.key} className="compose__photo">
              <img src={part.url} alt="" />
              <button
                className="compose__remove"
                aria-label={t('write.removePhoto')}
                onClick={() => setParts((list) => list.filter((p) => p.key !== part.key))}
              >
                <Icon name="x" size={18} />
              </button>
              <input
                className="compose__alt"
                placeholder={t('write.alt')}
                aria-label={t('write.alt')}
                value={part.alt}
                onChange={(e) => update(part.key, { alt: e.target.value })}
              />
            </figure>
          ),
        )}
        <Button kind="secondary" icon="camera" busy={uploading} onClick={() => setPicker(true)}>
          {uploading ? t('write.uploading') : t('write.addPhoto')}
        </Button>
        <p className="hint">{t('write.help')}</p>
        {problem && <Notice tone="warning">{problem}</Notice>}
        {!mayPublish && <Notice>{t('write.noPublish')}</Notice>}
        <div className="compose__actions">
          <Button
            kind="secondary"
            disabled={!ready}
            busy={saving === 'draft'}
            onClick={() => void save(false)}
          >
            {t('write.saveDraft')}
          </Button>
          {mayPublish && (
            <Button
              disabled={!ready || !hasBody(parts)}
              busy={saving === 'publish'}
              onClick={() => void save(true)}
            >
              {t('write.publish')}
            </Button>
          )}
        </div>
      </div>
      <Sheet open={picker} title={t('write.addPhoto')} onClose={() => setPicker(false)}>
        <div className="stack">
          <Button icon="camera" onClick={() => void addPhoto('camera')}>
            {t('write.camera')}
          </Button>
          <Button kind="secondary" icon="image" onClick={() => void addPhoto('gallery')}>
            {t('write.gallery')}
          </Button>
        </div>
      </Sheet>
    </Screen>
  );
}
