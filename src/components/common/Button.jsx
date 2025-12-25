const Button = ({ text, onClick, disabled = false }) => {
  return (
    <button onClick={onClick} className="auth-button" disabled={disabled}>
      {text}
    </button>
  );
};

export default Button;
