// Centred single-message panel used for boot, access-denied and loading states.
export function Splash({ text, children, inline }) {
  return (
    <div className={inline ? 'a-splash-inline' : 'a-splash'}>
      {text ? <p className="a-lead">{text}</p> : children}
    </div>
  );
}
