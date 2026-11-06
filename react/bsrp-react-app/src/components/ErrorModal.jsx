// Error pop-up (e.g. room unavailable)
function ErrorModal({ title = 'Uh-oh', message, onClose }) {
  return (
    <div className="modal-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="error-title">
      <div className="modal modal-error">
        <h2 id="error-title">{title}</h2>
        <p>{message}</p>
        <button type="button" className="btn btn-outline" onClick={onClose}>Okay</button>
      </div>
    </div>
  );
}

export default ErrorModal;