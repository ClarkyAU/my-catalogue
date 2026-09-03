import { useId } from 'react';

// The line of the customer's own words that some prints carry. A plain text
// input rather than a textarea: what goes on a keyring or a plaque is one line,
// and a box with room for a paragraph invites one that will not fit.
//
// Nothing here caps how much can be typed. What will fit on a given print is a
// conversation between the customer and the person making it, not a number this
// field can know. The question itself and whether it can be left blank come
// from the listing, so nothing here assumes what is being asked for either.
export const CustomTextField = ({ config, value, onChange }) => {
  const fieldId = useId();
  const missing = config.required && !value.trim();

  return (
    <div className="panel custom-text">
      <div className="panel-head">
        {/* The owner's own wording is the heading, the same way a single
            made-to-order question names its panel. */}
        <span className="panel-label">{config.label.toUpperCase()}</span>
        <span className="panel-value">{config.required ? 'Required' : 'Optional'}</span>
      </div>

      {/* The panel head is styled text, not a label, so the field needs its own
          — visually redundant, which is why it is only for screen readers. */}
      <label className="sr-only" htmlFor={fieldId}>
        {config.label}
      </label>
      <input
        id={fieldId}
        type="text"
        className="custom-text-input"
        value={value}
        placeholder="Type it exactly as you want it printed"
        onChange={(event) => onChange(event.target.value)}
      />

      <p className="custom-text-note">
        Printed exactly as typed — capitals, spacing and punctuation included.
      </p>

      {missing && (
        <p className="custom-text-warn" role="status">
          This print needs your text before it can go in the cart.
        </p>
      )}
    </div>
  );
};
