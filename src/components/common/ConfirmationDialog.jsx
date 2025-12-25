import "../../styles/ConfirmationDialog.css";

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="confirmation-overlay" onClick={onClose}>
      <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirmation-title">{title || "Confirm Action"}</h3>
        <p className="confirmation-message">{message || "Are you sure you want to proceed?"}</p>
        <div className="confirmation-actions">
          <button className="confirmation-btn cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="confirmation-btn confirm-btn" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;

