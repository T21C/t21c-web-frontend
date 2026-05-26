import PropTypes from 'prop-types';

/**
 * Shared alias chips editor (creator + player admin management).
 */
const AliasListEditor = ({
  aliases,
  newAlias,
  onNewAliasChange,
  onAdd,
  onRemove,
  disabled = false,
  label,
  placeholder,
  addLabel,
}) => (
  <div className="form-group">
    {label ? <label>{label}</label> : null}
    <div className="alias-input-group">
      <input
        type="text"
        autoComplete="off"
        value={newAlias}
        onChange={(e) => onNewAliasChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onAdd();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
      />
      <button type="button" onClick={onAdd} disabled={disabled || !newAlias.trim()}>
        {addLabel}
      </button>
    </div>
    {aliases.length > 0 ? (
      <div className="aliases-list">
        {aliases.map((alias, i) => (
          <div key={`${alias}-${i}`} className="alias-tag">
            {alias}
            <button type="button" onClick={() => onRemove(alias)} disabled={disabled}>
              &times;
            </button>
          </div>
        ))}
      </div>
    ) : null}
  </div>
);

AliasListEditor.propTypes = {
  aliases: PropTypes.arrayOf(PropTypes.string).isRequired,
  newAlias: PropTypes.string.isRequired,
  onNewAliasChange: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  addLabel: PropTypes.string,
};

export default AliasListEditor;
