import { useId } from 'react';

// The made-to-order questions a print asks that are not about colour — which
// inlay, which lid, whether a logo goes on. Deliberately a native <select>
// rather than a copy of the colour combobox next to it: that control exists
// because a colour needs a swatch beside its name, while these answers are
// plain words. Native gives full keyboard operation, correct screen-reader
// announcement and the platform picker on a phone, for free.
export const OptionPicker = ({ options, value, onChange }) => {
  const groupId = useId();
  const pick = (index, choice) =>
    onChange(value.map((slot, i) => (i === index ? { ...slot, choice } : slot)));

  return (
    <div className="option-picker">
      <div className="option-picker-head">
        {/* With one question its name is the heading, so a single-choice print
            does not read like a form. With several, every row is labelled. */}
        <span className="option-picker-label">
          {options.length > 1 ? 'MADE TO ORDER' : options[0].name.toUpperCase()}
        </span>
      </div>
      <ul className="option-list">
        {options.map((option, index) => {
          const selectId = `${groupId}-${index}`;
          return (
            <li className="option-row" key={option.name}>
              <label
                className={`option-name ${options.length > 1 ? '' : 'sr-only'}`}
                htmlFor={selectId}
              >
                {option.name}
              </label>
              <select
                id={selectId}
                className="option-select"
                value={value[index]?.choice ?? option.choices[0]}
                onChange={(event) => pick(index, event.target.value)}
              >
                {option.choices.map((choice) => (
                  <option key={choice} value={choice}>
                    {choice}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
