// Compact breadcrumb bar shown under a page title so shoppers can jump back up
// the hierarchy (Home › Category › Sub-category › Product) without relying on
// the browser back button. `trail` is the path below Home; the last entry is
// the current page and is rendered as plain text rather than a link.
export const Breadcrumb = ({ trail = [] }) => {
  const items = [{ label: 'HOME', hash: '' }, ...trail];

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span className="breadcrumb-item" key={`${item.hash}-${i}`}>
            {isLast ? (
              <span className="breadcrumb-current" aria-current="page">{item.label}</span>
            ) : (
              <a className="breadcrumb-link" href={`#${item.hash}`}>{item.label}</a>
            )}
            {!isLast && <span className="breadcrumb-sep" aria-hidden="true">/</span>}
          </span>
        );
      })}
    </nav>
  );
};
