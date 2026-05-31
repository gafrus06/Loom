import "./ConsentCheckbox.css";

export default function ConsentCheckbox({
    checked,
    onChange,
    required = false,
    error = "",
    children,
    className = "",
}) {
    return (
        <label className={`consent-checkbox ${className}`.trim()}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                required={required}
            />
            <span className="consent-checkbox__content">
                <span>{children}</span>
                {error ? <span className="consent-checkbox__error">{error}</span> : null}
            </span>
        </label>
    );
}
