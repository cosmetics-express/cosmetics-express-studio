import type { Campaign, Asset, Clinic } from '@/lib/types';
export function Design({
  campaign: c,
  asset,
  clinic,
  format,
  publicSlug,
  compact = false,
}: {
  campaign: Campaign;
  asset: Asset | null | undefined;
  clinic: Clinic;
  format?: Campaign['format'];
  publicSlug?: string;
  compact?: boolean;
}) {
  const f = format || c.format;
  const suffix = publicSlug ? `?landing=${encodeURIComponent(publicSlug)}` : '';
  return (
    <div
      className={`design design-${f} ${compact ? 'design-compact' : ''}`}
      dir="rtl"
      style={{
        aspectRatio: f === 'story' ? '9/16' : f === 'square' ? '1/1' : '4/5',
        backgroundColor: c.overlay_color,
        color: c.text_color,
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        containerType: 'inline-size',
      }}
    >
      {asset ? (
        <img
          className="master-image"
          src={`/api/assets/${asset.id}${suffix}`}
          alt={asset.kind === 'demo' ? 'איור לדוגמה, ללא יצירת AI' : `עיצוב עבור ${c.service}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            inset: 0,
          }}
        />
      ) : (
        <div className="master-placeholder">
          <span>הקנבס שלך מחכה לרעיון הבא</span>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(to top, ${c.overlay_color}f5 0%, ${c.overlay_color}b0 30%, transparent 75%)`,
        }}
      />
      <div
        className="design-brand"
        style={{
          position: 'absolute',
          top: '6%',
          right: '7%',
          fontSize: '3cqw',
          letterSpacing: '.03em',
        }}
      >
        {clinic.logo_path ? (
          <img
            src={`/api/assets/logo${suffix}${suffix ? '&' : '?'}v=${encodeURIComponent(clinic.logo_path)}`}
            alt={clinic.name}
            style={{ maxWidth: '27cqw', maxHeight: '12cqw', objectFit: 'contain' }}
          />
        ) : (
          <span>✳ {clinic.name}</span>
        )}
      </div>
      {asset?.kind === 'demo' && (
        <span
          className="demo-art-label"
          style={{
            position: 'absolute',
            top: '6%',
            left: '5%',
            fontSize: '2cqw',
            color: '#ffffff',
            background: '#152d2670',
            padding: '1% 2%',
            borderRadius: 20,
          }}
        >
          איור הדגמה
        </span>
      )}
      <div
        className="design-copy"
        style={{
          position: 'absolute',
          right: '7%',
          left: '7%',
          textAlign: c.alignment,
          bottom: c.layout === 'bottom' ? `${7 + c.text_position}%` : undefined,
          top:
            c.layout === 'top'
              ? `${19 + c.text_position / 2}%`
              : c.layout === 'center'
                ? `${36 - c.text_position / 2}%`
                : undefined,
        }}
      >
        <p style={{ fontSize: '2.8cqw', letterSpacing: '.15em', margin: '0 0 3%', opacity: 0.8 }}>
          YOUR BEAUTY. YOUR MOMENT.
        </p>
        <h2
          style={{
            fontSize:
              c.headline.length > 80
                ? '5.8cqw'
                : c.headline.length > 50
                  ? '7cqw'
                  : f === 'story'
                    ? '10cqw'
                    : '9.5cqw',
            lineHeight: 1.15,
            fontWeight: 500,
            margin: '0 0 4%',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
          }}
        >
          {c.headline}
        </h2>
        <p
          style={{
            fontSize: c.subheadline.length > 100 ? '3.1cqw' : '3.7cqw',
            lineHeight: 1.6,
            margin: '0 0 4%',
            whiteSpace: 'pre-wrap',
          }}
        >
          {c.subheadline}
        </p>
        {c.price && (
          <strong
            style={{ fontSize: '6cqw', fontWeight: 500, display: 'block', marginBottom: '5%' }}
          >
            {c.price}
          </strong>
        )}
        <span
          style={{
            display: 'inline-block',
            fontSize: '3cqw',
            padding: '3% 6%',
            border: '1px solid currentColor',
            borderRadius: 100,
          }}
        >
          {c.cta} ↖
        </span>
        <p style={{ fontSize: '3cqw', margin: '5% 0 0', direction: 'ltr' }}>{c.phone}</p>
      </div>
    </div>
  );
}
