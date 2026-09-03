import { designedMarkFor } from '../lib/watermark';

// The seal on a print Clarky designed in-house, rather than one printed from
// someone else's model. Renders nothing at all for everything else, so it can be
// dropped into any card without a condition around it.
//
// Struck over the photo alongside the New and Popular watermarks, in the corner
// designedMarkFor keeps clear of whichever one of those is configured. It sits
// inside the positioned image container and never intercepts clicks, so the whole
// card stays one link.
//
// No icon: a mark beside the words only competed with them, and the compass nib
// that was here read as a letter A, so the line came out as "A Clarky designed".
// The type is the mark now.
export const DesignedMark = ({ product, settings, position }) => {
  const mark = designedMarkFor(product, settings);
  if (!mark) return null;

  return (
    <span className={`designed-seal ds-${position || mark.position}`}>
      <span className="designed-seal-ink">
        <span className="designed-seal-top">CLARKY</span>
        <span className="designed-seal-main">DESIGNED</span>
      </span>
    </span>
  );
};
