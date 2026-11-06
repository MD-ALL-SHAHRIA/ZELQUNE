import { FeatureStage } from '../components/FeatureStage';
import { copy, screens } from '../video.config';

type Id = (typeof copy.services.items)[number]['id'];

/** One service beat: the real Interior design, Construction or Bulk & corporate page. */
export function Service({ id }: { id: Id }) {
  const it = copy.services.items.find((s) => s.id === id)!;
  return (
    <FeatureStage
      eyebrow={`${it.index} · ${it.name}`}
      caption={it.caption}
      desktop={screens[`${id}Desktop`]}
      mobile={screens[`${id}Mobile`]}
      tone={id === 'construction' ? 'warm' : 'paper'}
    />
  );
}
