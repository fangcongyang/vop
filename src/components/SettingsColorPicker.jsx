import { useState, useEffect } from "react";
import styles from "./SettingsComponent.module.scss";

const SettingsColorPicker = ({
    title = "",
    titleStyle = {},
    description = "",
    initValue = "#335eea",
    fieldKey = "",
    callback = undefined,
}) => {
    const [colorValue, setColorValue] = useState(initValue);

    const handleColorChange = (e) => {
        const newColor = e.target.value;
        setColorValue(newColor);
        if (callback) callback(newColor);
    };

    return (
        <div className={styles.settingsItem}>
            <div className="left">
                <div className="title" style={titleStyle ? titleStyle : {}}>
                    {title}
                </div>
                {description ? <div className="description">{description}</div> : ""}
            </div>
            <div className="right">
                <div className={styles.colorPickerContainer}>
                    <input
                        type="color"
                        value={colorValue}
                        onChange={handleColorChange}
                        className={styles.colorPicker}
                    />
                    <span className={styles.colorValue}>{colorValue}</span>
                </div>
            </div>
        </div>
    );
};

export default SettingsColorPicker;