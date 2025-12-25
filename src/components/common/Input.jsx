const Input = ({
  label,
  type,
  placeholder,
  value,
  onChange,
  icon,
  rightIcon,
  onRightIconClick
}) => {
  return (
    <div className="input-container">
      <label className="input-label">{label}</label>

      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}

        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="input-field"
        />

        {rightIcon && (
          <span
            onClick={onRightIconClick}
            className="input-right-icon"
          >
            {rightIcon}
          </span>
        )}
      </div>
    </div>
  );
};

export default Input;
