import { PhotoPlaceholder } from './PhotoPlaceholder';
import { CARD_IMAGE, CARD_IMAGE_WIDE, responsiveImage } from '../lib/photos';

/**
 * The photo on a product card, wherever cards are shown — the featured grid, a
 * category page's strips, a sub-category grid, the related row on a product
 * page. All four used to repeat the same <img> with the same six attributes,
 * which is how they came to disagree about the important one.
 *
 * Shape: the card frame is a square on a laptop and 3:2 below 768px, so the
 * photo is requested at the shape it will actually be shown in rather than being
 * cropped to a square and then cropped again by `object-fit: cover`. The <source>
 * carries the phone crop and the <img> the desktop one; a browser old enough to
 * lack <picture> takes the square and behaves as it always did.
 *
 * Loading strategy: every card image on the site was `loading="lazy"`, including
 * the ones in the first row. Lazy is the right default for a long grid, but on
 * the row that is already on screen it is actively harmful — the browser will not
 * even discover the image until layout has run, so the largest thing on the page
 * starts downloading later than it needs to and the Largest Contentful Paint
 * moves out with it. So the first row loads eagerly and everything below it stays
 * lazy.
 *
 * `priority` additionally marks a card as the page's likely LCP element, which
 * puts it ahead of the rest of the queue. It is set only where the grid really is
 * the top of the page: on the landing page the featured grid sits below the
 * welcome copy and the category tiles, so its first card is usually not the
 * largest thing painted and claiming otherwise would only take bandwidth from
 * the fonts and the text that is on screen.
 */

/** How many cards are treated as "the first row" and load eagerly. */
export const EAGER_CARDS = 4;

export const CardImage = ({ url, alt = '', index = 0, priority = false }) => {
  if (!url) return <PhotoPlaceholder />;

  const eager = index < EAGER_CARDS;
  const wide = responsiveImage(url, CARD_IMAGE_WIDE);
  const square = responsiveImage(url, CARD_IMAGE);

  return (
    <picture>
      {wide.srcSet && (
        <source
          media={CARD_IMAGE_WIDE.media}
          srcSet={wide.srcSet}
          sizes={wide.sizes}
        />
      )}
      <img
        src={square.src}
        srcSet={square.srcSet}
        sizes={square.sizes}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={priority && index === 0 ? 'high' : undefined}
        decoding="async"
        // The intrinsic ratio, so the grid reserves the right box before the
        // photo lands. The CSS overrides both (`width: 100%; height: 100%`) and
        // the container's own aspect-ratio is what decides the shape on screen —
        // these numbers only ever describe a ratio, never a size.
        width="560"
        height="560"
      />
    </picture>
  );
};
